from rest_framework import serializers
from decimal import Decimal
from .models import (
    Order, OrderItem, Quotation, DesignStage, PrintingStage, 
    ApprovalStage, DeliveryStage, Upload
)


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            'id', 'product_id', 'name', 'sku', 'attributes', 
            'quantity', 'unit_price', 'line_total'
        ]
        read_only_fields = ['id', 'line_total']


class OrderItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['product_id', 'name', 'sku', 'attributes', 'quantity', 'unit_price']
    
    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1")
        return value


class QuotationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quotation
        fields = [
            'labour_cost', 'finishing_cost', 'paper_cost', 'machine_cost',
            'design_cost', 'delivery_cost', 'other_charges', 'discount', 'advance_paid',
            'quotation_notes', 'custom_field',
            'products_subtotal', 'other_subtotal', 'subtotal', 'vat_3pct', 
            'grand_total', 'remaining'
        ]
        read_only_fields = [
            'products_subtotal', 'other_subtotal', 'subtotal', 'vat_3pct', 
            'remaining'
        ]


class DesignStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = DesignStage
        fields = ['assigned_designer', 'requirements_files_manifest', 'design_status']


class PrintingStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrintingStage
        fields = ['print_operator', 'print_time', 'batch_info', 'print_status', 'qa_checklist']


class ApprovalStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalStage
        fields = ['client_approval_files', 'approved_at']


class DeliveryStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryStage
        fields = ['rider_photo_path', 'delivered_at']


class UploadSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    
    class Meta:
        model = Upload
        fields = ['id', 'kind', 'original_name', 'mime', 'size', 'url', 'created_at']
        read_only_fields = ['id', 'url', 'created_at']
    
    def get_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class OrderCreateSerializer(serializers.Serializer):
    """Serializer for creating orders - matches frontend contract"""
    clientName = serializers.CharField(max_length=255)
    companyName = serializers.CharField(max_length=255, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    specs = serializers.CharField(required=False, allow_blank=True)
    urgency = serializers.ChoiceField(choices=Order.URGENCY_CHOICES, default='Normal')
    items = OrderItemCreateSerializer(many=True)
    
    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required")
        return value


class OrderUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating order base fields"""
    items = OrderItemCreateSerializer(many=True, required=False)
    
    class Meta:
        model = Order
        fields = [
            'client_name', 'company_name', 'phone', 'email', 'address', 
            'specs', 'urgency', 'pricing_status', 'items'
        ]
    
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        
        # Update order fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update items if provided
        if items_data is not None:
            # Clear existing items and create new ones
            instance.items.all().delete()
            for item_data in items_data:
                OrderItem.objects.create(order=instance, **item_data)
        
        return instance


class OrderSerializer(serializers.ModelSerializer):
    """Main order serializer with nested relationships"""
    items = OrderItemSerializer(many=True, read_only=True)
    quotation = QuotationSerializer(read_only=True)
    design_stage = DesignStageSerializer(read_only=True)
    printing_stage = PrintingStageSerializer(read_only=True)
    approval_stage = ApprovalStageSerializer(read_only=True)
    delivery_stage = DeliveryStageSerializer(read_only=True)
    uploads = UploadSerializer(many=True, read_only=True)
    
    # Computed fields for frontend compatibility
    products = serializers.SerializerMethodField()
    lineItems = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_code', 'client_name', 'company_name', 'phone', 'email', 
            'address', 'specs', 'urgency', 'status', 'stage', 'pricing_status', 'delivery_code', 
            'delivered_at', 'created_at', 'updated_at',
            'items', 'products', 'lineItems',  # Frontend compatibility
            'quotation', 'design_stage', 'printing_stage', 'approval_stage', 
            'delivery_stage', 'uploads'
        ]
        read_only_fields = ['id', 'order_code', 'created_at', 'updated_at']
    
    def get_products(self, obj):
        """Alias for items - frontend compatibility"""
        return OrderItemSerializer(obj.items.all(), many=True).data
    
    def get_lineItems(self, obj):
        """Alias for items - frontend compatibility"""
        return OrderItemSerializer(obj.items.all(), many=True).data


class OrderListSerializer(serializers.ModelSerializer):
    """Simplified serializer for order lists"""
    items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_code', 'client_name', 'company_name', 'urgency', 
            'status', 'stage', 'created_at', 'items_count'
        ]
    
    def get_items_count(self, obj):
        return obj.items.count()


class StageTransitionSerializer(serializers.Serializer):
    """Serializer for stage transitions"""
    stage = serializers.ChoiceField(choices=Order.STAGE_CHOICES)
    payload = serializers.DictField(required=False, allow_empty=True)


class MarkPrintedSerializer(serializers.Serializer):
    """Serializer for mark printed action"""
    sku = serializers.CharField()
    qty = serializers.IntegerField(min_value=1)


class SendDeliveryCodeSerializer(serializers.Serializer):
    """Serializer for sending delivery codes"""
    code = serializers.CharField(max_length=6, min_length=6)
    phone = serializers.CharField(max_length=20)


class RiderPhotoUploadSerializer(serializers.Serializer):
    """Serializer for rider photo upload"""
    photo = serializers.ImageField()
    orderId = serializers.CharField()  # Accept as string, convert to int in view
    
    def validate_orderId(self, value):
        try:
            return int(value)
        except (ValueError, TypeError):
            raise serializers.ValidationError("Order ID must be a valid integer")

