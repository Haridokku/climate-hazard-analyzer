import numpy as np
import pandas as pd
import pymannkendall as mk
from scipy import stats

MIN_YEARS = 8
ALPHA = 0.05


def rolling_mean(values, window=5):
    """Trailing rolling average; None until a full window is available."""
    s = pd.Series(values, dtype="float").rolling(window, min_periods=window).mean().round(2)
    return [None if pd.isna(v) else float(v) for v in s]


def analyze_metric(years, values):
    """Trend statistics for one yearly metric."""
    if len(years) < MIN_YEARS:
        return {"error": f"Need at least {MIN_YEARS} years for a trend"}

    x = np.array(years, dtype=float)
    y = np.array(values, dtype=float)

    ols = stats.linregress(x, y)
    sen = stats.theilslopes(y, x)          # (slope, intercept, low, high)
    mkr = mk.original_test(y)              # handles tied values

    return {
        "ols_slope_per_decade": round(float(ols.slope) * 10, 3),
        "ols_p_value": round(float(ols.pvalue), 4),
        "sen_slope_per_decade": round(float(sen[0]) * 10, 3),
        "sen_ci_per_decade": [round(float(sen[2]) * 10, 3), round(float(sen[3]) * 10, 3)],
        "mk_trend": mkr.trend,             # 'increasing' | 'decreasing' | 'no trend'
        "mk_p_value": round(float(mkr.p), 4),
        "significant": bool(mkr.p < ALPHA),
    }


def build_insight(label, years, values, result, additive=True):
    """Plain-language, honest summary of one metric's trend.
    additive=True means values can be summed across years (counts, days)."""
    if "error" in result:
        return f"Not enough data to assess a trend in {label}."

    k = max(3, min(10, len(values) // 3))
    first, last = float(np.mean(values[:k])), float(np.mean(values[-k:]))
    span = f"{years[0]}–{years[-1]}"
    p = result["mk_p_value"]

    if result["significant"]:
        direction = "increased" if result["mk_trend"] == "increasing" else "decreased"
        text = (
            f"{label.capitalize()} {direction} by about {abs(result['sen_slope_per_decade']):.2f} "
            f"per decade over {span} (Mann-Kendall p = {p}, statistically significant). "
            f"The average over the first {k} years was {first:.1f}, versus {last:.1f} over the last {k}."
        )
        # percent change is misleading from a tiny base, so only report it when the base is meaningful
        if first >= 2:
            text += f" That is a {((last - first) / first) * 100:+.0f}% change."

        # flag weaker evidence when the other tests do not back up Mann-Kendall
        caveats = []
        if result["ols_p_value"] >= ALPHA:
            caveats.append(
                f"the linear-regression test does not reach significance (p = {result['ols_p_value']})"
            )
        if result["sen_ci_per_decade"][0] <= 0:
            caveats.append("the confidence interval for the slope includes zero")
        if caveats:
            text += " The evidence is moderate, not strong: " + " and ".join(caveats) + "."
    else:
        text = (
            f"No statistically significant trend in {label} over {span} (Mann-Kendall p = {p}). "
            f"The first {k} years averaged {first:.1f} and the last {k} averaged {last:.1f}, "
            f"a difference the test cannot distinguish from normal year-to-year variability."
        )

    ols, sen = result["ols_slope_per_decade"], result["sen_slope_per_decade"]
    if ols * sen < 0:
        text += " Note: the regression and robust (Theil-Sen) slopes point in opposite directions, so a few extreme years may be driving the result."
    elif sen == 0 and ols != 0:
        text += " Note: the typical (median) year-to-year change is zero, so any average rise comes from a few unusually active years."

    # flag a single dominant year
    total = sum(values)
    if additive and total > 0 and max(values) / total > 0.15:
        peak_year = years[int(np.argmax(values))]
        text += f" {peak_year} alone accounts for {max(values) / total * 100:.0f}% of the total."
    return text


def analyze_yearly(yearly):
    """Run trends on the yearly summary rows from heatwave.yearly_summary()."""
    years = [r["year"] for r in yearly]
    out = {}
    for key, label, additive in [
        ("events", "heatwave events per year", True),
        ("heatwave_days", "heatwave days per year", True),
        ("max_duration", "longest heatwave duration", False),
    ]:
        values = [r[key] for r in yearly]
        stats_ = analyze_metric(years, values)
        out[key] = {
            "stats": stats_,
            "rolling_5yr": rolling_mean(values, 5),
            "insight": build_insight(label, years, values, stats_, additive),
        }
    return out