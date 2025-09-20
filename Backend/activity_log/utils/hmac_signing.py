from __future__ import annotations

import base64
import hmac
import hashlib


def compute_hmac_sha256(secret: str, payload: bytes) -> str:
    mac = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).digest()
    return base64.b64encode(mac).decode("ascii")


def verify_hmac_sha256(secret: str, payload: bytes, signature_b64: str) -> bool:
    try:
        expected = compute_hmac_sha256(secret, payload)
        return hmac.compare_digest(expected, signature_b64)
    except Exception:
        return False

