import json
import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from activity_log.models import ActivityEvent
from django.utils import timezone


def auth_header(user):
    token = str(RefreshToken.for_user(user).access_token)
    return {"HTTP_AUTHORIZATION": f"Bearer {token}"}


@pytest.mark.django_db
def test_rbac_scopes():
    # users with roles
    admin = User.objects.create_user(username="admin", password="x", roles=["admin"]) 
    sales = User.objects.create_user(username="sales", password="x", roles=["sales"]) 
    designer = User.objects.create_user(username="designer", password="x", roles=["designer"]) 
    prod = User.objects.create_user(username="prod", password="x", roles=["production"]) 

    now = timezone.now()
    # Events
    ActivityEvent.objects.create(timestamp=now, actor=sales, actor_role="SALES", verb="CREATE", target_type="Order", target_id="o1", context={}, source="API", request_id="r1", tenant_id="t1", hash="0"*64)
    ActivityEvent.objects.create(timestamp=now, actor=designer, actor_role="DESIGNER", verb="UPLOAD", target_type="File", target_id="f1", context={}, source="API", request_id="r2", tenant_id="t1", hash="1"*64)
    ActivityEvent.objects.create(timestamp=now, actor=prod, actor_role="PRODUCTION", verb="UPDATE", target_type="Machine", target_id="m1", context={}, source="API", request_id="r3", tenant_id="t1", hash="2"*64)
    ActivityEvent.objects.create(timestamp=now, actor=None, actor_role="SYSTEM", verb="STATUS_CHANGE", target_type="QA", target_id="q1", context={}, source="WORKER", request_id="r4", tenant_id="t1", hash="3"*64)

    client = APIClient()
    # Admin sees all
    resp = client.get("/api/activity-logs/?tenant_id=t1", **auth_header(admin))
    assert resp.status_code == 200
    assert len(resp.json()["results"]) == 4
    # Sales sees Order + own
    resp = client.get("/api/activity-logs/?tenant_id=t1", **auth_header(sales))
    assert resp.status_code == 200
    sales_ids = {r["target"]["type"] for r in resp.json()["results"]}
    assert "Order" in sales_ids
    # Designer sees File + own
    resp = client.get("/api/activity-logs/?tenant_id=t1", **auth_header(designer))
    assert resp.status_code == 200
    design_ids = {r["target"]["type"] for r in resp.json()["results"]}
    assert "File" in design_ids

