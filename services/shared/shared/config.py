"""Pydantic settings for application configuration."""

import os
from functools import lru_cache
from typing import Literal
from urllib.parse import quote_plus

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class DatabaseSettings(BaseSettings):
    """Database connection settings.

    Supports multiple environment variable formats:
    1. DATABASE_URL - Standard SQLAlchemy URL
    2. ConnectionStrings__mealplanner - .NET Aspire connection string (ADO.NET format)
    3. ConnectionStrings__sql - .NET Aspire SQL Server connection string
    """

    model_config = SettingsConfigDict(env_prefix="DATABASE_")

    url: str = Field(
        default="",
        description="Database connection URL",
    )
    pool_size: int = Field(
        default=5,
        ge=1,
        le=100,
        description="Connection pool size",
    )
    max_overflow: int = Field(
        default=10,
        ge=0,
        le=100,
        description="Max connections beyond pool size",
    )
    echo: bool = Field(
        default=False,
        description="Echo SQL statements",
    )

    @property
    def effective_url(self) -> str:
        """Get the effective database URL, checking Aspire env vars if needed.

        Aspire injects SQL Server connection strings in ADO.NET format:
        Server=localhost,port;Database=name;User Id=sa;Password=xxx;TrustServerCertificate=True

        This converts to SQLAlchemy format:
        mssql+pyodbc://sa:password@localhost/database?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes&port=1433
        """
        if self.url:
            if self.url.startswith("Server=") or (
                ";" in self.url and "=" in self.url and "://" not in self.url
            ):
                return _convert_ado_to_sqlalchemy(self.url)
            return self.url

        aspire_conn = (
            os.environ.get("ConnectionStrings__mealplanner")  # noqa: SIM112 - .NET Aspire convention
            or os.environ.get("ConnectionStrings__sql")  # noqa: SIM112 - .NET Aspire convention
            or ""
        )

        if not aspire_conn:
            return ""

        return _convert_ado_to_sqlalchemy(aspire_conn)


class AzureStorageSettings(BaseSettings):
    """Azure Storage settings.

    Supports multiple environment variable formats:
    1. AZURE_STORAGE_CONNECTION_STRING - Standard Azure SDK format
    2. ConnectionStrings__storage - .NET Aspire storage connection string
    """

    model_config = SettingsConfigDict(env_prefix="AZURE_STORAGE_")

    connection_string: str = Field(
        default="",
        description="Azure Storage connection string",
    )

    @property
    def effective_connection_string(self) -> str:
        """Get the effective connection string, checking Aspire env vars if needed."""
        if self.connection_string:
            return self.connection_string
        return os.environ.get("ConnectionStrings__storage") or ""  # noqa: SIM112 - .NET Aspire convention


class LLMSettings(BaseSettings):
    """LLM provider settings.

    Supports both Anthropic and OpenAI via LLM_PROVIDER toggle.
    """

    model_config = SettingsConfigDict(env_prefix="LLM_")

    api_key: str = Field(
        default="",
        description="LLM API key (Anthropic or OpenAI)",
    )
    provider: Literal["anthropic", "openai"] = Field(
        default="anthropic",
        description="LLM provider to use",
    )


class AuthSettings(BaseSettings):
    """Auth0 configuration settings."""

    model_config = SettingsConfigDict(env_prefix="AUTH0_")

    domain: str = Field(
        default="",
        description="Auth0 domain (e.g., tenant.auth0.com)",
    )
    client_id: str = Field(
        default="",
        description="Auth0 application client ID",
    )
    client_secret: str = Field(
        default="",
        description="Auth0 application client secret",
    )


class QueueSettings(BaseSettings):
    """Queue settings for the meal plan generator worker."""

    model_config = SettingsConfigDict(env_prefix="")

    meal_plan_queue: str = Field(
        default="meal-plan-jobs",
        description="Queue name for meal plan generation jobs",
    )
    visibility_timeout: int = Field(
        default=300,
        ge=1,
        description="Message visibility timeout in seconds",
    )
    poll_interval: float = Field(
        default=10.0,
        gt=0,
        description="Seconds between queue polls when empty",
    )
    batch_size: int = Field(
        default=32,
        ge=1,
        le=32,
        description="Number of messages to fetch per poll (Azure max: 32)",
    )


class Settings(BaseSettings):
    """Main application settings."""

    model_config = SettingsConfigDict(
        env_prefix="",
        env_nested_delimiter="__",
    )

    service_name: str = Field(
        default="meal-planner",
        description="Service name for logging",
    )
    environment: Literal["development", "staging", "production"] = Field(
        default="development",
        description="Deployment environment",
    )

    # Nested settings
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    storage: AzureStorageSettings = Field(default_factory=AzureStorageSettings)
    llm: LLMSettings = Field(default_factory=LLMSettings)
    auth: AuthSettings = Field(default_factory=AuthSettings)
    queue: QueueSettings = Field(default_factory=QueueSettings)

    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.environment == "development"

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.environment == "production"


def _convert_ado_to_sqlalchemy(ado_conn: str) -> str:
    """Convert ADO.NET connection string to SQLAlchemy async URL.

    ADO.NET format:
        Server=localhost,1433;Database=mealplanner;User Id=sa;Password=xxx;TrustServerCertificate=True

    SQLAlchemy format:
        mssql+pyodbc://sa:password@localhost/mealplanner?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes&port=1433
    """
    parts: dict[str, str] = {}
    for part in ado_conn.split(";"):
        if "=" in part:
            key, value = part.split("=", 1)
            parts[key.strip().lower()] = value.strip()

    server = parts.get("server", "localhost")
    database = parts.get("database") or parts.get("initial catalog", "mealplanner")
    user = parts.get("user id", "sa")
    password = parts.get("password", "")

    if server.startswith("tcp:"):
        server = server[4:]
    if "," in server:
        host, port = server.split(",", 1)
    else:
        host = server
        port = "1433"

    encoded_password = quote_plus(password)
    return (
        f"mssql+pyodbc://{user}:{encoded_password}@{host}/{database}"
        f"?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes&port={port}"
    )


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


def refresh_settings() -> Settings:
    """Clear settings cache and return fresh settings."""
    get_settings.cache_clear()
    return get_settings()
