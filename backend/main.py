"""
Spectra AI Backend — Main Entry Point (Production-Grade)

Wires together:
- CORS + Security middleware
- Rate limiting (global)
- Prometheus metrics
- Correlation ID tracking
- Global error handler
- API v1 router registration
- Database + table initialization on startup
"""
import os
import time
import logging
import tempfile
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from .routers import chat, document, youtube, auth
from .routers.admin import router as admin_router
from .config import settings
from .database import init_db
from .utils.limiter import setup_limiter
from .utils.middleware import CorrelationIdMiddleware
from .models.schemas import ErrorResponse

# ─── Logging ────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("spectra-backend")

# ─── Safe Temp Dir ───────────────────────────────────────────────
_SAFE_TMP = os.path.join(tempfile.gettempdir(), "spectra_ai")
os.makedirs(_SAFE_TMP, exist_ok=True)

# ─── App Initialization ─────────────────────────────────────────
app = FastAPI(
    title="Spectra AI — Premium Intelligence API",
    description="Production-ready backend with JWT auth, RAG, streaming, and full observability.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# ─── Global Error Handler ───────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    logger.error(f"Unhandled error [{correlation_id}]: {exc}", exc_info=True)
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error=exc.detail,
                code=f"HTTP_{exc.status_code}",
                correlation_id=correlation_id
            ).dict()
        )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error="An internal server error occurred.",
            code="INTERNAL_SERVER_ERROR",
            correlation_id=correlation_id
        ).dict()
    )

# ─── Middleware ─────────────────────────────────────────────────
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Rate Limiting ───────────────────────────────────────────────
setup_limiter(app)

# ─── Prometheus Metrics ─────────────────────────────────────────
Instrumentator().instrument(app).expose(app, endpoint="/api/v1/metrics")

# ─── Request Logging Middleware ─────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start_time) * 1000
    cid = getattr(request.state, "correlation_id", "-")
    logger.info(
        f"[{cid}] {request.method} {request.url.path} "
        f"→ {response.status_code} ({duration_ms:.1f}ms)"
    )
    return response

# ─── Startup ─────────────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    init_db()
    # Also create new service tables
    from sqlmodel import SQLModel
    from .database import engine
    from .services.cost_service import UsageRecord
    from .services.dlq_service import DLQRecord
    from .services.audit_service import AuditLog
    SQLModel.metadata.create_all(engine)
    logger.info("All database tables initialized.")

# ─── OpenTelemetry Tracing ──────────────────────────────────────
from .services.observability_service import setup_tracing
setup_tracing(app)

# ─── Router Registration ─────────────────────────────────────────
api_v1 = "/api/v1"
app.include_router(auth.router,     prefix=api_v1)

app.include_router(chat.router,     prefix=api_v1)
app.include_router(document.router, prefix=f"{api_v1}/document", tags=["Document"])
app.include_router(youtube.router,  prefix=f"{api_v1}/youtube",  tags=["YouTube"])
app.include_router(admin_router,    prefix=api_v1)

# ─── Health Check ────────────────────────────────────────────────
@app.get("/api/health", tags=["System"])
@app.get(f"{api_v1}/health", tags=["System"])
async def health_check():
    from .database import engine
    from sqlalchemy import text

    db_status = "healthy"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        db_status = "unhealthy"

    redis_status = "healthy"
    queue_depth = 0
    try:
        from .utils.queue_utils import redis_conn, queue
        redis_conn.ping()
        queue_depth = len(queue)
    except Exception:
        redis_status = "unavailable"

    overall = "healthy" if db_status == "healthy" else "degraded"
    return {
        "status": overall,
        "database": db_status,
        "redis": redis_status,
        "queue_depth": queue_depth,
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0",
        "tmp_dir": _SAFE_TMP
    }

# ─── Root ────────────────────────────────────────────────────────
@app.get("/", tags=["System"])
async def root():
    return {
        "name": "Spectra AI API",
        "version": "1.0.0",
        "docs": "/api/docs",
        "health": "/api/health"
    }
