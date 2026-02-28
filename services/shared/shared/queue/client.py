"""Azure Queue Storage client wrapper.

Provides queue operations for the meal plan generation worker,
supporting both Azure Queue Storage and Azurite for local development.
"""

from __future__ import annotations

import json
from typing import Any

from azure.storage.queue import BinaryBase64DecodePolicy, BinaryBase64EncodePolicy, QueueClient

# Azurite default connection string for local development
AZURITE_CONNECTION_STRING = (
    "DefaultEndpointsProtocol=http;"
    "AccountName=devstoreaccount1;"
    "AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/"
    "K1SZFPTOtr/KBHBeksoGMGw==;"
    "QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1"
)


def _resolve_connection_string(connection_string: str | None = None) -> str:
    """Resolve connection string, falling back to config settings then Azurite."""
    if connection_string:
        return connection_string

    from shared.config import get_settings

    effective = get_settings().storage.effective_connection_string
    if effective:
        return effective

    return AZURITE_CONNECTION_STRING


def get_queue_client(
    queue_name: str | None = None,
    connection_string: str | None = None,
) -> QueueClient:
    """Create an Azure Queue Storage client.

    Args:
        queue_name: Queue name. Defaults to config's meal_plan_queue setting.
        connection_string: Azure Storage connection string.
            Falls back to config settings, then Azurite default.

    Returns:
        Configured QueueClient instance.
    """
    from shared.config import get_settings

    resolved_conn = _resolve_connection_string(connection_string)
    resolved_queue = queue_name or get_settings().queue.meal_plan_queue

    return QueueClient.from_connection_string(
        conn_str=resolved_conn,
        queue_name=resolved_queue,
        message_encode_policy=BinaryBase64EncodePolicy(),
        message_decode_policy=BinaryBase64DecodePolicy(),
    )


def enqueue_message(
    message: dict[str, Any] | str,
    queue_name: str | None = None,
    connection_string: str | None = None,
    time_to_live: int | None = None,
    visibility_timeout: int | None = None,
) -> dict[str, Any]:
    """Send a message to the queue.

    Args:
        message: Message content (dict will be JSON-serialized).
        queue_name: Target queue name (defaults to config).
        connection_string: Azure Storage connection string (defaults to config).
        time_to_live: Message TTL in seconds (None = 7 days default).
        visibility_timeout: Initial visibility timeout in seconds.

    Returns:
        Send receipt with message id and pop receipt.
    """
    client = get_queue_client(queue_name, connection_string)

    if isinstance(message, dict):
        content = json.dumps(message).encode("utf-8")
    else:
        content = message.encode("utf-8")

    kwargs: dict[str, Any] = {}
    if time_to_live is not None:
        kwargs["time_to_live"] = time_to_live
    if visibility_timeout is not None:
        kwargs["visibility_timeout"] = visibility_timeout

    result = client.send_message(content, **kwargs)
    return {
        "id": result["id"],
        "pop_receipt": result["pop_receipt"],
        "insertion_time": str(result.get("insertion_time", "")),
        "expiration_time": str(result.get("expiration_time", "")),
    }


def receive_messages(
    queue_name: str | None = None,
    connection_string: str | None = None,
    max_messages: int | None = None,
    visibility_timeout: int | None = None,
) -> list[dict[str, Any]]:
    """Receive messages from the queue.

    Args:
        queue_name: Source queue name (defaults to config).
        connection_string: Azure Storage connection string (defaults to config).
        max_messages: Max messages to receive (defaults to config batch_size).
        visibility_timeout: Visibility timeout in seconds (defaults to config).

    Returns:
        List of message dicts with id, pop_receipt, content, and dequeue_count.
    """
    from shared.config import get_settings

    settings = get_settings()
    client = get_queue_client(queue_name, connection_string)

    messages_per_page = max_messages or settings.queue.batch_size
    vis_timeout = visibility_timeout or settings.queue.visibility_timeout

    raw_messages = client.receive_messages(
        messages_per_page=messages_per_page,
        visibility_timeout=vis_timeout,
    )

    results: list[dict[str, Any]] = []
    for msg in raw_messages:
        content = msg.content
        if isinstance(content, bytes):
            content = content.decode("utf-8")

        # Try to parse as JSON
        try:
            parsed = json.loads(content)
        except (json.JSONDecodeError, TypeError):
            parsed = content

        results.append(
            {
                "id": msg.id,
                "pop_receipt": msg.pop_receipt,
                "content": parsed,
                "dequeue_count": msg.dequeue_count,
                "insertion_time": str(msg.insertion_time) if msg.insertion_time else "",
            }
        )

    return results
