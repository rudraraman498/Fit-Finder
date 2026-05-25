import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "embedding_service"))

import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import close_pool, init_pool
from logging_config import _request_id_var, setup_logging
from routers.embed_router import router as embed_router
from routers.health_router import router as health_router
from routers.search_router import router as search_router
from search import warm_up

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    log.info("FitFinder API starting up ...")
    init_pool()
    warm_up()
    yield
    log.info("FitFinder API shutting down ...")
    close_pool()


app = FastAPI(
    title="FitFinder API",
    description="AI-powered e-commerce semantic search",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    req_id = str(uuid.uuid4())[:8]
    request.state.request_id = req_id
    token = _request_id_var.set(req_id)
    try:
        response = await call_next(request)
    finally:
        _request_id_var.reset(token)
    response.headers["X-Request-ID"] = req_id
    return response


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=422,
        content={"error": "validation_error", "detail": str(exc)},
    )


@app.exception_handler(RuntimeError)
async def runtime_error_handler(request: Request, exc: RuntimeError):
    log.error("Service error: %s", exc)
    return JSONResponse(
        status_code=503,
        content={
            "error": "service_unavailable",
            "detail": "A dependent service is temporarily unavailable.",
        },
    )


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    log.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"error": "internal_error", "detail": "An unexpected error occurred."},
    )


app.include_router(health_router)
app.include_router(search_router)
app.include_router(embed_router)
