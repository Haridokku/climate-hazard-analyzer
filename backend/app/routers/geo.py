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

REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
PLACE_KEYS = ("city", "town", "village", "municipality", "suburb", "city_district", "county", "state_district")

_reverse_cache: dict[tuple[float, float], dict] = {}
MAX_CACHE = 1000


@router.get("/reverse-geocode")
@limiter.limit("30/minute")
async def reverse_geocode(
    request: Request,
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    key = (round(lat, 2), round(lon, 2))   # ~1 km, plenty for a city-level label
    if key in _reverse_cache:
        return _reverse_cache[key]

    try:
        async with httpx.AsyncClient(
            timeout=8,
            headers={"User-Agent": "climate-hazard-analyzer/1.0 (case study project)"},  # required by Nominatim's policy
        ) as client:
            resp = await client.get(
                REVERSE_URL,
                params={
                    "lat": key[0], "lon": key[1], "format": "jsonv2",
                    "zoom": 10, "addressdetails": 1, "accept-language": "en",
                },
            )
            resp.raise_for_status()
    except httpx.HTTPError:
        return {"label": None}   # best effort: the frontend falls back to coordinates

    addr = resp.json().get("address", {})
    name = next((addr[k] for k in PLACE_KEYS if addr.get(k)), None)
    parts = [p for p in (name, addr.get("state"), addr.get("country")) if p]
    result = {"label": ", ".join(parts) or None}   # None for oceans or unnamed areas

    if len(_reverse_cache) >= MAX_CACHE:
        _reverse_cache.clear()
    _reverse_cache[key] = result
    return result