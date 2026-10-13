import numpy as np
import pandas as pd

BASELINE_START = 1990
BASELINE_END = 2020
PERCENTILE = 95
WINDOW_DAYS = 7      # ±7 days around each calendar day
MIN_DURATION = 3     # consecutive days

def build_dataframe(docs):
    """Flatten cached yearly docs into one daily DataFrame with cleaning."""
    dates, vals = [], []
    for d in docs:
        dates.extend(d["dates"])
        vals.extend(d["tmax"])

    df = pd.DataFrame({
        "date": pd.to_datetime(dates),
        "tmax": pd.Series(vals, dtype="float"),     # None -> NaN
    })
    df = df.sort_values("date").drop_duplicates("date").reset_index(drop=True)

    # outlier guard: physically impossible values become missing
    df.loc[(df["tmax"] < -90) | (df["tmax"] > 60), "tmax"] = np.nan

    # day index 0..364; Feb 29 is folded into Feb 28 so leap years line up
    doy = df["date"].dt.dayofyear.to_numpy()
    leap = df["date"].dt.is_leap_year.to_numpy()
    df["doy"] = np.where(leap & (doy >=60), doy - 1, doy) - 1
    df["year"] = df["date"].dt.year
    return df

def calendar_thresholds(df, start=BASELINE_START, end=BASELINE_END):
    """95th percentile per calendar day, from a +-WINDOW_DAYS pool over the baseline."""
    base = df[(df["year"] >= start) & (df["year"] <= end)]
    by_doy = [base.loc[base["doy"] == d, "tmax"].dropna().to_numpy() for d in range(365)]

    thr = np.full(365, np.nan)
    for d in range(365):
        pool = np.concatenate(
            [by_doy[(d + k) % 365] for k in range(-WINDOW_DAYS, WINDOW_DAYS + 1)]
        )
        if pool.size >= 30:                     # need enough samples to trust it
            thr[d] = np.percentile(pool, PERCENTILE)
    return thr


def detect_events(df, thr):
    """Find runs of >= MIN_DURATION consecutive days above threshold."""
    d = df.copy()
    d["thr"] = thr[d["doy"].to_numpy()]
    d["hot"] = d["tmax"] > d["thr"]             # NaN compares as False, so gaps break a run
    d["excess"] = d["tmax"] - d["thr"]

    run_id = (d["hot"] != d["hot"].shift()).cumsum()
    hot = d[d["hot"]]

    events = []
    for _, g in hot.groupby(run_id[d["hot"]]):
        if len(g) >= MIN_DURATION:
            events.append({
                "year": int(g["date"].iloc[0].year),          # attributed to start year
                "start": g["date"].iloc[0].strftime("%Y-%m-%d"),
                "end": g["date"].iloc[-1].strftime("%Y-%m-%d"),
                "duration": int(len(g)),
                "peak_temp": round(float(g["tmax"].max()), 1),
                "mean_excess": round(float(g["excess"].mean()), 2),
            })
    return events


def yearly_summary(events, start_year, end_year):
    """One row per year, including years with zero events."""
    rows = []
    for y in range(start_year, end_year + 1):
        ev = [e for e in events if e["year"] == y]
        rows.append({
            "year": y,
            "events": len(ev),
            "heatwave_days": sum(e["duration"] for e in ev),
            "max_duration": max((e["duration"] for e in ev), default=0),
            "mean_intensity": round(sum(e["mean_excess"] for e in ev) / len(ev), 2) if ev else None,
        })
    return rows