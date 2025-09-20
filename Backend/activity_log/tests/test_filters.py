import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from activity_log.models import ActivityEvent


def auth_header(user):
    token = str(RefreshToken.for_user(user).access_token)
    return {"HTTP_AUTHORIZATION": f"Bearer {token}"}


@pytest.mark.django_db
def test_filters_q_and_tags():
    user = User.objects.create_user(username="admin", roles=["admin"]) 
    now = timezone.now()
    ActivityEvent.objects.create(timestamp=now, actor=user, actor_role="ADMIN", verb="COMMENT", target_type="Order", target_id="o1", context={"comment": "hello world", "tags": ["design"]}, source="API", request_id="r1", tenant_id="t1", hash="f"*64)
    ActivityEvent.objects.create(timestamp=now, actor=user, actor_role="ADMIN", verb="COMMENT", target_type="Order", target_id="o2", context={"comment": "bye", "tags": ["sales"]}, source="API", request_id="r2", tenant_id="t1", hash="e"*64)
    client = APIClient()
    resp = client.get("/api/activity-logs/?tenant_id=t1&q=hello&tags=design", **auth_header(user))
    assert resp.status_code == 200
    results = resp.json()["results"]
    assert len(results) == 1
    assert results[0]["target"]["id"] == "o1"

