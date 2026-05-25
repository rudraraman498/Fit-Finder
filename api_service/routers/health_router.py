from fastapi import APIRouter

from models.health import HealthResponse
from services.health_service import check_health

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def health():
    return check_health()
