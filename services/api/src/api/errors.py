"""Structured error handling with correlation ID."""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from shared.logging import get_correlation_id, get_logger
from starlette.exceptions import HTTPException as StarletteHTTPException

log = get_logger(__name__)


def _error_response(
    status_code: int,
    error: str,
    detail: Any = None,
) -> JSONResponse:
    """Build a consistent error response with correlation ID."""
    body: dict[str, Any] = {
        "error": error,
        "status_code": status_code,
        "correlation_id": get_correlation_id(),
    }
    if detail is not None:
        body["detail"] = detail
    return JSONResponse(status_code=status_code, content=jsonable_encoder(body))


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle HTTPException (404, 409, etc.) with structured response."""
    log.warning("http_error", status_code=exc.status_code, detail=exc.detail)
    return _error_response(
        status_code=exc.status_code,
        error=_status_phrase(exc.status_code),
        detail=exc.detail,
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle 422 validation errors with structured response."""
    log.warning("validation_error", errors=exc.errors())
    return _error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        error="Validation Error",
        detail=exc.errors(),
    )


async def internal_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unhandled exceptions as 500 with correlation ID."""
    log.error("unhandled_exception", exc_info=exc)
    return _error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        error="Internal Server Error",
    )


def register_error_handlers(app: FastAPI) -> None:
    """Register all exception handlers on the app."""
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, internal_exception_handler)


def _status_phrase(code: int) -> str:
    """Return a human-readable phrase for common HTTP status codes."""
    phrases = {
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        409: "Conflict",
        422: "Unprocessable Entity",
        500: "Internal Server Error",
    }
    return phrases.get(code, "Error")
