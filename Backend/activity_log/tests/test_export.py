import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from activity_log.models import ActivityEvent
from django.test.utils import override_settings


def auth_header(user):
    token = str(RefreshToken.for_user(user).access_token)
    return {"HTTP_AUTHORIZATION": f"Bearer {token}"}


@pytest.mark.django_db
@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
def test_export_job_lifecycle(tmp_path, settings):
    settings.EXPORTS_DIR = str(tmp_path)
    user = User.objects.create_user(username="admin", roles=["admin"]) 
    now = timezone.now()
    ActivityEvent.objects.create(timestamp=now, actor=user, actor_role="ADMIN", verb="CREATE", target_type="Order", target_id="o1", context={"severity": "info"}, source="API", request_id="ra", tenant_id="t1", hash="a"*64)
    client = APIClient()
    resp = client.post("/api/activity-logs/export", {"format": "NDJSON", "filters": {"tenant_id": "t1"}}, format='json', **auth_header(user))
    assert resp.status_code in (200, 202)
    job_id = resp.json().get("jobId")
    # fetch status
    resp2 = client.get(f"/api/activity-logs/exports/{job_id}", **auth_header(user))
    assert resp2.status_code == 200
    data = resp2.json()
    assert data["status"] in ("PENDING", "RUNNING", "COMPLETED")

