from django.contrib import admin
from .models import (
    Order, OrderItem, Quotation, DesignStage, PrintingStage,
    ApprovalStage, DeliveryStage, Upload, DesignApproval,
    ProductMachineAssignment, OrderFile
)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_code', 'client_name', 'status', 'stage', 'urgency', 'created_at']
    list_filter = ['status', 'stage', 'urgency', 'created_at']
    search_fields = ['order_code', 'client_name', 'company_name', 'phone', 'email']
    readonly_fields = ['order_code', 'created_at', 'updated_at']


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['order', 'name', 'quantity', 'unit_price', 'line_total']
    list_filter = ['created_at']
    search_fields = ['name', 'sku', 'order__order_code']


@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = ['order', 'grand_total', 'remaining', 'sales_person']
    readonly_fields = ['products_subtotal', 'other_subtotal', 'subtotal', 'vat_3pct', 'grand_total', 'remaining']


@admin.register(DesignStage)
class DesignStageAdmin(admin.ModelAdmin):
    list_display = ['order', 'assigned_designer', 'design_status']
    list_filter = ['design_status']


@admin.register(PrintingStage)
class PrintingStageAdmin(admin.ModelAdmin):
    list_display = ['order', 'print_operator', 'print_status', 'print_time']
    list_filter = ['print_status']


@admin.register(ApprovalStage)
class ApprovalStageAdmin(admin.ModelAdmin):
    list_display = ['order', 'approved_at']


@admin.register(DeliveryStage)
class DeliveryStageAdmin(admin.ModelAdmin):
    list_display = ['order', 'delivered_at']


@admin.register(Upload)
class UploadAdmin(admin.ModelAdmin):
    list_display = ['order', 'original_name', 'kind', 'size', 'created_at']
    list_filter = ['kind', 'created_at']


@admin.register(DesignApproval)
class DesignApprovalAdmin(admin.ModelAdmin):
    list_display = ['order', 'designer', 'sales_person', 'approval_status', 'submitted_at', 'reviewed_at']
    list_filter = ['approval_status', 'submitted_at']
    search_fields = ['order__order_code', 'designer', 'sales_person']
    readonly_fields = ['submitted_at', 'reviewed_at']


@admin.register(ProductMachineAssignment)
class ProductMachineAssignmentAdmin(admin.ModelAdmin):
    list_display = ['order', 'product_name', 'machine_name', 'status', 'started_at', 'completed_at']
    list_filter = ['status', 'machine_id']
    search_fields = ['order__order_code', 'product_name', 'machine_name']
    readonly_fields = []


@admin.register(OrderFile)
class OrderFileAdmin(admin.ModelAdmin):
    list_display = ['order', 'file_name', 'file_type', 'uploaded_by', 'uploaded_by_role', 'uploaded_at']
    list_filter = ['file_type', 'uploaded_by_role', 'stage']
    search_fields = ['order__order_code', 'file_name', 'uploaded_by']
    readonly_fields = ['uploaded_at', 'created_at', 'updated_at']
