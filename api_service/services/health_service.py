import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "embedding_service"))

import logging

import httpx
from config import settings
from database import get_pool
from models.health import HealthResponse

log = logging.getLogger(__name__)
APP_VERSION = "1.0.0"


def check_health() -> HealthResponse:
    db_status = "connected"
    ollama_status = "reachable"
    overall = "ok"

    try:
        with get_pool().connection() as conn:
            conn.execute("SELECT 1")
    except Exception as exc:
        log.warning("Health: DB unreachable — %s", exc)
        db_status = "unreachable"
        overall = "degraded"

    try:
        with httpx.Client() as client:
            client.get(
                f"{settings.ollama_base_url}/api/version", timeout=5.0
            ).raise_for_status()
    except Exception as exc:
        log.warning("Health: Ollama unreachable — %s", exc)
        ollama_status = "unreachable"
        overall = "degraded"

    return HealthResponse(
        status=overall,
        database=db_status,
        ollama=ollama_status,
        version=APP_VERSION,
    )
