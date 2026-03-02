"""Correlation ID middleware for request tracing."""

import uuid

from shared.logging import bind_context, clear_context, set_correlation_id
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

CORRELATION_HEADER = "X-Correlation-ID"


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Generate or propagate a correlation ID for every request."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        correlation_id = request.headers.get(CORRELATION_HEADER) or str(uuid.uuid4())

        # Bind to shared logging module and structlog context
        set_correlation_id(correlation_id)
        bind_context(correlation_id=correlation_id)

        try:
            response = await call_next(request)
            response.headers[CORRELATION_HEADER] = correlation_id
            return response
        finally:
            set_correlation_id(None)
            clear_context()
