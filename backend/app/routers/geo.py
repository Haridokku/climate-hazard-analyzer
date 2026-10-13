import httpx
from fastapi import APIRouter, HTTPException, Query, Request

from app.rate_limit import limiter

router = APIRouter(prefix="/api", tags=["geo"])

GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"


@router.get("/geocode")
@limiter.limit("30/minute")
async def geocode(request: Request, q: str = Query(..., min_length=2, max_length=80)):
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                GEOCODE_URL,
                params={"name": q.strip(), "count": 5, "language": "en", "format": "json"},
            )
            resp.raise_for_status()
    except httpx.HTTPError:
        raise HTTPException(502, "Geocoding service is unavailable, please try again")

    return [
        {
            "name": r["name"],
            "admin1": r.get("admin1"),      # state or region
            "country": r.get("country"),
            "lat": r["latitude"],
            "lon": r["longitude"],
        }
        for r in resp.json().get("results", [])
    ]