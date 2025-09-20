from __future__ import annotations

import base64
import json
import time
import uuid
from dataclasses import dataclass
from typing import Any, Dict, Iterable, Optional

import requests


def _hmac_sha256_b64(secret: str, payload: bytes) -> str:
    import hmac, hashlib

    return base64.b64encode(hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).digest()).decode("ascii")


@dataclass
class ActivityLogsClient:
    base_url: str
    key_id: str
    secret: str
    timeout: int = 10

    def _headers(self, body: bytes, request_id: Optional[str]) -> Dict[str, str]:
        sig = _hmac_sha256_b64(self.secret, body)
        headers = {
            "Content-Type": "application/json",
            "X-Log-Key": self.key_id,
            "X-Log-Signature": sig,
        }
        if request_id:
            headers["X-Request-Id"] = request_id
        return headers

    def ingest(self, event: Dict[str, Any], request_id: Optional[str] = None, retries: int = 3, backoff: float = 0.5) -> Dict[str, Any]:
        body = json.dumps(event, separators=(",", ":")).encode("utf-8")
        rid = request_id or event.get("request_id") or f"req_{uuid.uuid4().hex}"
        url = f"{self.base_url.rstrip('/')}/api/activity-logs/ingest"
        for attempt in range(retries):
            try:
                resp = requests.post(url, data=body, headers=self._headers(body, rid), timeout=self.timeout)
                if resp.status_code >= 500:
                    raise RuntimeError(f"server error {resp.status_code}")
                resp.raise_for_status()
                return resp.json()
            except Exception:
                if attempt == retries - 1:
                    raise
                time.sleep(backoff * (2**attempt))

    def ingest_bulk(self, events: Iterable[Dict[str, Any]], request_id: Optional[str] = None) -> Dict[str, Any]:
        arr = list(events)
        body = json.dumps(arr, separators=(",", ":")).encode("utf-8")
        rid = request_id or f"req_{uuid.uuid4().hex}"
        url = f"{self.base_url.rstrip('/')}/api/activity-logs/ingest"
        resp = requests.post(url, data=body, headers=self._headers(body, rid), timeout=self.timeout)
        resp.raise_for_status()
        return resp.json()

