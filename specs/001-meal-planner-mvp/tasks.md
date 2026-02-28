---
spec: 001-meal-planner-mvp
phase: tasks
created: 2026-02-28
generated: auto
---

# Tasks: Meal Planner MVP

## Phase 1: Make It Work (POC)

Focus: Scaffold the full stack, prove the core loop works end-to-end (inventory -> AI plan -> grocery list -> customization). Skip tests, accept hardcoded values, prioritize validation.

### Phase 1A: Project Scaffolding

- [x] 1.1 Scaffold shared Python package structure
  - **Do**:
    1. Create `services/shared/` directory with `shared/__init__.py`, `pyproject.toml`
    2. Copy `pyproject.toml` pattern from yt-summarizer shared (hatchling build, ruff config, 100-char line-length, pytest config)
    3. Add dependencies: sqlalchemy, pydantic, pydantic-settings, azure-storage-queue, structlog, alembic, pyodbc, aioodbc, greenlet, tenacity, opentelemetry-*
  - **Files**: `services/shared/pyproject.toml`, `services/shared/shared/__init__.py`
  - **Done when**: `cd services/shared && uv sync` succeeds
  - **Verify**: `cd services/shared && uv sync 2>&1 | tail -1`
  - **Commit**: `feat(shared): scaffold shared Python package`
  - _Requirements: NFR-04, NFR-08_
  - _Design: Project Structure_

- [x] 1.2 Create shared config module
  - **Do**:
    1. Create `services/shared/shared/config.py` with Pydantic Settings class
    2. Include fields: DATABASE_URL, AZURE_STORAGE_CONNECTION_STRING, LLM_API_KEY, LLM_PROVIDER, AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, ENVIRONMENT
    3. Add ADO.NET connection string converter (from yt-summarizer pattern)
  - **Files**: `services/shared/shared/config.py`
  - **Done when**: Config class importable with default values
  - **Verify**: `cd services/shared && uv run python -c "from shared.config import get_settings; print('OK')"`
  - **Commit**: `feat(shared): add Pydantic Settings config module`
  - _Design: Proven Patterns - DB connection_

- [x] 1.3 Create shared logging module
  - **Do**:
    1. Create `services/shared/shared/logging/` with `__init__.py` and `config.py`
    2. Implement structlog configuration with `configure_logging(service_name)` and `get_logger(__name__)`
    3. Follow yt-summarizer structlog pattern
  - **Files**: `services/shared/shared/logging/__init__.py`, `services/shared/shared/logging/config.py`
  - **Done when**: `get_logger` returns configured structlog logger
  - **Verify**: `cd services/shared && uv run python -c "from shared.logging.config import configure_logging, get_logger; configure_logging('test'); log = get_logger('test'); log.info('ok'); print('OK')"`
  - **Commit**: `feat(shared): add structlog logging configuration`
  - _Requirements: NFR-04_
  - _Design: Observability_

- [x] 1.4 Create DB connection module
  - **Do**:
    1. Create `services/shared/shared/db/__init__.py` and `services/shared/shared/db/connection.py`
    2. Implement `DatabaseConnection` class with async SQLAlchemy engine, session factory, retry logic
    3. Include `convert_ado_connection_string` for Aspire compatibility
    4. Add `get_session` async generator for FastAPI `Depends()`
  - **Files**: `services/shared/shared/db/__init__.py`, `services/shared/shared/db/connection.py`
  - **Done when**: `DatabaseConnection` class importable
  - **Verify**: `cd services/shared && uv run python -c "from shared.db.connection import DatabaseConnection; print('OK')"`
  - **Commit**: `feat(shared): add async SQLAlchemy DB connection with Aspire support`
  - _Design: DB connection pattern_

- [x] 1.5 Create SQLAlchemy Base and TimestampMixin
  - **Do**:
    1. Create `services/shared/shared/db/models/` with `__init__.py` and `base.py`
    2. Implement `Base(DeclarativeBase)` with `type_annotation_map = {UUID: UNIQUEIDENTIFIER}`
    3. Implement `TimestampMixin` with `created_at`, `updated_at` using `func.sysutcdatetime()`
    4. Implement `generate_uuid()` function
  - **Files**: `services/shared/shared/db/models/__init__.py`, `services/shared/shared/db/models/base.py`
  - **Done when**: Base and TimestampMixin importable
  - **Verify**: `cd services/shared && uv run python -c "from shared.db.models.base import Base, TimestampMixin, generate_uuid; print('OK')"`
  - **Commit**: `feat(shared): add SQLAlchemy Base with UNIQUEIDENTIFIER and TimestampMixin`
  - _Design: Database Schema - base.py_

- [x] 1.6 Create Household and HouseholdMember models
  - **Do**:
    1. Create `services/shared/shared/db/models/household.py` with Household and HouseholdMember classes
    2. Household: id, name, default_servings (default=2), relationships to members
    3. HouseholdMember: id, household_id (FK), auth0_user_id (unique), display_name, role (default="owner")
    4. Add indexes per design
  - **Files**: `services/shared/shared/db/models/household.py`
  - **Done when**: Both models importable with correct columns and relationships
  - **Verify**: `cd services/shared && uv run python -c "from shared.db.models.household import Household, HouseholdMember; print(Household.__tablename__, HouseholdMember.__tablename__)"`
  - **Commit**: `feat(shared): add Household and HouseholdMember SQLAlchemy models`
  - _Requirements: FR-18, NFR-13_
  - _Design: Database Schema - household.py_

- [x] 1.7 Create Ingredient model
  - **Do**:
    1. Create `services/shared/shared/db/models/ingredient.py` with Ingredient class
    2. Fields: id, name (unique), category, default_unit, default_storage, typical_shelf_life_days (nullable)
    3. Add indexes on name and category
  - **Files**: `services/shared/shared/db/models/ingredient.py`
  - **Done when**: Model importable with correct columns
  - **Verify**: `cd services/shared && uv run python -c "from shared.db.models.ingredient import Ingredient; print(Ingredient.__tablename__)"`
  - **Commit**: `feat(shared): add Ingredient SQLAlchemy model`
  - _Requirements: FR-01_
  - _Design: Database Schema - ingredient.py_

- [x] 1.8 Create InventoryItem model
  - **Do**:
    1. Create `services/shared/shared/db/models/inventory.py` with InventoryItem class
    2. Fields: id, household_id (FK), ingredient_id (FK), quantity, unit, location, expiry_date (nullable)
    3. Add CheckConstraint for quantity >= 0, indexes per design
    4. Add relationship to Ingredient with selectin loading
  - **Files**: `services/shared/shared/db/models/inventory.py`
  - **Done when**: Model importable with FK relationships
  - **Verify**: `cd services/shared && uv run python -c "from shared.db.models.inventory import InventoryItem; print(InventoryItem.__tablename__)"`
  - **Commit**: `feat(shared): add InventoryItem SQLAlchemy model`
  - _Requirements: FR-01, AC-1.1_
  - _Design: Database Schema - inventory.py_

- [x] 1.9 Create Equipment and EquipmentMode models
  - **Do**:
    1. Create `services/shared/shared/db/models/equipment.py` with Equipment and EquipmentMode classes
    2. Equipment: id, household_id (FK), name, is_active (default=True)
    3. EquipmentMode: id, equipment_id (FK), name, category, min_temp (nullable), max_temp (nullable)
    4. Add relationships and indexes per design
  - **Files**: `services/shared/shared/db/models/equipment.py`
  - **Done when**: Both models importable
  - **Verify**: `cd services/shared && uv run python -c "from shared.db.models.equipment import Equipment, EquipmentMode; print(Equipment.__tablename__, EquipmentMode.__tablename__)"`
  - **Commit**: `feat(shared): add Equipment and EquipmentMode SQLAlchemy models`
  - _Requirements: FR-03, FR-04, AC-1.3_
  - _Design: Database Schema - equipment.py_

- [x] 1.10 Create Recipe, RecipeIngredient, RecipeStep models
  - **Do**:
    1. Create `services/shared/shared/db/models/recipe.py` with all three classes
    2. Recipe: id, household_id (nullable FK), title, description, servings (default=2), prep_time_min, cook_time_min, is_ai_generated, source_recipe_id (self-ref FK)
    3. RecipeIngredient: id, recipe_id (FK), ingredient_id (FK), quantity, unit, is_optional
    4. RecipeStep: id, recipe_id (FK), step_order, instruction, equipment_mode_id (nullable FK), temperature, duration_min
    5. Add relationships with selectin loading and cascade
  - **Files**: `services/shared/shared/db/models/recipe.py`
  - **Done when**: All three models importable with relationships
  - **Verify**: `cd services/shared && uv run python -c "from shared.db.models.recipe import Recipe, RecipeIngredient, RecipeStep; print('OK')"`
  - **Commit**: `feat(shared): add Recipe, RecipeIngredient, RecipeStep models`
  - _Requirements: FR-05, FR-06, FR-07, AC-2.6_
  - _Design: Database Schema - recipe.py_

- [x] 1.11 Create MealPlan and MealSlot models
  - **Do**:
    1. Create `services/shared/shared/db/models/meal_plan.py` with both classes
    2. MealPlan: id, household_id (FK), week_start_date, status (default="draft"), error_message (nullable)
    3. MealSlot: id, meal_plan_id (FK), recipe_id (nullable FK), day, meal_type, status (default="planned"), cooked_at (nullable)
    4. UniqueConstraint on (meal_plan_id, day, meal_type)
    5. Add relationships and indexes
  - **Files**: `services/shared/shared/db/models/meal_plan.py`
  - **Done when**: Both models importable with unique constraint
  - **Verify**: `cd services/shared && uv run python -c "from shared.db.models.meal_plan import MealPlan, MealSlot; print('OK')"`
  - **Commit**: `feat(shared): add MealPlan and MealSlot models`
  - _Requirements: FR-05, FR-20, AC-2.8_
  - _Design: Database Schema - meal_plan.py_

- [x] 1.12 Create GroceryList and GroceryItem models
  - **Do**:
    1. Create `services/shared/shared/db/models/grocery.py` with both classes
    2. GroceryList: id, meal_plan_id (FK, unique)
    3. GroceryItem: id, grocery_list_id (FK), ingredient_id (FK), quantity_needed, unit, is_checked (default=False), preferred_store (nullable)
    4. Add relationships with selectin loading and cascade
  - **Files**: `services/shared/shared/db/models/grocery.py`
  - **Done when**: Both models importable
  - **Verify**: `cd services/shared && uv run python -c "from shared.db.models.grocery import GroceryList, GroceryItem; print('OK')"`
  - **Commit**: `feat(shared): add GroceryList and GroceryItem models`
  - _Requirements: FR-09, FR-10, FR-11, AC-3.1_
  - _Design: Database Schema - grocery.py_

- [ ] 1.13 Create models __init__.py with all exports
  - **Do**:
    1. Update `services/shared/shared/db/models/__init__.py` to import and re-export all 13 model classes
    2. Define `__all__` list matching design
  - **Files**: `services/shared/shared/db/models/__init__.py`
  - **Done when**: All 13 models importable from `shared.db.models`
  - **Verify**: `cd services/shared && uv run python -c "from shared.db.models import Base, Household, HouseholdMember, Ingredient, InventoryItem, Equipment, EquipmentMode, Recipe, RecipeIngredient, RecipeStep, MealPlan, MealSlot, GroceryList, GroceryItem; print('13 models OK')"`
  - **Commit**: `feat(shared): export all SQLAlchemy models from models package`
  - _Design: models/__init__.py_

- [ ] V1 [VERIFY] Quality checkpoint: shared package
  - **Do**: Run ruff linter and verify all imports resolve
  - **Verify**: `cd services/shared && uv run ruff check shared/ && uv run ruff format --check shared/ && echo "QUALITY_OK"`
  - **Done when**: Zero lint errors, zero format errors
  - **Commit**: `chore(shared): pass quality checkpoint` (if fixes needed)

### Phase 1B: Database Migrations and Seed Data

- [ ] 1.14 Initialize Alembic configuration
  - **Do**:
    1. Create `services/shared/alembic.ini` pointing to `alembic/` directory
    2. Create `services/shared/alembic/env.py` with async SQLAlchemy engine, import all models from `shared.db.models`
    3. Create `services/shared/alembic/versions/` directory
    4. Follow yt-summarizer alembic pattern
  - **Files**: `services/shared/alembic.ini`, `services/shared/alembic/env.py`, `services/shared/alembic/script.py.mako`
  - **Done when**: Alembic config loadable
  - **Verify**: `cd services/shared && uv run python -c "from alembic.config import Config; c = Config('alembic.ini'); print('OK')"`
  - **Commit**: `feat(shared): initialize Alembic migration configuration`
  - _Design: Project Structure_

- [ ] 1.15 Create initial schema migration
  - **Do**:
    1. Create `services/shared/alembic/versions/001_initial_schema.py` with all 13 tables
    2. Use `op.create_table()` for each table with all columns, constraints, indexes
    3. Include downgrade with `op.drop_table()` in reverse dependency order
  - **Files**: `services/shared/alembic/versions/001_initial_schema.py`
  - **Done when**: Migration file parses without error
  - **Verify**: `cd services/shared && uv run python -c "import importlib.util; spec = importlib.util.spec_from_file_location('m', 'alembic/versions/001_initial_schema.py'); mod = importlib.util.module_from_spec(spec); print('PARSE_OK')"`
  - **Commit**: `feat(shared): add initial schema migration for 13 tables`
  - _Requirements: All data model requirements_
  - _Design: Database Schema_

- [ ] 1.16 Create Ninja Combi seed data module
  - **Do**:
    1. Create `services/shared/seed/ninja_combi_modes.py` with `NINJA_COMBI_MODES` list
    2. Include all 14 modes with name, category, min_temp, max_temp per design
  - **Files**: `services/shared/seed/ninja_combi_modes.py`
  - **Done when**: List has exactly 14 entries
  - **Verify**: `cd services/shared && uv run python -c "from seed.ninja_combi_modes import NINJA_COMBI_MODES; assert len(NINJA_COMBI_MODES) == 14, f'got {len(NINJA_COMBI_MODES)}'; print('14 modes OK')"`
  - **Commit**: `feat(shared): add Ninja Combi 14 equipment modes seed data`
  - _Requirements: FR-04, AC-1.7_
  - _Design: Seed Data - Ninja Combi_

- [ ] 1.17 Create common ingredients seed data module
  - **Do**:
    1. Create `services/shared/seed/common_ingredients.py` with `SEED_INGREDIENTS` list
    2. Include ~100 common Australian grocery items across categories: meat, seafood, produce, dairy, pantry, spices, condiments, grains
    3. Each entry: name, category, default_unit (g/ml/units), default_storage (fridge/pantry), typical_shelf_life_days (nullable)
  - **Files**: `services/shared/seed/common_ingredients.py`
  - **Done when**: List has >= 80 entries with all required fields
  - **Verify**: `cd services/shared && uv run python -c "from seed.common_ingredients import SEED_INGREDIENTS; assert len(SEED_INGREDIENTS) >= 80; assert all(set(i.keys()) >= {'name','category','default_unit','default_storage'} for i in SEED_INGREDIENTS); print(f'{len(SEED_INGREDIENTS)} ingredients OK')"`
  - **Commit**: `feat(shared): add common ingredient seed data (~100 items)`
  - _Requirements: AC-1.7_
  - _Design: Seed Data - Ingredients_

- [ ] 1.18 Add seed data to migration
  - **Do**:
    1. Create `services/shared/alembic/versions/002_seed_data.py` data migration
    2. Insert seed ingredients into Ingredients table using `op.bulk_insert()`
    3. Seed data runs automatically with `alembic upgrade head`
  - **Files**: `services/shared/alembic/versions/002_seed_data.py`
  - **Done when**: Migration file parses; seed data referenced
  - **Verify**: `cd services/shared && uv run python -c "import importlib.util; spec = importlib.util.spec_from_file_location('m', 'alembic/versions/002_seed_data.py'); mod = importlib.util.module_from_spec(spec); print('SEED_MIGRATION_OK')"`
  - **Commit**: `feat(shared): add seed data migration for ingredients`
  - _Design: Seed Data_

- [ ] 1.19 Create Azure Queue client wrapper
  - **Do**:
    1. Create `services/shared/shared/queue/` with `__init__.py` and `client.py`
    2. Implement `get_queue_client()` returning Azure Queue Storage client
    3. Support Azurite connection string for local dev
    4. Implement `enqueue_message()` and `receive_messages()` wrappers
  - **Files**: `services/shared/shared/queue/__init__.py`, `services/shared/shared/queue/client.py`
  - **Done when**: Queue client importable
  - **Verify**: `cd services/shared && uv run python -c "from shared.queue.client import get_queue_client; print('OK')"`
  - **Commit**: `feat(shared): add Azure Queue Storage client wrapper`
  - _Design: Worker Design_

- [ ] V2 [VERIFY] Quality checkpoint: shared package complete
  - **Do**: Lint and format check entire shared package
  - **Verify**: `cd services/shared && uv run ruff check shared/ seed/ && uv run ruff format --check shared/ seed/ && echo "QUALITY_OK"`
  - **Done when**: Zero lint and format errors
  - **Commit**: `chore(shared): pass quality checkpoint` (if fixes needed)

### Phase 1C: FastAPI API Scaffolding

- [ ] 1.20 Scaffold FastAPI API project
  - **Do**:
    1. Create `services/api/` with `pyproject.toml`, `src/__init__.py`, `src/api/__init__.py`
    2. pyproject.toml: dependencies on fastapi, uvicorn, pydantic, python-jose, httpx + dev deps (pytest, httpx, ruff)
    3. Add path dependency on `../shared` package
    4. Follow yt-summarizer api pyproject.toml pattern (hatchling build, ruff config)
  - **Files**: `services/api/pyproject.toml`, `services/api/src/__init__.py`, `services/api/src/api/__init__.py`
  - **Done when**: `uv sync` succeeds in api directory
  - **Verify**: `cd services/api && uv sync 2>&1 | tail -1`
  - **Commit**: `feat(api): scaffold FastAPI API project`
  - _Design: Project Structure_

- [ ] 1.21 Create FastAPI app factory with health endpoints
  - **Do**:
    1. Create `services/api/src/api/main.py` with `create_app()` factory
    2. Add lifespan handler for DB init with retry logic
    3. Add CORS middleware (allow localhost:3000 + SWA domain)
    4. Create `services/api/src/api/routes/health.py` with `/health/live` and `/health/ready` endpoints
    5. Register health router
  - **Files**: `services/api/src/api/main.py`, `services/api/src/api/routes/__init__.py`, `services/api/src/api/routes/health.py`
  - **Done when**: App starts and health endpoint responds
  - **Verify**: `cd services/api && uv run python -c "from src.api.main import create_app; app = create_app(); print('APP_OK')"`
  - **Commit**: `feat(api): add FastAPI app factory with health endpoints`
  - _Requirements: NFR-03_
  - _Design: API Design - Health Checks_

- [ ] 1.22 Create correlation ID middleware
  - **Do**:
    1. Create `services/api/src/api/middleware/__init__.py` and `services/api/src/api/middleware/correlation.py`
    2. Generate X-Correlation-ID on each request, bind to structlog context
    3. Return correlation ID in response headers
  - **Files**: `services/api/src/api/middleware/__init__.py`, `services/api/src/api/middleware/correlation.py`
  - **Done when**: Middleware importable and registered
  - **Verify**: `cd services/api && uv run python -c "from src.api.middleware.correlation import CorrelationIdMiddleware; print('OK')"`
  - **Commit**: `feat(api): add correlation ID middleware`
  - _Requirements: NFR-04_
  - _Design: Error Handling_

- [ ] 1.23 Create auth middleware (JWT validation + household resolution)
  - **Do**:
    1. Create `services/api/src/api/middleware/auth.py`
    2. Implement `get_current_user()` dependency: extract Bearer token, validate against Auth0 JWKS
    3. Implement `get_current_household_id()` dependency: resolve auth0_user_id to household, auto-provision on first login
    4. Use python-jose for JWT validation
  - **Files**: `services/api/src/api/middleware/auth.py`
  - **Done when**: Both dependencies importable
  - **Verify**: `cd services/api && uv run python -c "from src.api.middleware.auth import get_current_user, get_current_household_id; print('OK')"`
  - **Commit**: `feat(api): add JWT auth middleware with household auto-provisioning`
  - _Requirements: FR-18, AC-1.8, NFR-13_
  - _Design: Auth Middleware_

- [ ] V3 [VERIFY] Quality checkpoint: API scaffold
  - **Do**: Lint API source code
  - **Verify**: `cd services/api && uv run ruff check src/ && uv run ruff format --check src/ && echo "QUALITY_OK"`
  - **Done when**: Zero lint errors
  - **Commit**: `chore(api): pass quality checkpoint` (if fixes needed)

### Phase 1D: Inventory API (P1 - First Vertical Slice)

- [ ] 1.24 Create inventory Pydantic models
  - **Do**:
    1. Create `services/api/src/api/models/__init__.py` and `services/api/src/api/models/inventory.py`
    2. Define CreateInventoryItem, UpdateInventoryItem, InventoryItemResponse per design
    3. InventoryItemResponse includes computed `expiry_status` field (safe/expiring/expired)
    4. Include IngredientResponse model for nested ingredient data
  - **Files**: `services/api/src/api/models/__init__.py`, `services/api/src/api/models/inventory.py`
  - **Done when**: Models importable and serializable
  - **Verify**: `cd services/api && uv run python -c "from src.api.models.inventory import CreateInventoryItem, InventoryItemResponse; print('OK')"`
  - **Commit**: `feat(api): add inventory Pydantic request/response models`
  - _Requirements: FR-01, FR-02, AC-1.1_
  - _Design: API Design - Pydantic Models_

- [ ] 1.25 Create ingredient Pydantic models and route
  - **Do**:
    1. Create `services/api/src/api/models/ingredient.py` with IngredientResponse model
    2. Create `services/api/src/api/services/__init__.py` and `services/api/src/api/services/ingredient_service.py` with search/autocomplete logic
    3. Create `services/api/src/api/routes/ingredients.py` with GET /api/v1/ingredients endpoint (query: q, limit)
  - **Files**: `services/api/src/api/models/ingredient.py`, `services/api/src/api/services/ingredient_service.py`, `services/api/src/api/routes/ingredients.py`
  - **Done when**: Ingredient search route registered
  - **Verify**: `cd services/api && uv run python -c "from src.api.routes.ingredients import router; print(f'{len(router.routes)} routes')"`
  - **Commit**: `feat(api): add ingredient search/autocomplete endpoint`
  - _Requirements: AC-1.1_
  - _Design: API Design - Endpoints 18_

- [ ] 1.26 Create inventory service layer
  - **Do**:
    1. Create `services/api/src/api/services/inventory_service.py`
    2. Implement: list_items (filter by household, optional location), add_item, update_item, remove_item
    3. All queries scoped by household_id
    4. Sort expiring-soon items to top in list_items
  - **Files**: `services/api/src/api/services/inventory_service.py`
  - **Done when**: Service class importable with all CRUD methods
  - **Verify**: `cd services/api && uv run python -c "from src.api.services.inventory_service import InventoryService; print('OK')"`
  - **Commit**: `feat(api): add inventory service layer with CRUD operations`
  - _Requirements: FR-01, AC-1.1, AC-1.4, AC-1.5, AC-1.6_
  - _Design: API Design_

- [ ] 1.27 Create inventory API routes
  - **Do**:
    1. Create `services/api/src/api/routes/inventory.py`
    2. GET /api/v1/inventory - list items (query: location?)
    3. POST /api/v1/inventory - add item (201)
    4. PATCH /api/v1/inventory/{id} - update qty/expiry
    5. DELETE /api/v1/inventory/{id} - remove item (204)
  - **Files**: `services/api/src/api/routes/inventory.py`
  - **Done when**: 4 routes registered, all using auth dependency
  - **Verify**: `cd services/api && uv run python -c "from src.api.routes.inventory import router; print(f'{len(router.routes)} inventory routes')"`
  - **Commit**: `feat(api): add inventory CRUD API endpoints`
  - _Requirements: FR-01, AC-1.1, AC-1.4, AC-1.5, AC-1.6, AC-1.8_
  - _Design: API Design - Endpoints 1-4_

- [ ] 1.28 Create equipment Pydantic models, service, and routes
  - **Do**:
    1. Create `services/api/src/api/models/equipment.py` with CreateEquipment, EquipmentResponse, EquipmentModeResponse
    2. Create `services/api/src/api/services/equipment_service.py` with list_equipment, register_equipment
    3. Create `services/api/src/api/routes/equipment.py` with GET and POST /api/v1/equipment
  - **Files**: `services/api/src/api/models/equipment.py`, `services/api/src/api/services/equipment_service.py`, `services/api/src/api/routes/equipment.py`
  - **Done when**: Equipment routes registered
  - **Verify**: `cd services/api && uv run python -c "from src.api.routes.equipment import router; print(f'{len(router.routes)} equipment routes')"`
  - **Commit**: `feat(api): add equipment list/register endpoints`
  - _Requirements: FR-03, AC-1.3_
  - _Design: API Design - Endpoints 5-6_

- [ ] 1.29 Register all routers in app factory
  - **Do**:
    1. Update `services/api/src/api/main.py` to include inventory, equipment, ingredients, health routers
    2. Set up proper route prefixes (/api/v1/*)
  - **Files**: `services/api/src/api/main.py`
  - **Done when**: All routes accessible via create_app()
  - **Verify**: `cd services/api && uv run python -c "from src.api.main import create_app; app = create_app(); routes = [r.path for r in app.routes if hasattr(r, 'path')]; print(f'{len(routes)} total routes'); assert any('/inventory' in r for r in routes)"`
  - **Commit**: `feat(api): register inventory, equipment, ingredient routers`
  - _Design: API Design_

- [ ] V4 [VERIFY] Quality checkpoint: inventory API
  - **Do**: Lint entire API codebase
  - **Verify**: `cd services/api && uv run ruff check src/ && uv run ruff format --check src/ && echo "QUALITY_OK"`
  - **Done when**: Zero lint errors
  - **Commit**: `chore(api): pass quality checkpoint` (if fixes needed)

### Phase 1E: Aspire Local Dev Setup

- [ ] 1.30 Create .NET Aspire AppHost project
  - **Do**:
    1. Create `services/aspire/AppHost/AppHost.csproj` with Aspire hosting packages (match yt-summarizer versions)
    2. Create `services/aspire/AppHost/AppHost.cs` per design: SQL Server 2025, Azurite, FastAPI, Next.js, worker
    3. Create `services/aspire/AppHost/appsettings.Development.json` for local secrets
  - **Files**: `services/aspire/AppHost/AppHost.csproj`, `services/aspire/AppHost/AppHost.cs`, `services/aspire/AppHost/appsettings.Development.json`
  - **Done when**: AppHost.csproj references correct NuGet packages
  - **Verify**: `test -f services/aspire/AppHost/AppHost.cs && test -f services/aspire/AppHost/AppHost.csproj && echo "ASPIRE_OK"`
  - **Commit**: `feat(aspire): add .NET Aspire AppHost for local orchestration`
  - _Design: .NET Aspire Setup_

- [ ] 1.31 Create API Dockerfile
  - **Do**:
    1. Create `services/api/Dockerfile` with multi-stage build
    2. Stage 1: uv install deps. Stage 2: copy source, set entrypoint uvicorn
    3. Follow yt-summarizer Dockerfile pattern
  - **Files**: `services/api/Dockerfile`
  - **Done when**: Dockerfile parses (no syntax errors)
  - **Verify**: `test -f services/api/Dockerfile && head -1 services/api/Dockerfile | grep -q "FROM" && echo "DOCKERFILE_OK"`
  - **Commit**: `feat(api): add multi-stage Dockerfile`
  - _Design: CI/CD_

- [ ] 1.32 Verify Aspire builds
  - **Do**:
    1. Run `dotnet build` on Aspire project to verify it compiles
    2. Fix any reference issues
  - **Files**: `services/aspire/AppHost/AppHost.csproj`
  - **Done when**: `dotnet build` exits 0
  - **Verify**: `cd services/aspire/AppHost && dotnet build 2>&1 | tail -3`
  - **Commit**: `fix(aspire): resolve build issues` (if needed)
  - _Design: .NET Aspire Setup_

### Phase 1F: Meal Plan API + Worker (Core AI Loop)

- [ ] 1.33 Create meal plan Pydantic models
  - **Do**:
    1. Create `services/api/src/api/models/meal_plan.py`
    2. Define: CreateMealPlan, MealPlanResponse, MealPlanDetailResponse, MealSlotResponse, RecipeResponse, RecipeIngredientResponse, RecipeStepResponse
    3. Include AdaptRequest (effort_level: quick/standard/elaborate), UpdateMealSlot, UpdateSlotStatus, UpdatePlanStatus
  - **Files**: `services/api/src/api/models/meal_plan.py`
  - **Done when**: All models importable
  - **Verify**: `cd services/api && uv run python -c "from src.api.models.meal_plan import CreateMealPlan, MealPlanDetailResponse, AdaptRequest; print('OK')"`
  - **Commit**: `feat(api): add meal plan Pydantic models`
  - _Requirements: FR-05, AC-2.1, AC-2.6, AC-2.8_
  - _Design: API Design - Pydantic Models_

- [ ] 1.34 Create meal plan service layer
  - **Do**:
    1. Create `services/api/src/api/services/meal_plan_service.py`
    2. Implement: create_plan (enqueue to Azure Queue, return draft), get_plan, get_active_plan
    3. Implement: update_slot, update_slot_status (mark cooked/skipped with timestamp)
    4. Implement: update_plan_status (draft->active->completed lifecycle)
  - **Files**: `services/api/src/api/services/meal_plan_service.py`
  - **Done when**: Service class importable
  - **Verify**: `cd services/api && uv run python -c "from src.api.services.meal_plan_service import MealPlanService; print('OK')"`
  - **Commit**: `feat(api): add meal plan service with queue integration`
  - _Requirements: FR-05, FR-13, FR-17, FR-20, AC-2.8, AC-4.1, AC-4.7_
  - _Design: API Design, Async Workflow_

- [ ] 1.35 Create meal plan API routes
  - **Do**:
    1. Create `services/api/src/api/routes/meal_plans.py`
    2. POST /api/v1/meal-plans (202 Accepted)
    3. GET /api/v1/meal-plans/{id}, GET /api/v1/meal-plans/active
    4. PATCH /api/v1/meal-plans/{id}/status
  - **Files**: `services/api/src/api/routes/meal_plans.py`
  - **Done when**: Routes registered
  - **Verify**: `cd services/api && uv run python -c "from src.api.routes.meal_plans import router; print(f'{len(router.routes)} meal plan routes')"`
  - **Commit**: `feat(api): add meal plan CRUD API routes`
  - _Requirements: FR-05, AC-2.1_
  - _Design: API Design - Endpoints 7-10_

- [ ] 1.36 Create meal slot operation routes
  - **Do**:
    1. Add to `services/api/src/api/routes/meal_plans.py`:
    2. PATCH /api/v1/meal-plans/{id}/slots/{slot_id} (swap/modify)
    3. POST /api/v1/meal-plans/{id}/slots/{slot_id}/adapt (cook-time adaptation)
    4. PATCH /api/v1/meal-plans/{id}/slots/{slot_id}/status (mark cooked/skipped)
    5. POST /api/v1/recipes/{id}/save-variation
  - **Files**: `services/api/src/api/routes/meal_plans.py`
  - **Done when**: Slot operation routes registered
  - **Verify**: `cd services/api && uv run python -c "from src.api.routes.meal_plans import router; paths = [r.path for r in router.routes if hasattr(r,'path')]; print(f'{len(paths)} routes'); assert any('adapt' in str(p) for p in paths)"`
  - **Commit**: `feat(api): add meal slot swap, adapt, status routes`
  - _Requirements: FR-13, FR-14, FR-15, FR-16, FR-17, AC-4.1 through AC-4.7_
  - _Design: API Design - Endpoints 11-14_

- [ ] V5 [VERIFY] Quality checkpoint: meal plan API
  - **Do**: Lint entire API
  - **Verify**: `cd services/api && uv run ruff check src/ && uv run ruff format --check src/ && echo "QUALITY_OK"`
  - **Done when**: Zero lint errors
  - **Commit**: `chore(api): pass quality checkpoint` (if fixes needed)

- [ ] 1.37 Scaffold worker project
  - **Do**:
    1. Create `services/workers/pyproject.toml` with dependencies: anthropic, openai, shared (path dep)
    2. Create `services/workers/meal_plan_generator/` with `__init__.py`
    3. Create `services/workers/worker_utils/__init__.py`
  - **Files**: `services/workers/pyproject.toml`, `services/workers/meal_plan_generator/__init__.py`, `services/workers/worker_utils/__init__.py`
  - **Done when**: `uv sync` succeeds in workers directory
  - **Verify**: `cd services/workers && uv sync 2>&1 | tail -1`
  - **Commit**: `feat(workers): scaffold meal plan generator worker project`
  - _Design: Project Structure_

- [ ] 1.38 Create worker entry point (queue poller)
  - **Do**:
    1. Create `services/workers/meal_plan_generator/__main__.py` per design
    2. Implement: configure_logging, get_queue_client, poll loop with 10s interval
    3. Add simple HTTP health endpoint on port 8091
    4. Handle message processing with try/except, message deletion on success
  - **Files**: `services/workers/meal_plan_generator/__main__.py`
  - **Done when**: Entry point importable
  - **Verify**: `cd services/workers && uv run python -c "import importlib.util; spec = importlib.util.spec_from_file_location('m', 'meal_plan_generator/__main__.py'); print('PARSE_OK')"`
  - **Commit**: `feat(workers): add queue poller entry point for meal plan worker`
  - _Design: Worker Design - Entry Point_

- [ ] 1.39 Create LLM client abstraction
  - **Do**:
    1. Create `services/workers/meal_plan_generator/llm_client.py`
    2. Implement `call_llm(prompt, timeout)` supporting both Anthropic and OpenAI
    3. Provider selected via `LLM_PROVIDER` env var (default: "anthropic")
    4. Use Claude Sonnet for Anthropic, GPT-4o for OpenAI
  - **Files**: `services/workers/meal_plan_generator/llm_client.py`
  - **Done when**: `call_llm` function importable
  - **Verify**: `cd services/workers && uv run python -c "from meal_plan_generator.llm_client import call_llm; print('OK')"`
  - **Commit**: `feat(workers): add LLM client abstraction (Anthropic + OpenAI)`
  - _Requirements: AC-2.5_
  - _Design: LLM Integration_

- [ ] 1.40 Create prompt templates
  - **Do**:
    1. Create `services/workers/meal_plan_generator/prompts.py`
    2. Define SYSTEM_PROMPT with rules: prioritize expiring ingredients, 2 servings, equipment-specific steps, JSON output schema
    3. Implement `build_prompt(inventory, equipment, expiring)` and `add_error_feedback(prompt, errors)`
    4. Implement `format_equipment()`, `format_inventory()`, `format_expiring()` helpers
  - **Files**: `services/workers/meal_plan_generator/prompts.py`
  - **Done when**: `build_prompt` returns formatted string with all sections
  - **Verify**: `cd services/workers && uv run python -c "from meal_plan_generator.prompts import build_prompt; print('OK')"`
  - **Commit**: `feat(workers): add meal plan LLM prompt templates`
  - _Requirements: AC-2.2, AC-2.3, AC-2.4_
  - _Design: Prompt Engineering_

- [ ] 1.41 Create Pydantic schemas for LLM structured output
  - **Do**:
    1. Create `services/workers/meal_plan_generator/schemas.py`
    2. Define GeneratedRecipe, RecipeIngredientSchema, RecipeStepSchema, GeneratedMealPlan per design
    3. These serve as LLM output validation contracts
  - **Files**: `services/workers/meal_plan_generator/schemas.py`
  - **Done when**: GeneratedMealPlan.model_json_schema() returns valid schema
  - **Verify**: `cd services/workers && uv run python -c "from meal_plan_generator.schemas import GeneratedMealPlan; schema = GeneratedMealPlan.model_json_schema(); print(f'Schema keys: {list(schema.keys())}')"`
  - **Commit**: `feat(workers): add Pydantic schemas for LLM structured output`
  - _Requirements: AC-2.6_
  - _Design: Worker Design - Generator_

- [ ] 1.42 Create constraint validator
  - **Do**:
    1. Create `services/workers/meal_plan_generator/validator.py`
    2. Implement `validate_constraints(plan, inventory, equipment)` returning list of error strings
    3. Validate: exactly 7 recipes, servings == 2, equipment modes exist, ingredients referenced
  - **Files**: `services/workers/meal_plan_generator/validator.py`
  - **Done when**: Validator catches invalid plans
  - **Verify**: `cd services/workers && uv run python -c "from meal_plan_generator.validator import validate_constraints; print('OK')"`
  - **Commit**: `feat(workers): add constraint validator for LLM output`
  - _Requirements: FR-08, AC-2.5_
  - _Design: Constraint Validation_

- [ ] 1.43 Create meal plan generator orchestrator
  - **Do**:
    1. Create `services/workers/meal_plan_generator/generator.py`
    2. Implement `generate_meal_plan(message_content)`: load context from DB, build prompt, call LLM, validate, retry up to 3x, persist to DB
    3. On success: write Recipes, RecipeIngredients, RecipeSteps, MealSlots, GroceryList, GroceryItems, update plan status to "active"
    4. On failure after retries: update plan status to "failed" with error_message
  - **Files**: `services/workers/meal_plan_generator/generator.py`
  - **Done when**: `generate_meal_plan` function importable
  - **Verify**: `cd services/workers && uv run python -c "from meal_plan_generator.generator import generate_meal_plan; print('OK')"`
  - **Commit**: `feat(workers): add meal plan generation orchestrator with retry logic`
  - _Requirements: FR-05, FR-08, AC-2.1, AC-2.2, AC-2.5, AC-2.7_
  - _Design: Worker Design - Generator, Constraint Validation_

- [ ] 1.44 Create worker Dockerfile
  - **Do**:
    1. Create `services/workers/Dockerfile` with multi-stage build
    2. Follow yt-summarizer worker Dockerfile pattern
    3. Entry point: `python -m meal_plan_generator`
  - **Files**: `services/workers/Dockerfile`
  - **Done when**: Dockerfile exists and parses
  - **Verify**: `test -f services/workers/Dockerfile && head -1 services/workers/Dockerfile | grep -q "FROM" && echo "DOCKERFILE_OK"`
  - **Commit**: `feat(workers): add multi-stage Dockerfile for meal plan worker`
  - _Design: CI/CD_

- [ ] V6 [VERIFY] Quality checkpoint: worker
  - **Do**: Lint entire workers codebase
  - **Verify**: `cd services/workers && uv run ruff check meal_plan_generator/ && uv run ruff format --check meal_plan_generator/ && echo "QUALITY_OK"`
  - **Done when**: Zero lint errors
  - **Commit**: `chore(workers): pass quality checkpoint` (if fixes needed)

### Phase 1G: Grocery List API

- [ ] 1.45 Create grocery Pydantic models
  - **Do**:
    1. Create `services/api/src/api/models/grocery.py`
    2. Define: GroceryListResponse, GroceryItemResponse, UpdateGroceryItem (is_checked), CompleteShoppingRequest, PurchasedItem
  - **Files**: `services/api/src/api/models/grocery.py`
  - **Done when**: Models importable
  - **Verify**: `cd services/api && uv run python -c "from src.api.models.grocery import GroceryListResponse, CompleteShoppingRequest; print('OK')"`
  - **Commit**: `feat(api): add grocery list Pydantic models`
  - _Requirements: FR-09, FR-11, FR-12_
  - _Design: API Design - Pydantic Models_

- [ ] 1.46 Create grocery service layer
  - **Do**:
    1. Create `services/api/src/api/services/grocery_service.py`
    2. Implement: get_grocery_list (by meal_plan_id), check_item, uncheck_item
    3. Implement: complete_shopping - add purchased items to inventory with optional expiry dates
    4. Implement: regenerate_grocery_list - recalculate from plan minus inventory
  - **Files**: `services/api/src/api/services/grocery_service.py`
  - **Done when**: Service class importable
  - **Verify**: `cd services/api && uv run python -c "from src.api.services.grocery_service import GroceryService; print('OK')"`
  - **Commit**: `feat(api): add grocery service with inventory subtraction logic`
  - _Requirements: FR-09, FR-10, FR-11, FR-12, AC-3.1 through AC-3.7_
  - _Design: API Design_

- [ ] 1.47 Create grocery API routes
  - **Do**:
    1. Create `services/api/src/api/routes/grocery.py`
    2. GET /api/v1/meal-plans/{id}/grocery-list
    3. PATCH /api/v1/grocery-items/{id} (check/uncheck)
    4. POST /api/v1/grocery-lists/{id}/complete (shopping complete -> add to inventory)
  - **Files**: `services/api/src/api/routes/grocery.py`
  - **Done when**: 3 grocery routes registered
  - **Verify**: `cd services/api && uv run python -c "from src.api.routes.grocery import router; print(f'{len(router.routes)} grocery routes')"`
  - **Commit**: `feat(api): add grocery list, check-off, and shopping complete routes`
  - _Requirements: FR-09, FR-11, FR-12, AC-3.1, AC-3.4, AC-3.5_
  - _Design: API Design - Endpoints 15-17_

- [ ] 1.48 Create cook-time adaptation service
  - **Do**:
    1. Add `adapt_recipe()` method to `services/api/src/api/services/meal_plan_service.py`
    2. Implement direct LLM call (synchronous, not via worker queue) per design
    3. Build adaptation prompt based on effort_level (quick/standard/elaborate)
    4. Merge adapted steps back into recipe response
  - **Files**: `services/api/src/api/services/meal_plan_service.py`
  - **Done when**: adapt_recipe method exists in service
  - **Verify**: `cd services/api && uv run python -c "from src.api.services.meal_plan_service import MealPlanService; assert hasattr(MealPlanService, 'adapt_recipe') or callable(getattr(MealPlanService, 'adapt_recipe', None)); print('OK')"`
  - **Commit**: `feat(api): add cook-time adaptation via synchronous LLM call`
  - _Requirements: FR-15, AC-4.3, AC-4.4, AC-4.5, NFR-02_
  - _Design: Cook-Time Adaptation_

- [ ] 1.49 Register grocery router and finalize all API routes
  - **Do**:
    1. Update `services/api/src/api/main.py` to include grocery router
    2. Verify all 20 endpoints are accessible
  - **Files**: `services/api/src/api/main.py`
  - **Done when**: All routers registered
  - **Verify**: `cd services/api && uv run python -c "from src.api.main import create_app; app = create_app(); routes = [r.path for r in app.routes if hasattr(r, 'path')]; print(f'{len(routes)} routes'); assert any('grocery' in str(r) for r in routes)"`
  - **Commit**: `feat(api): register all API routers (20 endpoints)`
  - _Design: API Design_

- [ ] V7 [VERIFY] Quality checkpoint: full API
  - **Do**: Lint entire API and worker codebase
  - **Verify**: `cd services/api && uv run ruff check src/ && uv run ruff format --check src/ && cd ../../services/workers && uv run ruff check meal_plan_generator/ && echo "QUALITY_OK"`
  - **Done when**: Zero lint errors across both services
  - **Commit**: `chore(api): pass quality checkpoint` (if fixes needed)

### Phase 1H: Next.js Frontend

- [ ] 1.50 Scaffold Next.js project
  - **Do**:
    1. Run `npx create-next-app@latest apps/web` with TypeScript, Tailwind CSS v4, App Router, src/ directory
    2. Configure `next.config.ts` with NEXT_PUBLIC_API_URL env
    3. Add `staticwebapp.config.json` for Azure SWA
  - **Files**: `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/staticwebapp.config.json`, `apps/web/tsconfig.json`
  - **Done when**: `npm run build` succeeds in apps/web
  - **Verify**: `cd apps/web && npm install && npm run build 2>&1 | tail -3`
  - **Commit**: `feat(web): scaffold Next.js 16 project with TypeScript and Tailwind`
  - _Design: Frontend Architecture_

- [ ] 1.51 Create TypeScript interfaces
  - **Do**:
    1. Create `apps/web/src/types/` directory with `index.ts`
    2. Define TypeScript interfaces matching all Pydantic models: InventoryItem, Ingredient, Equipment, EquipmentMode, MealPlan, MealSlot, Recipe, RecipeIngredient, RecipeStep, GroceryList, GroceryItem
    3. Include enums/unions for status fields and unit types
  - **Files**: `apps/web/src/types/index.ts`
  - **Done when**: All types exported and used by API client
  - **Verify**: `cd apps/web && npx tsc --noEmit 2>&1 | tail -3`
  - **Commit**: `feat(web): add TypeScript interfaces matching API models`
  - _Design: Frontend Architecture_

- [ ] 1.52 Create API client service
  - **Do**:
    1. Create `apps/web/src/services/api.ts` with `fetchApi<T>()` wrapper
    2. Implement all API methods: inventory CRUD, equipment, meal plan operations, grocery operations, ingredient search
    3. Handle errors with ApiError class
    4. Use NEXT_PUBLIC_API_URL env var
  - **Files**: `apps/web/src/services/api.ts`
  - **Done when**: All API methods exported
  - **Verify**: `cd apps/web && npx tsc --noEmit 2>&1 | tail -3`
  - **Commit**: `feat(web): add API client with all endpoint methods`
  - _Design: Frontend Architecture - API Client_

- [ ] 1.53 Set up Auth0 BFF authentication
  - **Do**:
    1. Install `@auth0/nextjs-auth0` 4.x
    2. Create `apps/web/src/app/api/auth/[auth0]/route.ts` for Auth0 BFF handler
    3. Configure auth in `apps/web/src/app/layout.tsx` with UserProvider
    4. Add env vars: AUTH0_SECRET, AUTH0_BASE_URL, AUTH0_ISSUER_BASE_URL, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET
  - **Files**: `apps/web/src/app/api/auth/[auth0]/route.ts`, `apps/web/src/app/layout.tsx`
  - **Done when**: Auth route handler exists
  - **Verify**: `cd apps/web && npx tsc --noEmit 2>&1 | tail -3`
  - **Commit**: `feat(web): add Auth0 BFF authentication`
  - _Requirements: FR-18_
  - _Design: Auth Flow_

- [ ] V8 [VERIFY] Quality checkpoint: frontend scaffold
  - **Do**: TypeScript check and lint
  - **Verify**: `cd apps/web && npx tsc --noEmit && npm run lint && echo "QUALITY_OK"`
  - **Done when**: Zero type errors, zero lint errors
  - **Commit**: `chore(web): pass quality checkpoint` (if fixes needed)

- [ ] 1.54 Create shared UI components
  - **Do**:
    1. Create `apps/web/src/components/ui/` with Button.tsx, Input.tsx, Dialog.tsx, Badge.tsx, Spinner.tsx
    2. Use Tailwind CSS classes, mobile-first (min-width 375px)
    3. Touch targets >= 44px per FR-19
  - **Files**: `apps/web/src/components/ui/Button.tsx`, `apps/web/src/components/ui/Input.tsx`, `apps/web/src/components/ui/Dialog.tsx`, `apps/web/src/components/ui/Badge.tsx`, `apps/web/src/components/ui/Spinner.tsx`
  - **Done when**: Components importable, TypeScript clean
  - **Verify**: `cd apps/web && npx tsc --noEmit 2>&1 | tail -3`
  - **Commit**: `feat(web): add shared UI components (Button, Input, Dialog, Badge, Spinner)`
  - _Requirements: FR-19, NFR-11_
  - _Design: Frontend Architecture - Components_

- [ ] 1.55 Create ExpiryBadge component
  - **Do**:
    1. Create `apps/web/src/components/inventory/ExpiryBadge.tsx`
    2. Compute status from expiry date: safe (default), expiring within 2 days (amber), expired (red)
    3. Use Badge component with appropriate color
  - **Files**: `apps/web/src/components/inventory/ExpiryBadge.tsx`
  - **Done when**: Component renders correct colors based on date
  - **Verify**: `cd apps/web && npx tsc --noEmit 2>&1 | tail -3`
  - **Commit**: `feat(web): add ExpiryBadge component with amber/red highlighting`
  - _Requirements: FR-02, AC-1.2_
  - _Design: Frontend Architecture - Components_

- [ ] 1.56 Create AddItemForm component
  - **Do**:
    1. Create `apps/web/src/components/inventory/AddItemForm.tsx`
    2. Ingredient autocomplete using GET /api/v1/ingredients
    3. Quantity input, unit selector (g/ml/units), location selector (fridge/pantry), optional expiry date
    4. Submit calls POST /api/v1/inventory
  - **Files**: `apps/web/src/components/inventory/AddItemForm.tsx`
  - **Done when**: Form component renders with all fields
  - **Verify**: `cd apps/web && npx tsc --noEmit 2>&1 | tail -3`
  - **Commit**: `feat(web): add inventory AddItemForm with ingredient autocomplete`
  - _Requirements: FR-01, AC-1.1_
  - _Design: Frontend Architecture - Components_

- [ ] 1.57 Create InventoryList component
  - **Do**:
    1. Create `apps/web/src/components/inventory/InventoryList.tsx`
    2. Group items by location (fridge, pantry)
    3. Sort expiring-soon items to top within each group
    4. Edit quantity, remove item actions
    5. Use ExpiryBadge for each item
  - **Files**: `apps/web/src/components/inventory/InventoryList.tsx`
  - **Done when**: Component renders grouped inventory
  - **Verify**: `cd apps/web && npx tsc --noEmit 2>&1 | tail -3`
  - **Commit**: `feat(web): add InventoryList component grouped by location`
  - _Requirements: AC-1.2, AC-1.4, AC-1.5, AC-1.6_
  - _Design: Frontend Architecture - Components_

- [ ] 1.58 Create inventory page
  - **Do**:
    1. Create `apps/web/src/app/inventory/page.tsx`
    2. Compose InventoryList + AddItemForm
    3. Fetch data from GET /api/v1/inventory
    4. Handle loading/error states
  - **Files**: `apps/web/src/app/inventory/page.tsx`
  - **Done when**: Page renders with inventory data
  - **Verify**: `cd apps/web && npx tsc --noEmit 2>&1 | tail -3`
  - **Commit**: `feat(web): add inventory page`
  - _Requirements: US-1_
  - _Design: Frontend Architecture - Pages_

- [ ] V9 [VERIFY] Quality checkpoint: inventory UI
  - **Do**: TypeScript and lint check
  - **Verify**: `cd apps/web && npx tsc --noEmit && npm run lint && echo "QUALITY_OK"`
  - **Done when**: Zero errors
  - **Commit**: `chore(web): pass quality checkpoint` (if fixes needed)

- [ ] 1.59 Create WeeklyPlanView component
  - **Do**:
    1. Create `apps/web/src/components/meal-plan/WeeklyPlanView.tsx`
    2. List-based layout (not calendar grid) per research
    3. Show 7 days with dinner slots, recipe title, prep/cook time
    4. Equipment tags on each recipe
  - **Files**: `apps/web/src/components/meal-plan/WeeklyPlanView.tsx`
  - **Done when**: Component renders 7-day plan
  - **Verify**: `cd apps/web && npx tsc --noEmit 2>&1 | tail -3`
  - **Commit**: `feat(web): add WeeklyPlanView list-based component`
  - _Requirements: AC-2.1_
  - _Design: Frontend Architecture - Components_

- [ ] 1.60 Create MealSlotCard component
  - **Do**:
    1. Create `apps/web/src/components/meal-plan/MealSlotCard.tsx`
    2. Show recipe title, time info, equipment mode badges
    3. Actions: swap, adapt (quick/standard/elaborate), mark cooked/skipped
    4. Status indicator (planned/cooked/skipped)
  - **Files**: `apps/web/src/components/meal-plan/MealSlotCard.tsx`
  - **Done when**: Card component renders with actions
  - **Verify**: `cd apps/web && npx tsc --noEmit 2>&1 | tail -3`
  - **Commit**: `feat(web): add MealSlotCard with swap, adapt, status actions`
  - _Requirements: AC-4.1, AC-4.3, AC-4.4, AC-4.7_
  - _Design: Frontend Architecture - Components_

- [ ] 1.61 Create SwapDialog and AdaptControls components
  - **Do**:
    1. Create `apps/web/src/components/meal-plan/SwapDialog.tsx` for swapping meals between days
    2. Create `apps/web/src/components/meal-plan/AdaptControls.tsx` with quick/standard/elaborate buttons
    3. SwapDialog: select target day, calls PATCH endpoint
    4. AdaptControls: calls POST /adapt endpoint, shows adapted recipe
  - **Files**: `apps/web/src/components/meal-plan/SwapDialog.tsx`, `apps/web/src/components/meal-plan/AdaptControls.tsx`
  - **Done when**: Both components render and connect to API
  - **Verify**: `cd apps/web && npx tsc --noEmit 2>&1 | tail -3`
  - **Commit**: `feat(web): add SwapDialog and AdaptControls components`
  - _Requirements: AC-4.1, AC-4.3, AC-4.4_
  - _Design: Frontend Architecture - Components_

- [ ] 1.62 Create meal plan pages
  - **Do**:
    1. Create `apps/web/src/app/meal-plan/page.tsx` - plan list, "Generate New Plan" button
    2. Create `apps/web/src/app/meal-plan/[id]/page.tsx` - plan detail with WeeklyPlanView
    3. Add polling hook for plan generation (useMealPlanPolling)
  - **Files**: `apps/web/src/app/meal-plan/page.tsx`, `apps/web/src/app/meal-plan/[id]/page.tsx`, `apps/web/src/hooks/useMealPlanPolling.ts`
  - **Done when**: Both pages render, polling works for draft plans
  - **Verify**: `cd apps/web && npx tsc --noEmit 2>&1 | tail -3`
  - **Commit**: `feat(web): add meal plan list and detail pages with polling`
  - _Requirements: US-2, AC-2.1_
  - _Design: Frontend Architecture - Pages, Polling_

- [ ] 1.63 Create GroceryList and GroceryItem components
  - **Do**:
    1. Create `apps/web/src/components/grocery/GroceryList.tsx` grouped by preferred_store
    2. Create `apps/web/src/components/grocery/GroceryItem.tsx` with checkbox, name, quantity
    3. Check/uncheck calls PATCH /api/v1/grocery-items/{id}
  - **Files**: `apps/web/src/components/grocery/GroceryList.tsx`, `apps/web/src/components/grocery/GroceryItem.tsx`
  - **Done when**: Components render with checkboxes
  - **Verify**: `cd apps/web && npx tsc --noEmit 2>&1 | tail -3`
  - **Commit**: `feat(web): add GroceryList and GroceryItem components`
  - _Requirements: FR-11, AC-3.4, AC-3.6_
  - _Design: Frontend Architecture - Components_

- [ ] 1.64 Create CompleteShoppingDialog component
  - **Do**:
    1. Create `apps/web/src/components/grocery/CompleteShoppingDialog.tsx`
    2. Show list of checked items with expiry date input for each
    3. Submit calls POST /api/v1/grocery-lists/{id}/complete
    4. On success, items added to inventory
  - **Files**: `apps/web/src/components/grocery/CompleteShoppingDialog.tsx`
  - **Done when**: Dialog renders with expiry inputs
  - **Verify**: `cd apps/web && npx tsc --noEmit 2>&1 | tail -3`
  - **Commit**: `feat(web): add CompleteShoppingDialog with expiry entry`
  - _Requirements: FR-12, AC-3.5_
  - _Design: Frontend Architecture - Components_

- [ ] 1.65 Create grocery list page
  - **Do**:
    1. Create `apps/web/src/app/grocery-list/[id]/page.tsx`
    2. Compose GroceryList + CompleteShoppingDialog
    3. Fetch data from GET /api/v1/meal-plans/{id}/grocery-list
  - **Files**: `apps/web/src/app/grocery-list/[id]/page.tsx`
  - **Done when**: Page renders grocery list
  - **Verify**: `cd apps/web && npx tsc --noEmit 2>&1 | tail -3`
  - **Commit**: `feat(web): add grocery list page`
  - _Requirements: US-3_
  - _Design: Frontend Architecture - Pages_

- [ ] 1.66 Create dashboard page
  - **Do**:
    1. Update `apps/web/src/app/page.tsx` as dashboard
    2. Show: active plan summary, expiring items count, quick links to inventory/plan/grocery
    3. If no active plan, show "Generate Plan" CTA
  - **Files**: `apps/web/src/app/page.tsx`
  - **Done when**: Dashboard page renders with plan summary
  - **Verify**: `cd apps/web && npx tsc --noEmit 2>&1 | tail -3`
  - **Commit**: `feat(web): add dashboard page with active plan summary`
  - _Design: Frontend Architecture - Pages_

- [ ] 1.67 Create navigation layout
  - **Do**:
    1. Update `apps/web/src/app/layout.tsx` with mobile-first navigation
    2. Bottom tab bar: Home, Inventory, Meal Plan, Grocery List
    3. Include auth login/logout in header
    4. Mobile-first responsive (375px min)
  - **Files**: `apps/web/src/app/layout.tsx`
  - **Done when**: Navigation visible on all pages
  - **Verify**: `cd apps/web && npx tsc --noEmit 2>&1 | tail -3`
  - **Commit**: `feat(web): add mobile-first navigation layout`
  - _Requirements: FR-19, NFR-11_
  - _Design: Frontend Architecture_

- [ ] V10 [VERIFY] Quality checkpoint: full frontend
  - **Do**: TypeScript, lint, and build check
  - **Verify**: `cd apps/web && npx tsc --noEmit && npm run lint && npm run build 2>&1 | tail -5 && echo "QUALITY_OK"`
  - **Done when**: Build succeeds, zero type/lint errors
  - **Commit**: `chore(web): pass quality checkpoint` (if fixes needed)

### Phase 1I: POC Validation

- [ ] 1.68 POC Checkpoint: end-to-end stack validation
  - **Do**:
    1. Verify API starts: `cd services/api && uv run uvicorn src.api.main:app --port 8000`
    2. Verify health endpoint: `curl http://localhost:8000/health/live`
    3. Verify frontend builds: `cd apps/web && npm run build`
    4. Verify all route registrations in app factory
  - **Done when**: API responds to health check, frontend builds successfully
  - **Verify**: `cd services/api && uv run python -c "from src.api.main import create_app; app = create_app(); routes = [r.path for r in app.routes if hasattr(r,'path')]; print(f'{len(routes)} routes registered'); assert len(routes) >= 15" && cd ../.. && cd apps/web && npm run build 2>&1 | tail -1`
  - **Commit**: `feat(meal-planner): complete POC - full stack validated`
  - _Requirements: All P1-P4_

## Phase 2: Refactoring

After POC validated, clean up code structure, extract utilities, add proper error handling.

- [ ] 2.1 Extract common API error handling
  - **Do**:
    1. Create `services/api/src/api/errors.py` with structured error response format
    2. Add exception handlers for 404, 422, 409, 500 with correlation ID
    3. Register handlers in app factory
  - **Files**: `services/api/src/api/errors.py`, `services/api/src/api/main.py`
  - **Done when**: All error responses include correlation_id and consistent structure
  - **Verify**: `cd services/api && uv run ruff check src/api/errors.py && echo "OK"`
  - **Commit**: `refactor(api): extract structured error handling with correlation ID`
  - _Design: Error Handling_

- [ ] 2.2 Add input validation to API routes
  - **Do**:
    1. Add week_start_date validation (must be Monday) to CreateMealPlan
    2. Add active plan check before creating new plan (409 Conflict)
    3. Add cross-household access guard returning 404
  - **Files**: `services/api/src/api/services/meal_plan_service.py`, `services/api/src/api/models/meal_plan.py`
  - **Done when**: Invalid inputs return proper error responses
  - **Verify**: `cd services/api && uv run ruff check src/ && echo "OK"`
  - **Commit**: `refactor(api): add input validation and business rule enforcement`
  - _Requirements: FR-20, NFR-13_
  - _Design: Edge Cases_

- [ ] 2.3 Refactor service layer dependency injection
  - **Do**:
    1. Create `services/api/src/api/dependencies.py` with `get_service()` factory functions
    2. Move DB session and household_id injection into clean dependency chain
    3. All routes use `Depends(get_service)` pattern per yt-summarizer
  - **Files**: `services/api/src/api/dependencies.py`, update route files
  - **Done when**: All routes use clean dependency injection
  - **Verify**: `cd services/api && uv run ruff check src/ && echo "OK"`
  - **Commit**: `refactor(api): extract service dependency injection`
  - _Design: Proven Patterns - Route structure_

- [ ] 2.4 Add retry logic to LLM client
  - **Do**:
    1. Add tenacity retry decorator to `call_llm()` with 3 retries, exponential backoff
    2. Add timeout handling per NFR-01 (25s for generation) and NFR-02 (8s for adaptation)
    3. Add structured logging for LLM calls (tokens, latency, cost estimate)
  - **Files**: `services/workers/meal_plan_generator/llm_client.py`
  - **Done when**: LLM calls have retry and timeout behavior
  - **Verify**: `cd services/workers && uv run ruff check meal_plan_generator/llm_client.py && echo "OK"`
  - **Commit**: `refactor(workers): add retry, timeout, and logging to LLM client`
  - _Requirements: NFR-01, NFR-02, NFR-10_
  - _Design: LLM Integration_

- [ ] 2.5 Refactor frontend API client with error boundaries
  - **Do**:
    1. Add React error boundary component
    2. Add loading/error state handling in API client
    3. Add JWT token forwarding from Auth0 session
  - **Files**: `apps/web/src/services/api.ts`, `apps/web/src/components/ui/ErrorBoundary.tsx`
  - **Done when**: API errors caught gracefully, auth tokens forwarded
  - **Verify**: `cd apps/web && npx tsc --noEmit && echo "OK"`
  - **Commit**: `refactor(web): add error boundaries and auth token forwarding`
  - _Requirements: FR-18_
  - _Design: Frontend Architecture_

- [ ] V11 [VERIFY] Quality checkpoint: post-refactoring
  - **Do**: Full lint pass on all services
  - **Verify**: `cd services/api && uv run ruff check src/ && uv run ruff format --check src/ && cd ../../services/workers && uv run ruff check meal_plan_generator/ && cd ../../apps/web && npx tsc --noEmit && npm run lint && echo "QUALITY_OK"`
  - **Done when**: All quality checks pass
  - **Commit**: `chore: pass quality checkpoint post-refactoring` (if fixes needed)

## Phase 3: Testing

- [ ] 3.1 Create API test infrastructure
  - **Do**:
    1. Create `services/api/tests/conftest.py` with async test fixtures
    2. Set up in-memory or SQLite database for unit tests
    3. Create test client factory, mock auth dependency
    4. Create test household and seed data fixtures
  - **Files**: `services/api/tests/__init__.py`, `services/api/tests/conftest.py`
  - **Done when**: Fixtures loadable by pytest
  - **Verify**: `cd services/api && uv run pytest tests/ --collect-only 2>&1 | tail -5`
  - **Commit**: `test(api): add test infrastructure with fixtures`
  - _Design: Test Strategy_

- [ ] 3.2 Unit tests: inventory service
  - **Do**:
    1. Create `services/api/tests/test_inventory_service.py`
    2. Test: list items (grouped by location, expiring first), add item, update quantity, remove item
    3. Test: expiry_status computation (safe/expiring/expired)
    4. Test: household isolation (user A cannot see user B items)
  - **Files**: `services/api/tests/test_inventory_service.py`
  - **Done when**: All tests pass
  - **Verify**: `cd services/api && uv run pytest tests/test_inventory_service.py -v 2>&1 | tail -10`
  - **Commit**: `test(api): add inventory service unit tests`
  - _Requirements: AC-1.1, AC-1.2, AC-1.4, AC-1.5, AC-1.6, AC-1.8_
  - _Design: Test Strategy - Unit Tests_

- [ ] 3.3 Unit tests: inventory API routes
  - **Do**:
    1. Create `services/api/tests/test_inventory_routes.py`
    2. Test all 4 CRUD endpoints with httpx test client
    3. Test 401 unauthorized, 404 not found, 422 validation
  - **Files**: `services/api/tests/test_inventory_routes.py`
  - **Done when**: All route tests pass
  - **Verify**: `cd services/api && uv run pytest tests/test_inventory_routes.py -v 2>&1 | tail -10`
  - **Commit**: `test(api): add inventory route integration tests`
  - _Requirements: AC-1.1, AC-1.4, AC-1.5_
  - _Design: Test Strategy - Integration Tests_

- [ ] V12 [VERIFY] Quality checkpoint: inventory tests
  - **Do**: Run all tests
  - **Verify**: `cd services/api && uv run pytest tests/ -v 2>&1 | tail -10 && echo "TESTS_OK"`
  - **Done when**: All tests pass
  - **Commit**: `chore(api): pass quality checkpoint` (if fixes needed)

- [ ] 3.4 Unit tests: grocery service
  - **Do**:
    1. Create `services/api/tests/test_grocery_service.py`
    2. Test: grocery list = plan needs minus inventory (subtraction math)
    3. Test: consolidation of same ingredient across meals
    4. Test: partial inventory (500g needed, 200g in stock = 300g on list)
    5. Test: check-off persistence, shopping complete flow
  - **Files**: `services/api/tests/test_grocery_service.py`
  - **Done when**: All grocery math tests pass
  - **Verify**: `cd services/api && uv run pytest tests/test_grocery_service.py -v 2>&1 | tail -10`
  - **Commit**: `test(api): add grocery service unit tests with inventory subtraction`
  - _Requirements: AC-3.1, AC-3.2, AC-3.3, AC-3.4, AC-3.5_
  - _Design: Test Strategy - Unit Tests_

- [ ] 3.5 Unit tests: meal plan service
  - **Do**:
    1. Create `services/api/tests/test_meal_plan_service.py`
    2. Test: plan status lifecycle (draft -> active -> completed)
    3. Test: only one active plan per household
    4. Test: slot operations (swap, mark cooked/skipped)
    5. Test: plan creation enqueues message
  - **Files**: `services/api/tests/test_meal_plan_service.py`
  - **Done when**: All plan lifecycle tests pass
  - **Verify**: `cd services/api && uv run pytest tests/test_meal_plan_service.py -v 2>&1 | tail -10`
  - **Commit**: `test(api): add meal plan service unit tests`
  - _Requirements: AC-2.8, FR-20, AC-4.1, AC-4.7_
  - _Design: Test Strategy - Unit Tests_

- [ ] 3.6 Unit tests: constraint validator
  - **Do**:
    1. Create `services/workers/tests/__init__.py` and `services/workers/tests/conftest.py`
    2. Create `services/workers/tests/test_validator.py`
    3. Test: exactly 7 recipes required
    4. Test: servings must be 2
    5. Test: unknown equipment modes rejected
    6. Test: valid plan passes
  - **Files**: `services/workers/tests/__init__.py`, `services/workers/tests/conftest.py`, `services/workers/tests/test_validator.py`
  - **Done when**: All validation tests pass
  - **Verify**: `cd services/workers && uv run pytest tests/test_validator.py -v 2>&1 | tail -10`
  - **Commit**: `test(workers): add constraint validator unit tests`
  - _Requirements: FR-08, AC-2.5_
  - _Design: Test Strategy - Unit Tests_

- [ ] 3.7 Unit tests: prompt builder
  - **Do**:
    1. Create `services/workers/tests/test_prompts.py`
    2. Test: prompt includes inventory, equipment, expiring items
    3. Test: JSON schema included in prompt
    4. Test: error feedback appended on retry
  - **Files**: `services/workers/tests/test_prompts.py`
  - **Done when**: All prompt tests pass
  - **Verify**: `cd services/workers && uv run pytest tests/test_prompts.py -v 2>&1 | tail -10`
  - **Commit**: `test(workers): add prompt builder unit tests`
  - _Design: Test Strategy - Unit Tests_

- [ ] V13 [VERIFY] Quality checkpoint: all unit tests
  - **Do**: Run complete test suite
  - **Verify**: `cd services/api && uv run pytest tests/ -v && cd ../../services/workers && uv run pytest tests/ -v && echo "ALL_TESTS_OK"`
  - **Done when**: All tests pass across both services
  - **Commit**: `chore: pass quality checkpoint - all unit tests green` (if fixes needed)

- [ ] 3.8 Frontend unit tests: ExpiryBadge
  - **Do**:
    1. Create `apps/web/src/__tests__/ExpiryBadge.test.tsx`
    2. Test: safe items render default style
    3. Test: items expiring within 2 days render amber
    4. Test: expired items render red
  - **Files**: `apps/web/src/__tests__/ExpiryBadge.test.tsx`
  - **Done when**: All badge tests pass
  - **Verify**: `cd apps/web && npm test -- --run 2>&1 | tail -10`
  - **Commit**: `test(web): add ExpiryBadge component tests`
  - _Requirements: FR-02, AC-1.2_

- [ ] 3.9 Frontend unit tests: API client
  - **Do**:
    1. Create `apps/web/src/__tests__/api.test.ts`
    2. Test: fetch wrapper adds headers, handles errors
    3. Test: all API methods call correct endpoints
    4. Mock fetch for isolation
  - **Files**: `apps/web/src/__tests__/api.test.ts`
  - **Done when**: API client tests pass
  - **Verify**: `cd apps/web && npm test -- --run 2>&1 | tail -10`
  - **Commit**: `test(web): add API client unit tests`
  - _Design: Test Strategy_

- [ ] V14 [VERIFY] Quality checkpoint: frontend tests
  - **Do**: Run frontend test suite
  - **Verify**: `cd apps/web && npm test -- --run 2>&1 | tail -10 && echo "FRONTEND_TESTS_OK"`
  - **Done when**: All frontend tests pass
  - **Commit**: `chore(web): pass quality checkpoint` (if fixes needed)

- [ ] 3.10 Integration test: full API lifecycle (mock LLM)
  - **Do**:
    1. Create `services/api/tests/test_integration.py`
    2. Test full flow: add inventory -> generate plan (mock LLM) -> view grocery list -> check items -> complete shopping -> verify inventory updated
    3. Use httpx async client against test app
    4. Mock LLM responses with valid GeneratedMealPlan JSON
  - **Files**: `services/api/tests/test_integration.py`
  - **Done when**: Full lifecycle test passes
  - **Verify**: `cd services/api && uv run pytest tests/test_integration.py -v 2>&1 | tail -10`
  - **Commit**: `test(api): add full lifecycle integration test (mock LLM)`
  - _Requirements: SC-4_
  - _Design: Test Strategy - Integration Tests_

## Phase 4: Infrastructure and Deployment

- [ ] 4.1 Create Terraform configuration
  - **Do**:
    1. Create `infra/terraform/` with backend.tf (Azure Blob backend), providers.tf, variables.tf
    2. Create sql.tf (Azure SQL serverless), storage.tf (storage account + queue), swa.tf (Static Web App)
    3. Create key-vault-secrets.tf (DB connection, storage connection in shared Key Vault)
    4. Reference shared infra data sources (AKS, ACR, Key Vault, resource group)
  - **Files**: `infra/terraform/backend.tf`, `infra/terraform/providers.tf`, `infra/terraform/variables.tf`, `infra/terraform/sql.tf`, `infra/terraform/storage.tf`, `infra/terraform/swa.tf`, `infra/terraform/key-vault-secrets.tf`
  - **Done when**: `terraform validate` passes
  - **Verify**: `cd infra/terraform && terraform init -backend=false && terraform validate && echo "TF_OK"`
  - **Commit**: `feat(infra): add Terraform for Azure SQL, storage, SWA`
  - _Requirements: NFR-07_
  - _Design: Infrastructure_

- [ ] 4.2 Create K8s base manifests
  - **Do**:
    1. Create `k8s/base/namespace.yaml` (meal-planner namespace)
    2. Create `k8s/base/configmap.yaml` (environment config)
    3. Create `k8s/base/api-deployment.yaml`, `k8s/base/api-service.yaml`, `k8s/base/api-httproute.yaml`
    4. Create `k8s/base/kustomization.yaml` listing all resources
  - **Files**: `k8s/base/namespace.yaml`, `k8s/base/configmap.yaml`, `k8s/base/api-deployment.yaml`, `k8s/base/api-service.yaml`, `k8s/base/api-httproute.yaml`, `k8s/base/kustomization.yaml`
  - **Done when**: `kustomize build` succeeds
  - **Verify**: `cd k8s && kustomize build base/ > /dev/null 2>&1 && echo "KUSTOMIZE_OK" || echo "KUSTOMIZE_NEEDS_FIX"`
  - **Commit**: `feat(k8s): add base API deployment manifests`
  - _Design: Kubernetes Manifests_

- [ ] 4.3 Create K8s worker and secrets manifests
  - **Do**:
    1. Create `k8s/base/worker-deployment.yaml` (sync-wave: 3)
    2. Create `k8s/base/migration-job.yaml` (Alembic migration job)
    3. Create `k8s/base/externalsecret-db.yaml`, `externalsecret-storage.yaml`, `externalsecret-llm.yaml`, `externalsecret-auth0.yaml`, `secretstore.yaml`
    4. Update kustomization.yaml with new resources
  - **Files**: `k8s/base/worker-deployment.yaml`, `k8s/base/migration-job.yaml`, `k8s/base/externalsecret-db.yaml`, `k8s/base/externalsecret-storage.yaml`, `k8s/base/externalsecret-llm.yaml`, `k8s/base/externalsecret-auth0.yaml`, `k8s/base/secretstore.yaml`
  - **Done when**: `kustomize build` includes worker and secrets
  - **Verify**: `cd k8s && kustomize build base/ > /dev/null 2>&1 && echo "KUSTOMIZE_OK" || echo "NEEDS_FIX"`
  - **Commit**: `feat(k8s): add worker, migration job, and external secrets manifests`
  - _Design: Kubernetes Manifests_

- [ ] 4.4 Create K8s overlays (prod + preview)
  - **Do**:
    1. Create `k8s/overlays/prod/kustomization.yaml` with image references to ACR
    2. Create `k8s/overlays/preview/kustomization.yaml` with PR-specific patches
  - **Files**: `k8s/overlays/prod/kustomization.yaml`, `k8s/overlays/preview/kustomization.yaml`
  - **Done when**: Both overlays build
  - **Verify**: `cd k8s && kustomize build overlays/prod/ > /dev/null 2>&1 && echo "PROD_OK" || echo "NEEDS_FIX"`
  - **Commit**: `feat(k8s): add prod and preview Kustomize overlays`
  - _Design: Kubernetes Manifests_

- [ ] V15 [VERIFY] Quality checkpoint: infrastructure
  - **Do**: Validate Terraform and Kustomize
  - **Verify**: `cd infra/terraform && terraform init -backend=false && terraform validate && cd ../../k8s && kustomize build base/ > /dev/null && echo "INFRA_OK"`
  - **Done when**: Both validate without errors
  - **Commit**: `chore(infra): pass quality checkpoint` (if fixes needed)

- [ ] 4.5 Create CI/CD workflow
  - **Do**:
    1. Create `.github/workflows/ci.yml` adapted from yt-summarizer
    2. Jobs: python-lint (ruff), frontend-quality (eslint, tsc, build), security-scan (bandit, pip-audit), python-tests (pytest), k8s-validation (kustomize + kubeval), docker-build (ACR push), swa-deploy
    3. OIDC auth to Azure, conditional on push to master
  - **Files**: `.github/workflows/ci.yml`
  - **Done when**: Workflow YAML valid
  - **Verify**: `python -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('YAML_OK')" 2>/dev/null || echo "YAML_VALID"`
  - **Commit**: `feat(ci): add 9-phase CI/CD pipeline`
  - _Requirements: NFR-05, NFR-08_
  - _Design: CI/CD_

- [ ] 4.6 Create pre-commit configuration
  - **Do**:
    1. Create `.pre-commit-config.yaml` with hooks: ruff, prettier, yamllint, gitleaks, actionlint
    2. Create `services/ruff.toml` (shared ruff config for 100-char line-length)
  - **Files**: `.pre-commit-config.yaml`, `services/ruff.toml`
  - **Done when**: Pre-commit config parseable
  - **Verify**: `test -f .pre-commit-config.yaml && echo "PRECOMMIT_OK"`
  - **Commit**: `feat(quality): add pre-commit hooks configuration`
  - _Requirements: NFR-08, NFR-09_
  - _Design: Code Quality Gates_

## Phase 5: Quality Gates and PR

- [ ] V16 [VERIFY] Full local CI: all quality checks
  - **Do**: Run complete local CI suite
  - **Verify**: All commands must pass:
    - `cd services/shared && uv run ruff check shared/ && uv run ruff format --check shared/`
    - `cd services/api && uv run ruff check src/ && uv run ruff format --check src/ && uv run pytest tests/ -v`
    - `cd services/workers && uv run ruff check meal_plan_generator/ && uv run ruff format --check meal_plan_generator/ && uv run pytest tests/ -v`
    - `cd apps/web && npx tsc --noEmit && npm run lint && npm run build && npm test -- --run`
  - **Done when**: All commands pass with no errors
  - **Commit**: `chore: pass full local CI` (if fixes needed)

- [ ] 5.1 Create PR and verify CI
  - **Do**:
    1. Verify current branch is a feature branch: `git branch --show-current`
    2. Push branch: `git push -u origin $(git branch --show-current)`
    3. Create PR using gh CLI with summary of all changes
  - **Verify**: `gh pr checks --watch` shows all green
  - **Done when**: All CI checks pass, PR ready for review
  - **Commit**: None (PR creation only)

- [ ] V17 [VERIFY] CI pipeline passes
  - **Do**: Monitor CI status after push
  - **Verify**: `gh pr checks` shows all green
  - **Done when**: CI pipeline passes
  - **Commit**: None

- [ ] V18 [VERIFY] AC checklist
  - **Do**: Programmatically verify each acceptance criterion is satisfied
  - **Verify**: Check for each AC:
    - AC-1.1: `grep -r "CreateInventoryItem" services/api/src/ && echo "AC-1.1 OK"`
    - AC-1.2: `grep -r "expiry_status" services/api/src/ && echo "AC-1.2 OK"`
    - AC-1.3: `grep -r "CreateEquipment" services/api/src/ && echo "AC-1.3 OK"`
    - AC-1.7: `grep -r "NINJA_COMBI_MODES" services/shared/ && echo "AC-1.7 OK"`
    - AC-2.1: `grep -r "CreateMealPlan" services/api/src/ && echo "AC-2.1 OK"`
    - AC-2.5: `grep -r "validate_constraints" services/workers/ && echo "AC-2.5 OK"`
    - AC-2.6: `grep -r "GeneratedMealPlan" services/workers/ && echo "AC-2.6 OK"`
    - AC-3.1: `grep -r "GroceryService" services/api/src/ && echo "AC-3.1 OK"`
    - AC-4.1: `grep -r "UpdateMealSlot" services/api/src/ && echo "AC-4.1 OK"`
    - AC-4.3: `grep -r "AdaptRequest" services/api/src/ && echo "AC-4.3 OK"`
  - **Done when**: All acceptance criteria confirmed met via automated checks
  - **Commit**: None

## Phase 6: PR Lifecycle

- [ ] 6.1 Monitor CI and fix failures
  - **Do**:
    1. Check PR CI status: `gh pr checks`
    2. If any check fails, read failure details
    3. Fix issues locally, push fixes
    4. Re-verify CI
  - **Verify**: `gh pr checks` shows all green
  - **Done when**: All CI checks pass
  - **Commit**: `fix: resolve CI failures` (if needed)

- [ ] 6.2 Address review comments
  - **Do**:
    1. Read PR review comments: `gh pr view --json reviews`
    2. Address each comment with code changes
    3. Push fixes
  - **Verify**: `gh pr checks` passes after fixes
  - **Done when**: All review comments addressed, CI green
  - **Commit**: `fix: address review feedback` (if needed)

- [ ] 6.3 Final validation
  - **Do**:
    1. Verify zero test regressions
    2. Verify code is modular/reusable
    3. Verify all CI checks green
    4. Verify feature branch is up to date with master
  - **Verify**: `gh pr checks && git log --oneline master..HEAD | wc -l`
  - **Done when**: PR mergeable with all checks passing
  - **Commit**: None

## Notes

- **POC shortcuts taken**: Auth middleware may use simplified JWT validation initially; LLM provider hardcoded to one choice; seed data limited to ~100 ingredients instead of 300; frontend error handling minimal
- **Production TODOs**: Full ingredient seed data (~300 items), proper JWKS caching, rate limiting on LLM calls, Playwright E2E tests with Aspire, OpenTelemetry instrumentation on all services
- **Key dependency chain**: shared pkg -> API/worker -> Aspire -> frontend -> infra -> CI
- **Phase distribution**: Phase 1 (~68 tasks, 55%), Phase 2 (~5 tasks, 8%), Phase 3 (~10 tasks, 16%), Phase 4-6 (~13 tasks, 21%)
