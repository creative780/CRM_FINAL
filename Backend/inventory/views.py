from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from .models import InventoryItem, InventoryMovement
from .serializers import InventoryItemSerializer, InventoryAdjustSerializer
from accounts.permissions import RolePermission
from drf_spectacular.utils import extend_schema


class InventoryItemsView(APIView):
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'sales', 'designer', 'production', 'delivery', 'finance']
    @extend_schema(responses={200: InventoryItemSerializer(many=True)})
    def get(self, request):
        items = InventoryItem.objects.all().order_by('sku')
        return Response(InventoryItemSerializer(items, many=True).data)


class InventoryAdjustView(APIView):
    permission_classes = [RolePermission]
    allowed_roles = ['admin']
    @extend_schema(request=InventoryAdjustSerializer, responses={200: None})
    def post(self, request):
        s = InventoryAdjustSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = s.validated_data
        with transaction.atomic():
            item, _ = InventoryItem.objects.get_or_create(sku=data['sku'], defaults={'name': data['sku']})
            item.quantity = item.quantity + data['delta']
            item.save(update_fields=['quantity'])
            InventoryMovement.objects.create(order_id=None, sku=data['sku'], delta=data['delta'], reason=data['reason'])
        return Response({'ok': True})

# Create your views here.
