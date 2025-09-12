import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_login_and_me():
    User = get_user_model()
    u = User.objects.create_user(username='tester', password='pw', roles=['admin'])
    c = APIClient()
    resp = c.post('/api/auth/login', {'username': 'tester', 'password': 'pw', 'role': 'admin'}, format='json')
    assert resp.status_code == 200
    token = resp.data['token']
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    me = c.get('/api/auth/me')
    assert me.status_code == 200
    assert me.data['username'] == 'tester'


@pytest.mark.django_db
def test_orders_stage_rbac_denied_for_sales_on_printing():
    User = get_user_model()
    sales = User.objects.create_user(username='sales', password='pw', roles=['sales'])
    c = APIClient()
    login = c.post('/api/auth/login', {'username': 'sales', 'password': 'pw', 'role': 'sales'}, format='json')
    token = login.data['token']
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    order = c.post('/api/orders', {'clientName': 'A', 'productType': 'Flyer', 'specs': '', 'urgency': ''}, format='json')
    assert order.status_code == 201
    oid = order.data['id']
    patch = c.patch(f'/api/orders/{oid}', {'stage': 'printing', 'payload': {'print_operator': 'X'}}, format='json')
    assert patch.status_code == 403

