"""Health check endpoints."""

from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/live")
async def liveness() -> dict[str, str]:
    """Liveness probe - confirms the process is running."""
    return {"status": "ok"}


@router.get("/ready")
async def readiness() -> dict[str, str]:
    """Readiness probe - confirms the app can serve traffic."""
    return {"status": "ok"}
