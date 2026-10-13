import csv
import io
from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response

from app.rate_limit import limiter
from app.schemas import Region, region_params
from app.services.analysis import get_heatwave_analysis

router = APIRouter(prefix="/api/hazards/heatwave", tags=["heatwave"])


@router.get("/summary")
@limiter.limit("20/minute")   # an uncached request can trigger an upstream API call, so keep it tight
async def summary(request: Request, region: Region = Depends(region_params)):
    doc = await get_heatwave_analysis(region.lat, region.lon, region.start_year, region.end_year)
    return {k: v for k, v in doc.items() if k not in ("_id", "events", "thresholds")}


@router.get("/events")
@limiter.limit("30/minute")
async def events(request: Request, region: Region = Depends(region_params)):
    doc = await get_heatwave_analysis(region.lat, region.lon, region.start_year, region.end_year)
    return {"region": doc["region"], "events": doc["events"]}


@router.get("/export.csv")
@limiter.limit("10/minute")
async def export_csv(request: Request, region: Region = Depends(region_params)):
    doc = await get_heatwave_analysis(region.lat, region.lon, region.start_year, region.end_year)
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=["year", "events", "heatwave_days", "max_duration", "mean_intensity"])
    writer.writeheader()
    writer.writerows(doc["yearly"])
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="heatwaves_{region.lat}_{region.lon}.csv"'},
    )




# from fastapi import APIRouter
# from app.services.weather_store import get_daily_series
# from app.services.heatwave import (
#     BASELINE_START, BASELINE_END,
#     build_dataframe, calendar_thresholds, detect_events, yearly_summary,
# )
# from app.services.trends import analyze_yearly

# router = APIRouter(prefix="/api")


# @router.get("/debug/series")
# async def debug_series(lat: float, lon: float, start_year: int = 2015, end_year: int = 2020):
#     docs = await get_daily_series(lat, lon, start_year, end_year)
#     return [
#         {"year": d["year"], "days": len(d["dates"]),
#          "missing": sum(v is None for v in d["tmax"])}
#         for d in docs
#     ]

# @router.get("/debug/heatwaves")
# async def debug_heatwaves(lat: float, lon: float, start_year: int = 1990, end_year: int = 2020):
#     # always load the full baseline too, even if the analysis range is shorter
#     first = min(start_year, BASELINE_START)
#     last = max(end_year, BASELINE_END)
#     docs = await get_daily_series(lat, lon, first, last)

#     df = build_dataframe(docs)
#     thr = calendar_thresholds(df)
#     analysis = df[(df["year"] >= start_year) & (df["year"] <= end_year)]
#     events = detect_events(analysis, thr)
#     yearly = yearly_summary(events, start_year, end_year)

#     return {
#         "threshold_jan1": round(float(thr[0]), 1),
#         "threshold_may15": round(float(thr[134]), 1),
#         "total_events": len(events),
#         "yearly": yearly_summary(events, start_year, end_year),
#         "trends": analyze_yearly(yearly),
#         # "first_events": events[:5],
#     }