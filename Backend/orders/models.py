import uuid
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from decimal import Decimal


class Order(models.Model):
    URGENCY_CHOICES = (
        ('Urgent', 'Urgent'),
        ('High', 'High'),
        ('Normal', 'Normal'),
        ('Low', 'Low'),
    )
    
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('sent_to_sales', 'Sent to Sales'),
        ('sent_to_designer', 'Sent to Designer'),
        ('sent_for_approval', 'Sent for Approval'),
        ('sent_to_production', 'Sent to Production'),
        ('sent_to_admin', 'Sent to Admin'),
        ('getting_ready', 'Getting Ready'),
        ('sent_for_delivery', 'Sent for Delivery'),
        ('delivered', 'Delivered'),
        # Legacy statuses for backward compatibility
        ('new', 'New'),
        ('active', 'Active'),
        ('completed', 'Completed'),
    )
    
    STAGE_CHOICES = (
        ('order_intake', 'Order Intake'),
        ('quotation', 'Quotation'),
        ('design', 'Design'),
        ('printing', 'Printing'),
        ('approval', 'Approval'),
        ('delivery', 'Delivery'),
    )
    
    id = models.AutoField(primary_key=True)
    order_code = models.CharField(max_length=20, unique=True, db_index=True, default='TEMP')
    client_name = models.CharField(max_length=255)
    company_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    trn = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    specs = models.TextField(blank=True)
    urgency = models.CharField(max_length=10, choices=URGENCY_CHOICES, default='Normal')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='draft')
    stage = models.CharField(max_length=20, choices=STAGE_CHOICES, default='order_intake')
    pricing_status = models.CharField(max_length=20, default='Not Priced')
    delivery_code = models.CharField(max_length=6, blank=True, null=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    
    # Workflow tracking fields
    assigned_sales_person = models.CharField(max_length=255, blank=True, help_text="Sales person handling this order")
    assigned_designer = models.CharField(max_length=255, blank=True, help_text="Designer assigned to this order")
    assigned_production_person = models.CharField(max_length=255, blank=True, help_text="Production person assigned")
    
    # Internal tracking
    internal_notes = models.TextField(blank=True, help_text="Internal notes visible only to admin")
    
    # Sales person field (added by migration 0009)
    sales_person = models.CharField(max_length=255, blank=True, null=True, help_text="Sales person who sent this order to production")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['stage', 'status']),
            models.Index(fields=['order_code']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.order_code} - {self.client_name}"


class OrderItem(models.Model):
    id = models.AutoField(primary_key=True)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product_id = models.CharField(max_length=100, blank=True, null=True)
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, blank=True, null=True)
    attributes = models.JSONField(default=dict, blank=True)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    custom_requirements = models.TextField(blank=True, null=True, help_text='Custom design requirements for this product')
    design_ready = models.BooleanField(default=False, help_text='Design status for this product')
    design_need_custom = models.BooleanField(default=False, help_text='Whether this product needs custom design')
    design_files_manifest = models.JSONField(default=list, blank=True, help_text='List of design files for this product - DEPRECATED: Use OrderFile model instead')
    design_completed_at = models.DateTimeField(null=True, blank=True, help_text='When the design was completed')
    design_commented_by = models.CharField(max_length=255, blank=True, null=True, help_text='Who commented on the design')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['order', 'product_id']),
        ]
    
    def save(self, *args, **kwargs):
        self.line_total = self.quantity * self.unit_price
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.order.order_code} - {self.name} x{self.quantity}"


class Quotation(models.Model):
    id = models.AutoField(primary_key=True)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='quotation')
    labour_cost = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    finishing_cost = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    paper_cost = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    machine_cost = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    design_cost = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    delivery_cost = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    other_charges = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    advance_paid = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    
    # Additional quotation fields
    quotation_notes = models.TextField(blank=True, null=True)
    custom_field = models.CharField(max_length=500, blank=True, null=True)
    sales_person = models.CharField(max_length=100, blank=True, null=True)
    
    # Computed fields (stored for performance)
    products_subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    other_subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    vat_3pct = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    remaining = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def calculate_totals(self):
        """Calculate all totals based on order items and costs"""
        # Products subtotal from order items
        self.products_subtotal = sum(item.line_total for item in self.order.items.all())
        
        # Other costs subtotal
        self.other_subtotal = (
            self.labour_cost + self.finishing_cost + self.paper_cost + 
            self.machine_cost + self.design_cost + self.delivery_cost + 
            self.other_charges
        )
        
        # Total subtotal
        self.subtotal = self.products_subtotal + self.other_subtotal
        
        # VAT 3% on (subtotal - discount)
        self.vat_3pct = round((self.subtotal - self.discount) * Decimal('0.03'), 2)
        
        # Grand total
        self.grand_total = self.subtotal - self.discount + self.vat_3pct
        
        # Remaining amount
        self.remaining = self.grand_total - self.advance_paid
    
    def save(self, *args, **kwargs):
        # Only auto-calculate totals if grand_total is not being manually set
        skip_calculation = kwargs.pop('skip_calculation', False)
        if not skip_calculation:
            self.calculate_totals()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Quotation for {self.order.order_code}"


class DesignStage(models.Model):
    id = models.AutoField(primary_key=True)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='design_stage')
    assigned_designer = models.CharField(max_length=255, blank=True)
    requirements_files_manifest = models.JSONField(default=list, blank=True)
    design_status = models.CharField(max_length=100, blank=True)
    internal_comments = models.TextField(blank=True, help_text="Internal comments for design stage")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Design for {self.order.order_code}"


class PrintingStage(models.Model):
    PRINT_STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Printing', 'Printing'),
        ('Printed', 'Printed'),
    )
    
    id = models.AutoField(primary_key=True)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='printing_stage')
    print_operator = models.CharField(max_length=255, blank=True)
    print_time = models.DateTimeField(null=True, blank=True)
    batch_info = models.CharField(max_length=255, blank=True)
    print_status = models.CharField(max_length=20, choices=PRINT_STATUS_CHOICES, default='Pending')
    qa_checklist = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Printing for {self.order.order_code}"


class ApprovalStage(models.Model):
    id = models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='approval_stage')
    client_approval_files = models.JSONField(default=list, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Approval for {self.order.order_code}"


class DeliveryStage(models.Model):
    id = models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='delivery_stage')
    rider_photo_path = models.CharField(max_length=500, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Delivery for {self.order.order_code}"


class Upload(models.Model):
    UPLOAD_KINDS = (
        ('intake', 'Intake'),
        ('designer', 'Designer'),
        ('final', 'Final'),
        ('rider', 'Rider'),
        ('approval', 'Approval'),
    )
    
    id = models.AutoField(primary_key=True)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='uploads')
    kind = models.CharField(max_length=20, choices=UPLOAD_KINDS)
    file = models.FileField(upload_to='uploads/')
    original_name = models.CharField(max_length=255)
    mime = models.CharField(max_length=100)
    size = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['order', 'kind']),
        ]
    
    def __str__(self):
        return f"{self.order.order_code} - {self.original_name}"


class DesignApproval(models.Model):
    """
    Tracks design approval requests from designers to sales.
    Only the sales person who originally sent the order can approve.
    """
    APPROVAL_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )
    
    id = models.AutoField(primary_key=True)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='design_approvals')
    designer = models.CharField(max_length=255, help_text="Designer who created this work")
    sales_person = models.CharField(max_length=255, help_text="Sales person who sent the order")
    approval_status = models.CharField(max_length=20, choices=APPROVAL_STATUS_CHOICES, default='pending')
    design_files_manifest = models.JSONField(default=list, blank=True, help_text="List of design file metadata")
    approval_notes = models.TextField(blank=True, help_text="Notes from designer when requesting approval")
    rejection_reason = models.TextField(blank=True, help_text="Reason if rejected by sales")
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['order', 'approval_status']),
            models.Index(fields=['sales_person', 'approval_status']),
            models.Index(fields=['designer']),
        ]
    
    def __str__(self):
        return f"Design Approval for {self.order.order_code} - {self.approval_status}"


class ProductMachineAssignment(models.Model):
    """
    Assigns specific machines to each product in an order for production.
    Tracks production time and status per product.
    """
    PRODUCTION_STATUS_CHOICES = (
        ('queued', 'Queued'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('on_hold', 'On Hold'),
    )
    
    id = models.AutoField(primary_key=True)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='machine_assignments')
    product_name = models.CharField(max_length=255)
    product_sku = models.CharField(max_length=100, blank=True)
    product_quantity = models.PositiveIntegerField()
    machine_id = models.CharField(max_length=100, help_text="Machine identifier")
    machine_name = models.CharField(max_length=255)
    estimated_time_minutes = models.PositiveIntegerField(help_text="Estimated production time")
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=PRODUCTION_STATUS_CHOICES, default='queued')
    assigned_by = models.CharField(max_length=255, help_text="Production person who assigned this")
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['id']
        indexes = [
            models.Index(fields=['order', 'status']),
            models.Index(fields=['machine_id', 'status']),
        ]
    
    def __str__(self):
        return f"{self.order.order_code} - {self.product_name} on {self.machine_name}"


class OrderFile(models.Model):
    """
    Stores all files related to orders with role-based access control.
    Supports multiple file types and stages.
    """
    FILE_TYPE_CHOICES = (
        ('requirement', 'Requirement'),
        ('design', 'Design'),
        ('proof', 'Proof'),
        ('final', 'Final'),
        ('approval', 'Approval'),
        ('delivery', 'Delivery'),
        ('other', 'Other'),
    )
    
    id = models.AutoField(primary_key=True)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='files')
    file = models.FileField(upload_to='order_files/%Y/%m/%d/')
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=20, choices=FILE_TYPE_CHOICES)
    file_size = models.PositiveIntegerField(help_text="File size in bytes")
    mime_type = models.CharField(max_length=100)
    uploaded_by = models.CharField(max_length=255, help_text="Username of uploader")
    uploaded_by_role = models.CharField(max_length=50, help_text="Role of uploader")
    stage = models.CharField(max_length=50, help_text="Which stage this file belongs to")
    visible_to_roles = models.JSONField(default=list, help_text="List of roles that can view this file")
    description = models.TextField(blank=True)
    product_related = models.CharField(max_length=255, blank=True, help_text="Related product name/SKU if applicable")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['order', 'file_type']),
            models.Index(fields=['order', 'stage']),
            models.Index(fields=['uploaded_by']),
        ]
    
    def __str__(self):
        return f"{self.order.order_code} - {self.file_name}"
