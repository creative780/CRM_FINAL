import uuid

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from orders.models import Order


def _auth_client(role: str = 'admin') -> APIClient:
    """Create and authenticate an APIClient for the given role."""

    User = get_user_model()
    username = f"{role}_{uuid.uuid4().hex[:8]}"
    user = User.objects.create_user(username=username, password='pw', roles=[role])
    client = APIClient()
    login = client.post(
        '/api/auth/login',
        {'username': user.username, 'password': 'pw', 'role': role},
        format='json',
    )
    token = login.data['token']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


def _create_order(client: APIClient) -> int:
    resp = client.post(
        '/api/orders',
        {'clientName': 'Client', 'productType': 'Flyer'},
        format='json',
    )
    return resp.data['id']


@pytest.mark.django_db
def test_create_order_with_active_status_normalises_to_in_progress():
    client = _auth_client('admin')

    resp = client.post(
        '/api/orders',
        {
            'clientName': 'Client',
            'productType': 'Flyer',
            'status': 'Active',
        },
        format='json',
    )

    assert resp.status_code == 201
    order = Order.objects.get(id=resp.data['id'])
    assert order.status == 'in_progress'


@pytest.mark.django_db
def test_create_order_accepts_composite_status_labels():
    client = _auth_client('admin')

    resp = client.post(
        '/api/orders',
        {
            'clientName': 'Client',
            'productType': 'Flyer',
            'status': 'Active Orders',
        },
        format='json',
    )

    assert resp.status_code == 201
    order = Order.objects.get(id=resp.data['id'])
    assert order.status == 'in_progress'


@pytest.mark.django_db
def test_stage_patch_sets_active_status():
    client = _auth_client('admin')
    order_id = _create_order(client)

    resp = client.patch(
        f'/api/orders/{order_id}',
        {
            'stage': 'quotation',
            'payload': {
                'labour_cost': '12.5',
                'paper_cost': '4.0',
            },
        },
        format='json',
    )

    assert resp.status_code == 200
    order = Order.objects.get(id=order_id)
    assert order.stage == 'quotation'
    assert order.status == 'in_progress'


@pytest.mark.django_db
def test_delivery_stage_marks_completed_when_delivered():
    client = _auth_client('admin')
    order_id = _create_order(client)

    resp = client.patch(
        f'/api/orders/{order_id}',
        {
            'stage': 'delivery',
            'payload': {
                'delivery_code': 'CODE123',
                'delivery_status': 'Delivered',
                'delivered_at': '2025-01-01T00:00:00Z',
            },
        },
        format='json',
    )

    assert resp.status_code == 200
    order = Order.objects.get(id=order_id)
    assert order.stage == 'delivery'
    assert order.status == 'completed'


@pytest.mark.django_db
def test_delivery_stage_without_confirmation_stays_active():
    client = _auth_client('admin')
    order_id = _create_order(client)

    resp = client.patch(
        f'/api/orders/{order_id}',
        {
            'stage': 'delivery',
            'payload': {
                'delivery_code': 'CODE999',
                'delivery_status': 'Dispatched',
            },
        },
        format='json',
    )

    assert resp.status_code == 200
    order = Order.objects.get(id=order_id)
    assert order.status == 'in_progress'


@pytest.mark.django_db
def test_delivery_detail_patch_updates_status():
    client = _auth_client('admin')
    order_id = _create_order(client)

    initial = client.patch(
        f'/api/orders/{order_id}',
        {
            'stage': 'delivery',
            'payload': {
                'delivery_code': 'CODE777',
                'delivery_status': 'Dispatched',
            },
        },
        format='json',
    )
    assert initial.status_code == 200

    update = client.patch(
        f'/api/orders/{order_id}/delivery/',
        {
            'delivery_status': 'Delivered',
            'delivered_at': '2025-01-02T10:00:00Z',
        },
        format='json',
    )

    assert update.status_code == 200
    order = Order.objects.get(id=order_id)
    assert order.stage == 'delivery'
    assert order.status == 'completed'

