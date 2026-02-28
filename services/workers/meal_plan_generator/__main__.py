"""Meal plan generation worker - queue poller entry point."""

from __future__ import annotations

import contextlib
import signal
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

from shared.config import get_settings
from shared.logging.config import configure_logging, get_logger
from shared.queue.client import get_queue_client, receive_messages

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
    server = HTTPServer(("0.0.0.0", port), _HealthHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    logger.info("health_server_started", port=port)
    return server


def _handle_shutdown(signum: int, frame: object) -> None:
    """Handle graceful shutdown on SIGTERM/SIGINT."""
    global _running  # noqa: PLW0603
    logger.info("shutdown_signal_received", signal=signum)
    _running = False


def main() -> None:
    """Worker entry point: configure, poll queue, process messages."""
    configure_logging(service_name="meal-plan-worker")

    settings = get_settings()
    poll_interval = settings.queue.poll_interval

    # Graceful shutdown
    signal.signal(signal.SIGINT, _handle_shutdown)
    signal.signal(signal.SIGTERM, _handle_shutdown)

    # Health endpoint
    health_server = _start_health_server()

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
                    # TODO: wire up generate_meal_plan in a later task
                    logger.info("message_received", message_id=msg["id"])
                    # Delete message on success
                    queue_client.delete_message(msg["id"], msg["pop_receipt"])
                    logger.info("plan_generated", message_id=msg["id"])
                except Exception as e:
                    logger.error("plan_generation_failed", message_id=msg["id"], error=str(e))
                    # Message becomes visible again after visibility timeout
        except Exception as e:
            logger.error("poll_error", error=str(e))

        time.sleep(poll_interval)

    health_server.shutdown()
    logger.info("worker_stopped")


if __name__ == "__main__":
    main()
