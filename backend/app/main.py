import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.db import client, db
from app.rate_limit import limiter
from app.routers.hazards import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db["daily_tmax"].create_index([("lat", 1), ("lon", 1), ("year", 1)])
    yield


app = FastAPI(title="Climate Hazard Trend Analyzer", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/api/health")
async def health():
    await client.admin.command("ping")
    return {"status": "ok", "db": "connected"}