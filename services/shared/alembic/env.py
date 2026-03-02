"""Alembic environment configuration for Meal Planner."""

from logging.config import fileConfig

from alembic import context
from shared.config import get_settings
from shared.db.models import Base  # noqa: F401 - registers all models with metadata
from sqlalchemy import create_engine, pool

# Alembic Config object
config = context.config

# Set up logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Model metadata for autogenerate
target_metadata = Base.metadata


def get_url() -> str:
    """Get database URL from settings.

    Uses shared config which handles DATABASE_URL, Aspire connection strings,
    and ADO.NET format conversion automatically.
    """
    url = get_settings().database.effective_url

    if not url:
        raise ValueError(
            "Database connection string not found. Set one of: "
            "DATABASE_URL, ConnectionStrings__mealplanner, or ConnectionStrings__sql"
        )

    # Convert async driver to sync for Alembic
    if "mssql+aioodbc://" in url:
        url = url.replace("mssql+aioodbc://", "mssql+pyodbc://")

    return url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    Configures the context with just a URL and not an Engine,
    so a DBAPI doesn't need to be available.
    """
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    Creates an Engine and associates a connection with the context.
    """
    connectable = create_engine(
        get_url(),
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
