from datetime import date
from fastapi import HTTPException, Query
from pydantic import BaseModel
from app.services.weather_store import snap

LAST_COMPLETE_YEAR = date.today().year - 1   # the current year is incomplete, so never analyze it
MIN_START_YEAR = 1990                        # start of our fixed baseline
MIN_SPAN_YEARS = 10                          # fewer years gives meaningless trends


class Region(BaseModel):
    lat: float
    lon: float
    start_year: int
    end_year: int


def region_params(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    start_year: int = Query(MIN_START_YEAR, ge=MIN_START_YEAR),
    end_year: int = Query(LAST_COMPLETE_YEAR, le=LAST_COMPLETE_YEAR),
) -> Region:
    if end_year - start_year + 1 < MIN_SPAN_YEARS:
        raise HTTPException(422, f"Time range must cover at least {MIN_SPAN_YEARS} years")
    return Region(lat=snap(lat), lon=snap(lon), start_year=start_year, end_year=end_year)