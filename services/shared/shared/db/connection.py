"""Database connection factory with retry logic.

Handles async database connections for SQL Server (local and Azure SQL)
with ADO.NET connection string support and connection pooling.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any
from urllib.parse import quote_plus

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from tenacity import retry, stop_after_attempt, wait_exponential

# Default connection settings
DEFAULT_POOL_SIZE = 5
DEFAULT_MAX_OVERFLOW = 10
DEFAULT_POOL_TIMEOUT = 30
DEFAULT_POOL_RECYCLE = 1800  # 30 minutes


def convert_ado_connection_string(ado_string: str) -> str:
    """Convert ADO.NET connection string to async SQLAlchemy URL.

    Converts strings like:
        Server=localhost,1433;Database=mealplanner;User Id=sa;Password=xxx;TrustServerCertificate=True
        Server=tcp:sql-server.database.windows.net,1433;Initial Catalog=db;...
    To:
        mssql+aioodbc://sa:xxx@localhost:1433/mealplanner?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes
    """
    parts: dict[str, str] = {}
    for part in ado_string.split(";"):
        if "=" in part:
            key, value = part.split("=", 1)
            parts[key.strip().lower()] = value.strip()

    server = parts.get("server", parts.get("data source", "localhost"))
    database = parts.get("database", parts.get("initial catalog", "mealplanner"))
    user = parts.get("user id", parts.get("uid", "sa"))
    password = parts.get("password", parts.get("pwd", ""))

    if server.lower().startswith("tcp:"):
        server = server[4:]
    if "," in server:
        host, port = server.split(",", 1)
    elif ":" in server:
        host, port = server.split(":", 1)
    else:
        host, port = server, "1433"

    encoded_password = quote_plus(password)
    return (
        f"mssql+aioodbc://{user}:{encoded_password}@{host}:{port}/{database}"
        f"?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes"
    )


def _ensure_async_url(url: str) -> str:
    """Ensure a database URL uses the async aioodbc driver."""
    if url.startswith("mssql+pyodbc://"):
        return url.replace("mssql+pyodbc://", "mssql+aioodbc://", 1)
    if url.startswith("Server=") or (";" in url and "=" in url and "://" not in url):
        return convert_ado_connection_string(url)
    return url


class DatabaseConnection:
    """Database connection manager with async engine, session factory, and retry logic."""

    def __init__(
        self,
        url: str | None = None,
        pool_size: int = DEFAULT_POOL_SIZE,
        max_overflow: int = DEFAULT_MAX_OVERFLOW,
        echo: bool = False,
    ):
        self._url = url
        self._pool_size = pool_size
        self._max_overflow = max_overflow
        self._echo = echo
        self._engine: AsyncEngine | None = None
        self._session_factory: async_sessionmaker[AsyncSession] | None = None

    def _resolve_url(self) -> str:
        """Resolve the database URL, falling back to config settings."""
        if self._url:
            return _ensure_async_url(self._url)
        from shared.config import get_settings

        effective = get_settings().database.effective_url
        if not effective:
            raise ValueError(
                "Database URL not configured. Set DATABASE_URL or "
                "ConnectionStrings__mealplanner environment variable."
            )
        return _ensure_async_url(effective)

    @property
    def engine(self) -> AsyncEngine:
        """Get or create the async database engine."""
        if self._engine is None:
            self._engine = create_async_engine(
                self._resolve_url(),
                pool_size=self._pool_size,
                max_overflow=self._max_overflow,
                pool_timeout=DEFAULT_POOL_TIMEOUT,
                pool_recycle=DEFAULT_POOL_RECYCLE,
                echo=self._echo,
            )
        return self._engine

    @property
    def session_factory(self) -> async_sessionmaker[AsyncSession]:
        """Get or create the session factory."""
        if self._session_factory is None:
            self._session_factory = async_sessionmaker(
                self.engine,
                class_=AsyncSession,
                expire_on_commit=False,
                autocommit=False,
                autoflush=False,
            )
        return self._session_factory

    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        """Create a new session context with auto commit/rollback.

        Usage:
            async with db.session() as session:
                result = await session.execute(query)
        """
        async with self.session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        reraise=True,
    )
    async def connect(self) -> None:
        """Test database connection with retry logic (3 attempts, exponential backoff)."""
        async with self.engine.connect() as conn:
            await conn.execute(text("SELECT 1"))

    async def close(self) -> None:
        """Dispose the engine and release all connections."""
        if self._engine is not None:
            await self._engine.dispose()
            self._engine = None
            self._session_factory = None


# Global database connection instance
_db: DatabaseConnection | None = None


def get_db(url: str | None = None, **kwargs: Any) -> DatabaseConnection:
    """Get or create the global database connection instance."""
    global _db
    if _db is None:
        _db = DatabaseConnection(url=url, **kwargs)
    return _db


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for getting a database session.

    Usage:
        @app.get("/items")
        async def get_items(session: AsyncSession = Depends(get_session)):
            ...
    """
    db = get_db()
    async with db.session() as session:
        yield session
