"""Async test fixtures: in-memory SQLite, test client, mock auth."""

from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from shared.db.models.base import Base
from shared.db.models.household import Household, HouseholdMember
from shared.db.models.ingredient import Ingredient
from sqlalchemy import event
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.compiler import compiles

# ---------------------------------------------------------------------------
# SQLite compatibility: render UNIQUEIDENTIFIER as VARCHAR(36)
# ---------------------------------------------------------------------------


@compiles(UNIQUEIDENTIFIER, "sqlite")
def _compile_uniqueidentifier_sqlite(type_, compiler, **kw):
    return "VARCHAR(36)"


# ---------------------------------------------------------------------------
# Database engine & session (in-memory SQLite, per-test isolation)
# ---------------------------------------------------------------------------


@pytest.fixture()
async def engine():
    """Create an async SQLite engine and provision all tables."""
    eng = create_async_engine("sqlite+aiosqlite://", echo=False)

    # SQLite FK enforcement + MSSQL function shims
    @event.listens_for(eng.sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, _connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
        # Shim MSSQL sysutcdatetime() so TimestampMixin server defaults work
        dbapi_conn.create_function("sysutcdatetime", 0, lambda: datetime.now(UTC).isoformat())

    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield eng

    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest.fixture()
async def session(engine) -> AsyncGenerator[AsyncSession, None]:
    """Scoped async session that rolls back after each test."""
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as sess:
        yield sess
        await sess.rollback()


# ---------------------------------------------------------------------------
# Seed data fixtures
# ---------------------------------------------------------------------------

TEST_HOUSEHOLD_ID = uuid4()
TEST_USER_SUB = "auth0|test-user-001"


@pytest.fixture()
async def household(session: AsyncSession) -> Household:
    """Seed a test household with one owner member."""
    now = datetime.now(UTC)
    hh = Household(
        id=TEST_HOUSEHOLD_ID,
        name="Test Household",
        default_servings=2,
        created_at=now,
        updated_at=now,
    )
    session.add(hh)
    await session.flush()

    member = HouseholdMember(
        id=uuid4(),
        household_id=hh.id,
        auth0_user_id=TEST_USER_SUB,
        display_name="Test User",
        role="owner",
        created_at=now,
        updated_at=now,
    )
    session.add(member)
    await session.flush()
    return hh


@pytest.fixture()
async def sample_ingredient(session: AsyncSession) -> Ingredient:
    """Seed a single ingredient for tests that need one."""
    now = datetime.now(UTC)
    ing = Ingredient(
        id=uuid4(),
        name="Chicken Breast",
        category="meat",
        default_unit="g",
        default_storage="fridge",
        typical_shelf_life_days=3,
        created_at=now,
        updated_at=now,
    )
    session.add(ing)
    await session.flush()
    return ing


# ---------------------------------------------------------------------------
# Mock auth & FastAPI test client
# ---------------------------------------------------------------------------


@pytest.fixture()
def mock_user() -> dict:
    """Decoded JWT claims for the test user."""
    return {"sub": TEST_USER_SUB, "name": "Test User", "email": "test@example.com"}


@pytest.fixture()
async def client(engine, household, mock_user) -> AsyncGenerator[AsyncClient, None]:
    """HTTPX async client wired to the app with mocked auth and DB session."""
    from api.main import create_app
    from api.middleware.auth import get_current_household_id, get_current_user
    from shared.db.connection import get_session

    app = create_app()

    # Build a session factory bound to the test engine
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def _override_session() -> AsyncGenerator[AsyncSession, None]:
        async with factory() as sess:
            try:
                yield sess
                await sess.commit()
            except Exception:
                await sess.rollback()
                raise

    async def _override_user() -> dict:
        return mock_user

    async def _override_household_id() -> UUID:
        return TEST_HOUSEHOLD_ID

    app.dependency_overrides[get_session] = _override_session
    app.dependency_overrides[get_current_user] = _override_user
    app.dependency_overrides[get_current_household_id] = _override_household_id

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
