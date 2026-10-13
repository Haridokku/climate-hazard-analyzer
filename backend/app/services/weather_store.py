from datetime import datetime, timezone
from app.db import db
from app.services.openmeteo import fetch_daily_tmax

col = db["daily_tmax"]


def snap(x: float) -> float:
    """Snap to a 0.25 degree grid so nearby requests share one cache entry."""
    return round(round(x * 4) / 4, 2)


async def get_daily_series(lat: float, lon: float, start_year: int, end_year: int):
    lat, lon = snap(lat), snap(lon)
    query = {"lat": lat, "lon": lon, "year": {"$gte": start_year, "$lte": end_year}}

    cached_years = {d["year"] async for d in col.find(query, {"year": 1})}
    missing = [y for y in range(start_year, end_year + 1) if y not in cached_years]

    if missing:
        dates, vals = await fetch_daily_tmax(
            lat, lon, f"{min(missing)}-01-01", f"{max(missing)}-12-31"
        )
        by_year: dict[int, dict] = {}
        for d, v in zip(dates, vals):
            y = int(d[:4])
            if y in missing:
                bucket = by_year.setdefault(y, {"dates": [], "tmax": []})
                bucket["dates"].append(d)
                bucket["tmax"].append(v)

        now = datetime.now(timezone.utc)
        for y, b in by_year.items():
            doc_id = f"{lat}_{lon}_{y}"
            await col.replace_one(
                {"_id": doc_id},
                {"_id": doc_id, "lat": lat, "lon": lon, "year": y,
                 "dates": b["dates"], "tmax": b["tmax"], "fetched_at": now},
                upsert=True,
            )

    return await col.find(query).sort("year", 1).to_list(length=None)