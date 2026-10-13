import asyncio
from datetime import datetime, timezone
import numpy as np

from app.db import db
from app.services.weather_store import get_daily_series
from app.services.heatwave import (
    BASELINE_START, BASELINE_END, PERCENTILE, WINDOW_DAYS, MIN_DURATION,
    build_dataframe, calendar_thresholds, detect_events, yearly_summary,
)
from app.services.trends import analyze_yearly

ALGO_VERSION = 2          # bump when the logic changes, so old stored results are not reused
results = db["hazard_results"]


def compute_heatwave(docs, start_year, end_year):
    """CPU-bound work (pandas/numpy). Runs in a worker thread."""
    df = build_dataframe(docs)
    thr = calendar_thresholds(df)
    analysis = df[(df["year"] >= start_year) & (df["year"] <= end_year)]
    events = detect_events(analysis, thr)
    yearly = yearly_summary(events, start_year, end_year)

    total = len(analysis)
    missing = int(analysis["tmax"].isna().sum())
    return {
        "events": events,
        "yearly": yearly,
        "trends": analyze_yearly(yearly),
        "thresholds": [None if np.isnan(t) else round(float(t), 1) for t in thr],
        "quality": {
            "days": total,
            "missing_days": missing,
            "completeness_pct": round(100 * (total - missing) / total, 2) if total else 0,
        },
    }


async def get_heatwave_analysis(lat, lon, start_year, end_year):
    key = f"heatwave_v{ALGO_VERSION}_{lat}_{lon}_{start_year}_{end_year}"

    stored = await results.find_one({"_id": key})
    if stored:
        stored["cached"] = True
        return stored

    # always load the full baseline too, even when the analysis range is shorter
    docs = await get_daily_series(
        lat, lon, min(start_year, BASELINE_START), max(end_year, BASELINE_END)
    )
    computed = await asyncio.to_thread(compute_heatwave, docs, start_year, end_year)

    doc = {
        "_id": key,
        "hazard": "heatwave",
        "region": {"lat": lat, "lon": lon},
        "start_year": start_year,
        "end_year": end_year,
        "baseline": {
            "start": BASELINE_START, "end": BASELINE_END,
            "percentile": PERCENTILE, "window_days": WINDOW_DAYS, "min_duration": MIN_DURATION,
        },
        "computed_at": datetime.now(timezone.utc),
        **computed,
    }
    await results.replace_one({"_id": key}, doc, upsert=True)
    doc["cached"] = False
    return doc