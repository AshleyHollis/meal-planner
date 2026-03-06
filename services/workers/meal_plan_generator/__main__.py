"""Meal plan generation worker - queue poller entry point."""

from __future__ import annotations

# Aspire sets SSL_CERT_DIR to its own OTEL cert dir which only contains the
# Aspire dashboard cert. This breaks TLS to external endpoints (Azure OpenAI).
# Remove it before any module imports that might cache SSL settings, and
# explicitly point SSL_CERT_FILE at the certifi CA bundle.
import os as _os

_os.environ.pop("SSL_CERT_DIR", None)

try:
    import certifi as _certifi

    _os.environ["SSL_CERT_FILE"] = _certifi.where()
except ImportError:
    pass

import asyncio
import contextlib
import signal
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

from shared.config import get_settings
from shared.db.connection import get_db
from shared.logging.config import configure_logging, get_logger
from shared.queue.client import get_queue_client, receive_messages

from .generator import generate_meal_plan

logger = get_logger(__name__)

_running = True


class _HealthHandler(BaseHTTPRequestHandler):
    """Minimal health check handler."""

    def do_GET(self) -> None:  # noqa: N802
        if self.path in ("/health", "/healthz"):
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"ok")
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format: str, *args: object) -> None:  # noqa: A002
        """Suppress default request logging."""


def _start_health_server(port: int = 8091) -> HTTPServer:
    """Start HTTP health endpoint in a daemon thread."""
    server = HTTPServer(("0.0.0.0", port), _HealthHandler)  # nosec B104
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    logger.info("health_server_started", port=port)
    return server


def _handle_shutdown(signum: int, frame: object) -> None:
    """Handle graceful shutdown on SIGTERM/SIGINT."""
    global _running  # noqa: PLW0603
    logger.info("shutdown_signal_received", signal=signum)
    _running = False


async def async_main() -> None:
    """Async worker loop: poll queue, process messages."""
    settings = get_settings()
    poll_interval = settings.queue.poll_interval

    # Warm up DB connection so it's bound to this event loop
    db = get_db()
    try:
        await db.connect()
        logger.info("database_connected")
    except Exception as exc:
        logger.warning("database_connect_failed", error=str(exc))

    # Ensure queue exists
    queue_client = get_queue_client()
    with contextlib.suppress(Exception):
        queue_client.create_queue()

    logger.info("worker_started", queue=settings.queue.meal_plan_queue)

    while _running:
        try:
            messages = receive_messages(max_messages=1, visibility_timeout=120)
            for msg in messages:
                try:
                    logger.info("message_received", message_id=msg["id"])
                    # Delete message BEFORE processing to prevent infinite retries.
                    # The generator has its own 3-attempt retry logic; failed plans
                    # get status="failed" in DB, so queue-level retries are redundant
                    # and cause stuck queues when plans can never succeed.
                    queue_client.delete_message(msg["id"], msg["pop_receipt"])
                    await generate_meal_plan(msg["content"])
                    logger.info("plan_generated", message_id=msg["id"])
                except Exception as e:
                    logger.error("plan_generation_failed", message_id=msg["id"], error=str(e))
        except Exception as e:
            logger.error("poll_error", error=str(e))

        await asyncio.sleep(poll_interval)

    await db.close()
    logger.info("worker_stopped")


def main() -> None:
    """Worker entry point: configure, start health server, run async loop."""
    configure_logging(service_name="meal-plan-worker")

    signal.signal(signal.SIGINT, _handle_shutdown)
    signal.signal(signal.SIGTERM, _handle_shutdown)

    health_server = _start_health_server()

    try:
        asyncio.run(async_main())
    finally:
        health_server.shutdown()


if __name__ == "__main__":
    main()
