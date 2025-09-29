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
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    specs = models.TextField(blank=True)
    urgency = models.CharField(max_length=10, choices=URGENCY_CHOICES, default='Normal')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='new')
    stage = models.CharField(max_length=20, choices=STAGE_CHOICES, default='order_intake')
    pricing_status = models.CharField(max_length=20, default='Not Priced')
    delivery_code = models.CharField(max_length=6, blank=True, null=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
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
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='design_stage')
    assigned_designer = models.CharField(max_length=255, blank=True)
    requirements_files_manifest = models.JSONField(default=list, blank=True)
    design_status = models.CharField(max_length=100, blank=True)
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
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='approval_stage')
    client_approval_files = models.JSONField(default=list, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Approval for {self.order.order_code}"


class DeliveryStage(models.Model):
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
