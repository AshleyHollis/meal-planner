"""FastAPI application factory."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from shared.config import get_settings
from shared.logging import configure_logging, get_logger

from .errors import register_error_handlers
from .routes.equipment import router as equipment_router
from .routes.favorites import router as favorites_router
from .routes.grocery import router as grocery_router
from .routes.health import router as health_router
from .routes.ingredients import router as ingredients_router
from .routes.inventory import router as inventory_router
from .routes.meal_history import router as meal_history_router
from .routes.meal_plans import recipes_router
from .routes.meal_plans import router as meal_plans_router
from .routes.preferences import router as preferences_router
from .routes.ratings import router as ratings_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler: init logging and optional DB connection."""
    settings = get_settings()
    configure_logging(
        service_name="meal-planner-api",
        json_format=not settings.is_development,
    )
    log = get_logger(__name__)
    log.info("starting", environment=settings.environment)

    # Attempt DB connection if configured (non-fatal in dev)
    if settings.database.effective_url:
        try:
            from shared.db.connection import get_db

            db = get_db()
            await db.connect()
            log.info("database_connected")
        except Exception:
            log.warning("database_connection_failed", exc_info=True)
            if settings.is_production:
                raise
    else:
        log.info("database_not_configured")

    yield

    # Shutdown: close DB if it was opened
    try:
        from shared.db.connection import get_db

        db = get_db()
        await db.close()
    except Exception:
        pass


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Meal Planner API",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_origin_regex=r"https://.*\.(azurestaticapps\.net|meal-planner\.apps\.ashleyhollis\.com)",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Error handlers
    register_error_handlers(app)

    # Register routers
    app.include_router(health_router)
    app.include_router(inventory_router)
    app.include_router(equipment_router)
    app.include_router(ingredients_router)
    app.include_router(meal_plans_router)
    app.include_router(recipes_router)
    app.include_router(grocery_router)
    app.include_router(meal_history_router)
    app.include_router(favorites_router)
    app.include_router(preferences_router)
    app.include_router(ratings_router)

    return app


app = create_app()
