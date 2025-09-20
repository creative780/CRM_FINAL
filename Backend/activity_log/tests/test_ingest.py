import base64
import json
import hmac
import hashlib
from datetime import datetime, timezone

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from activity_log.models import LogIngestionKey, ActivityEvent


def sign(secret: str, body: bytes) -> str:
    return base64.b64encode(hmac.new(secret.encode("utf-8"), body, hashlib.sha256).digest()).decode("ascii")


@pytest.mark.django_db
def test_ingest_hmac_idempotent():
    key = LogIngestionKey.objects.create(key_id="k1", name="test", secret="s1")
    client = APIClient()
    payload = {
        "timestamp": "2025-09-19T10:45:12Z",
        "tenant_id": "acme-001",
        "actor": {"id": None, "role": "SYSTEM"},
        "verb": "UPLOAD",
        "target": {"type": "File", "id": "f_1"},
        "source": "FRONTEND",
        "request_id": "req1",
        "context": {"filename": "x.pdf", "tags": ["design"]},
    }
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    resp = client.post(
        "/api/activity-logs/ingest",
        data=body,
        content_type="application/json",
        HTTP_X_LOG_KEY=key.key_id,
        HTTP_X_LOG_SIGNATURE=sign(key.secret, body),
        HTTP_X_REQUEST_ID="req1",
    )
    assert resp.status_code == 200
    stored_ids = resp.json()["storedIds"]
    assert len(stored_ids) == 1
    ev_id = stored_ids[0]
    # duplicate
    resp2 = client.post(
        "/api/activity-logs/ingest",
        data=body,
        content_type="application/json",
        HTTP_X_LOG_KEY=key.key_id,
        HTTP_X_LOG_SIGNATURE=sign(key.secret, body),
        HTTP_X_REQUEST_ID="req1",
    )
    assert resp2.status_code == 200
    assert resp2.json()["storedIds"][0] == ev_id
    assert ActivityEvent.objects.count() == 1

