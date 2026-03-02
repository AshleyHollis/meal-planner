FROM python:3.11-slim AS builder
# Multi-stage build for smaller production image
# Build context: services/ (parent of workers and shared)

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

# Copy worker dependency files into workers/ subdirectory
# so ../shared resolves to /app/shared (matching [tool.uv.sources])
COPY workers/pyproject.toml /app/workers/pyproject.toml

# Install shared package and worker dependencies
WORKDIR /app/workers
RUN uv pip install --system --prerelease=allow -e /app/shared
RUN uv pip install --system --prerelease=allow -e .

# ================================
# Stage 2: Production image
# ================================
FROM python:3.11-slim AS production

LABEL org.opencontainers.image.source="https://github.com/AshleyHollis/meal-planner"
LABEL org.opencontainers.image.description="Meal Planner Worker - Meal Plan Generator"

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
COPY workers/meal_plan_generator/ ./meal_plan_generator/
COPY workers/worker_utils/ ./worker_utils/

# Set Python path
ENV PYTHONPATH="/app:/app/shared"

# Create non-root user
RUN useradd --create-home --shell /bin/bash appuser
USER appuser

# Run the worker
CMD ["python", "-m", "meal_plan_generator"]
