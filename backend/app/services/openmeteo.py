import asyncio
import httpx

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"


async def fetch_daily_tmax(lat: float, lon: float, start_date: str, end_date: str, retries: int = 3):
    """Fetch daily max temperature (°C). Returns (dates, values). Values may contain None."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "daily": "temperature_2m_max",
        "temperature_unit": "celsius",
        "timezone": "auto",
    }
    delay = 1
    async with httpx.AsyncClient(timeout=30) as client:
        for attempt in range(retries):
            try:
                resp = await client.get(ARCHIVE_URL, params=params)
                if resp.status_code == 429 or resp.status_code >= 500:
                    raise httpx.HTTPError(f"retryable status {resp.status_code}")
                resp.raise_for_status()
                daily = resp.json()["daily"]
                return daily["time"], daily["temperature_2m_max"]
            except httpx.HTTPError:
                if attempt == retries - 1:
                    raise
                await asyncio.sleep(delay)
                delay *= 2  # exponential backoff: 1s, 2s, ...