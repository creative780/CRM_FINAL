"""Network utility helpers for attendance device tracking."""
from __future__ import annotations

from functools import lru_cache
from typing import Optional
import socket
import threading

# Reverse DNS requests should be quick so they don't block the request cycle
# for too long.
DEFAULT_DNS_TIMEOUT = 1.0

_socket_timeout_lock = threading.Lock()


def get_client_ip(request) -> Optional[str]:
    """Return the originating client IP address if present."""

    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
        if ip:
            return ip
    ip = request.META.get("REMOTE_ADDR")
    return ip or None


@lru_cache(maxsize=2048)  # Cache reverse DNS lookups to keep repeat calls fast.
def rdns(ip: str) -> str | None:
    """Return the reverse DNS hostname for the given IP, if resolvable."""

    # ``socket.setdefaulttimeout`` is process-wide; guard it with a lock so we
    # do not race concurrent requests.
    with _socket_timeout_lock:
        previous_timeout = socket.getdefaulttimeout()
        socket.setdefaulttimeout(DEFAULT_DNS_TIMEOUT)
        try:
            hostname, _, _ = socket.gethostbyaddr(ip)
            return hostname
        except Exception:
            # Reverse DNS regularly fails on public networks; treat it as an
            # optional enhancement instead of an error.
            return None
        finally:
            socket.setdefaulttimeout(previous_timeout)


def resolve_client_hostname(ip: Optional[str]) -> Optional[str]:
    """Resolve the client's hostname via reverse DNS if possible."""

    if not ip:
        return None
    return rdns(ip) or None
