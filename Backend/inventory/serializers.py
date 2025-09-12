from rest_framework import serializers
from .models import InventoryItem, InventoryMovement


class InventoryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryItem
        fields = ['sku', 'name', 'quantity', 'unit']


class InventoryAdjustSerializer(serializers.Serializer):
    sku = serializers.CharField()
    delta = serializers.IntegerField()
    reason = serializers.CharField()

