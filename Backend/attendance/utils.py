"""Utility helpers for resolving attendance metadata from requests."""
from __future__ import annotations

from decimal import Decimal
from typing import Dict, Mapping, MutableMapping, Optional

import json
from urllib.error import URLError
from urllib.request import urlopen

from django.http import HttpRequest

PRIVATE_IP_PREFIXES = (
    "127.",
    "10.",
    "192.168.",
    "172.16.",
    "172.17.",
    "172.18.",
    "172.19.",
    "172.20.",
    "172.21.",
    "172.22.",
    "172.23.",
    "172.24.",
    "172.25.",
    "172.26.",
    "172.27.",
    "172.28.",
    "172.29.",
    "172.30.",
    "172.31.",
    "::1",
)

IP_LOOKUP_URL = "https://ipapi.co/{ip}/json/"


def get_client_ip(request: HttpRequest) -> Optional[str]:
    """Return the best-effort client IP from the request headers."""

    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR")
    if ip:
        return ip
    return None


def get_client_device(
    request: HttpRequest,
    payload: Optional[Mapping[str, object]] = None,
) -> Dict[str, Optional[str]]:
    """Resolve device metadata from payload or headers."""

    payload = payload or {}
    device_id = (
        (payload.get("device_id") if payload else None)
        or request.headers.get("X-Device-Id")
        or request.META.get("HTTP_X_DEVICE_ID")
    )
    device_info = (
        (payload.get("device_info") if payload else None)
        or request.headers.get("User-Agent")
        or request.META.get("HTTP_USER_AGENT")
    )

    return {
        "device_id": str(device_id) if device_id else "",
        "device_info": str(device_info) if device_info else "",
    }


def _is_public_ip(ip: str) -> bool:
    return not any(ip.startswith(prefix) for prefix in PRIVATE_IP_PREFIXES)


def lookup_location_for_ip(ip: Optional[str]) -> Dict[str, object]:
    """Look up location metadata for the given IP address."""

    if not ip:
        return {}
    if not _is_public_ip(ip):
        return {}

    try:
        with urlopen(IP_LOOKUP_URL.format(ip=ip), timeout=2) as response:  # nosec: B310
            payload = json.loads(response.read().decode("utf-8"))
    except (URLError, TimeoutError, ValueError):
        return {}

    latitude = payload.get("latitude") or payload.get("lat")
    longitude = payload.get("longitude") or payload.get("lon")
    city = payload.get("city")
    region = payload.get("region") or payload.get("region_name")
    country = payload.get("country_name") or payload.get("country")

    location: Dict[str, object] = {}

    try:
        if latitude not in (None, ""):
            location["location_lat"] = Decimal(str(latitude))
        if longitude not in (None, ""):
            location["location_lng"] = Decimal(str(longitude))
    except Exception:  # pragma: no cover - invalid decimals are ignored
        location.pop("location_lat", None)
        location.pop("location_lng", None)

    address_parts = [part for part in [city, region, country] if part]
    if address_parts:
        location["location_address"] = ", ".join(address_parts)

    return location


def build_attendance_metadata(
    request: HttpRequest,
    payload: Optional[MutableMapping[str, object]] = None,
) -> Dict[str, object]:
    """Compose metadata dict for attendance records from request context."""

    payload = payload or {}

    ip_address = payload.get("ip_address") or get_client_ip(request)
    device = get_client_device(request, payload)

    metadata: Dict[str, object] = {
        "ip_address": ip_address,
        "device_id": device.get("device_id", ""),
        "device_info": device.get("device_info", ""),
        "location_lat": payload.get("location_lat"),
        "location_lng": payload.get("location_lng"),
        "location_address": payload.get("location_address", ""),
    }

    if not metadata.get("location_lat") or not metadata.get("location_lng"):
        lookup = lookup_location_for_ip(ip_address)
        for key, value in lookup.items():
            if not metadata.get(key):
                metadata[key] = value

    # Normalise empty strings to default blanks
    if metadata["location_address"] is None:
        metadata["location_address"] = ""
    if metadata["device_id"] is None:
        metadata["device_id"] = ""
    if metadata["device_info"] is None:
        metadata["device_info"] = ""

    return metadata
