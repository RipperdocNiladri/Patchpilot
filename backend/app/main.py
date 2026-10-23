import logging
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import get_settings
from app.routers import analysis, contributions, repositories
from app.schemas import HealthResponse

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("patchpilot")

settings = get_settings()

app = FastAPI(
    title="PatchPilot Backend API",
    description="AI-powered open-source onboarding mentor for beginner developers.",
    version="1.0.0",
)

# CORS configuration restricted to configured frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(repositories.router)
app.include_router(analysis.router)
app.include_router(contributions.router)


@app.get("/api/health", response_model=HealthResponse, tags=["health"])
async def health_check() -> HealthResponse:
    """Service health check endpoint."""
    return HealthResponse(status="ok", service="patchpilot-backend")


@app.get("/", tags=["root"])
async def root():
    return {
        "service": "PatchPilot Backend API",
        "status": "online",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    """Ensure predictable, clean JSON error responses."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler to avoid leaking tracebacks to client."""
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."},
    )
