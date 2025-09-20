from __future__ import annotations

import hashlib
import json
from typing import Any, Dict


def canonical_json(data: Dict[str, Any]) -> str:
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_hex(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def compute_event_hash(event: Dict[str, Any]) -> str:
    canon = canonical_json(event)
    return sha256_hex(canon)

