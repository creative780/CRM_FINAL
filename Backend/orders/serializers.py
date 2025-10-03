from rest_framework import serializers
from decimal import Decimal
from .models import (
    Order, OrderItem, Quotation, DesignStage, PrintingStage, 
    ApprovalStage, DeliveryStage, Upload, DesignApproval,
    ProductMachineAssignment, OrderFile
)


class OrderItemSerializer(serializers.ModelSerializer):
    customRequirements = serializers.CharField(source='custom_requirements', read_only=True)
    
    class Meta:
        model = OrderItem
        fields = [
            'id', 'product_id', 'name', 'sku', 'attributes', 
            'quantity', 'unit_price', 'line_total', 'custom_requirements', 'customRequirements',
            'design_ready', 'design_need_custom', 'design_files_manifest',
            'design_completed_at', 'design_commented_by'
        ]
        read_only_fields = ['id', 'line_total']


class OrderItemCreateSerializer(serializers.ModelSerializer):
    customRequirements = serializers.CharField(source='custom_requirements', required=False, allow_blank=True)
    
    class Meta:
        model = OrderItem
        fields = [
            'product_id', 'name', 'sku', 'attributes', 'quantity', 'unit_price', 
            'custom_requirements', 'customRequirements',
            'design_ready', 'design_need_custom', 'design_files_manifest',
            'design_completed_at', 'design_commented_by'
        ]
    
    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1")
        return value
    
    def validate_design_files_manifest(self, value):
        """Validate that design files are mandatory for products requiring design"""
        # Check if this is a context where design files are required
        # Only enforce validation during design production or later stages
        order = self.context.get('order')
        if order:
            # Only require design files for design production stage and later
            design_required_stages = ['design_production', 'printing', 'approval', 'delivery', 'completed']
            if order.stage in design_required_stages:
                if not value or len(value) == 0:
                    raise serializers.ValidationError("Design files are mandatory for all products at this stage. Please upload at least one design file.")
        return value


class QuotationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quotation
        fields = [
            'labour_cost', 'finishing_cost', 'paper_cost', 'machine_cost',
            'design_cost', 'delivery_cost', 'other_charges', 'discount',
            'advance_paid', 'quotation_notes', 'custom_field', 'sales_person',
            'products_subtotal', 'other_subtotal', 'subtotal', 'vat_3pct',
            'grand_total', 'remaining'
        ]


class DesignStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = DesignStage
        fields = ['assigned_designer', 'requirements_files_manifest', 'design_status', 'internal_comments']


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


# New serializers for workflow models

class DesignApprovalSerializer(serializers.ModelSerializer):
    """Serializer for design approval requests"""
    order_code = serializers.CharField(source='order.order_code', read_only=True)
    client_name = serializers.CharField(source='order.client_name', read_only=True)
    
    class Meta:
        model = DesignApproval
        fields = [
            'id', 'order', 'order_code', 'client_name',
            'designer', 'sales_person', 'approval_status',
            'design_files_manifest', 'approval_notes', 'rejection_reason',
            'submitted_at'
        ]
        read_only_fields = ['id', 'submitted_at']


class DesignApprovalCreateSerializer(serializers.Serializer):
    """Serializer for creating design approval requests"""
    designer = serializers.CharField()
    sales_person = serializers.CharField()
    design_files_manifest = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list
    )
    approval_notes = serializers.CharField(required=False, allow_blank=True)


class ApproveDesignSerializer(serializers.Serializer):
    """Serializer for approving or rejecting designs"""
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        if data['action'] == 'reject' and not data.get('rejection_reason'):
            raise serializers.ValidationError({
                'rejection_reason': 'Rejection reason is required when rejecting a design'
            })
        return data


class ProductMachineAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for machine assignments"""
    order_code = serializers.CharField(source='order.order_code', read_only=True)
    
    class Meta:
        model = ProductMachineAssignment
        fields = [
            'id', 'order', 'order_code', 'product_name', 'product_sku',
            'product_quantity', 'machine_id', 'machine_name',
            'estimated_time_minutes', 'started_at', 'completed_at', 'status', 'assigned_by', 'notes'
        ]
        read_only_fields = ['id']


class MachineAssignmentCreateSerializer(serializers.Serializer):
    """Serializer for creating machine assignments"""
    product_name = serializers.CharField()
    product_sku = serializers.CharField(required=False, allow_blank=True)
    product_quantity = serializers.IntegerField(min_value=1)
    machine_id = serializers.CharField()
    machine_name = serializers.CharField()
    estimated_time_minutes = serializers.IntegerField(min_value=1)
    assigned_by = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class OrderFileSerializer(serializers.ModelSerializer):
    """Serializer for order files"""
    order_code = serializers.CharField(source='order.order_code', read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderFile
        fields = [
            'id', 'order', 'order_code', 'file', 'file_url', 'file_name',
            'file_type', 'file_size', 'mime_type', 'uploaded_by',
            'uploaded_by_role', 'uploaded_at', 'stage', 'visible_to_roles',
            'description', 'product_related'
        ]
        read_only_fields = ['id', 'uploaded_at']
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class FileUploadSerializer(serializers.Serializer):
    """Serializer for file uploads"""
    file = serializers.FileField()
    file_type = serializers.ChoiceField(choices=OrderFile.FILE_TYPE_CHOICES)
    stage = serializers.CharField()
    description = serializers.CharField(required=False, allow_blank=True)
    product_related = serializers.CharField(required=False, allow_blank=True)
    visible_to_roles = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )


class OrderCreateSerializer(serializers.Serializer):
    """Serializer for creating orders - matches frontend contract"""
    clientName = serializers.CharField(max_length=255)
    companyName = serializers.CharField(max_length=255, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    trn = serializers.CharField(max_length=50, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    specs = serializers.CharField(required=False, allow_blank=True)
    urgency = serializers.ChoiceField(choices=Order.URGENCY_CHOICES, default='Normal')
    salesPerson = serializers.CharField(max_length=255, required=False, allow_blank=True)
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
            'client_name', 'company_name', 'phone', 'trn', 'email', 'address',
            'specs', 'urgency', 'pricing_status', 'items',
            'assigned_sales_person', 'assigned_designer', 'assigned_production_person',
            'internal_notes'
        ]
    
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        
        # Update order fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update items if provided and not empty
        if items_data is not None and len(items_data) > 0:
            # Clear existing items and create new ones
            instance.items.all().delete()
            for item_data in items_data:
                # Pass order context for validation
                item_serializer = OrderItemCreateSerializer(data=item_data, context={'order': instance})
                item_serializer.is_valid(raise_exception=True)
                OrderItem.objects.create(order=instance, **item_serializer.validated_data)
        
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
    files = OrderFileSerializer(many=True, read_only=True)
    design_approvals = DesignApprovalSerializer(many=True, read_only=True)
    machine_assignments = ProductMachineAssignmentSerializer(many=True, read_only=True)
    
    # Computed fields for frontend compatibility
    products = serializers.SerializerMethodField()
    lineItems = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_code', 'client_name', 'company_name', 'phone', 'trn', 'email',
            'address', 'specs', 'urgency', 'status', 'stage', 'pricing_status', 'delivery_code',
            'delivered_at', 'created_at', 'updated_at',
            'assigned_sales_person', 'assigned_designer', 'assigned_production_person',
            'internal_notes',
            'items', 'products', 'lineItems',  # Frontend compatibility
            'quotation', 'design_stage', 'printing_stage', 'approval_stage',
            'delivery_stage', 'uploads', 'files', 'design_approvals', 'machine_assignments'
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
    items = OrderItemSerializer(many=True, read_only=True)
    quotation = QuotationSerializer(read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_code', 'client_name', 'company_name', 'phone', 'trn', 'email',
            'address', 'specs', 'urgency', 'status', 'stage', 'pricing_status',
            'delivery_code', 'delivered_at', 'created_at', 'updated_at',
            'assigned_sales_person', 'assigned_designer', 'assigned_production_person',
            'items_count', 'items', 'quotation'
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
    print_operator = serializers.CharField(required=False, allow_blank=True)
    print_time = serializers.DateTimeField(required=False)
    batch_info = serializers.CharField(required=False, allow_blank=True)
    qa_checklist = serializers.CharField(required=False, allow_blank=True)


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
