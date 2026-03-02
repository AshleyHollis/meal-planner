FROM python:3.11-slim AS builder
# Multi-stage build for smaller production image
# Build context: services/ (parent of api and shared)

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency management
RUN pip install uv

# Copy shared package first (for layer caching)
COPY shared/pyproject.toml /app/shared/pyproject.toml
COPY shared/shared/ /app/shared/shared/

# Copy API dependency files into api/ subdirectory
# so ../shared resolves to /app/shared (matching [tool.uv.sources])
COPY api/pyproject.toml /app/api/pyproject.toml

# Install shared package and API dependencies
WORKDIR /app/api
RUN uv pip install --system --prerelease=allow -e /app/shared
RUN uv pip install --system --prerelease=allow -e .

# ================================
# Stage 2: Production image
# ================================
FROM python:3.11-slim AS production

LABEL org.opencontainers.image.source="https://github.com/AshleyHollis/meal-planner"
LABEL org.opencontainers.image.description="Meal Planner API"

WORKDIR /app

# Install runtime dependencies (ODBC driver for SQL Server)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg2 \
    unixodbc \
    && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && echo "deb [arch=amd64,arm64 signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY shared/shared/ /app/shared/shared/
COPY api/src/ ./src/

# Copy Alembic migration files and seed data (used by migration job)
COPY shared/alembic.ini /app/shared/alembic.ini
COPY shared/alembic/ /app/shared/alembic/
COPY shared/seed/ /app/shared/seed/

# Set Python path
ENV PYTHONPATH="/app/src:/app/shared"

# Create non-root user
RUN useradd --create-home --shell /bin/bash appuser
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health/live || exit 1

# Run the application
CMD ["uvicorn", "src.api.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
