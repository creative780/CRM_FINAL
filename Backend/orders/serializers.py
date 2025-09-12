from rest_framework import serializers
from .models import Order, OrderQuotation, OrderDesign, OrderPrint, OrderApproval, OrderDelivery


class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['id', 'order_id', 'client_name', 'product_type', 'specs', 'urgency', 'status', 'stage', 'created_at']


class OrderIntakeSerializer(serializers.Serializer):
    clientName = serializers.CharField()
    productType = serializers.CharField()
    specs = serializers.CharField(allow_blank=True, required=False)
    urgency = serializers.CharField(allow_blank=True, required=False)


REQUIRED_FIELDS = {
    'quotation': ['labour_cost', 'paper_cost'],
    'design': ['assigned_designer'],
    'printing': ['print_operator'],
    'approval': [],
    'delivery': [],
}


class StagePatchSerializer(serializers.Serializer):
    stage = serializers.ChoiceField(choices=list(REQUIRED_FIELDS.keys()))
    payload = serializers.DictField()

