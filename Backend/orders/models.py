from django.db import models
from django.conf import settings


class Order(models.Model):
    STATUS_CHOICES = (
        ('new', 'New'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('delivered', 'Delivered'),
    )
    STAGE_CHOICES = (
        ('intake', 'Intake'),
        ('quotation', 'Quotation'),
        ('design', 'Design/Production'),
        ('printing', 'Printing/QA'),
        ('approval', 'Client Approval'),
        ('delivery', 'Delivery'),
    )
    order_id = models.CharField(max_length=20, unique=True)
    client_name = models.CharField(max_length=255)
    product_type = models.CharField(max_length=120)
    specs = models.TextField(blank=True)
    urgency = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    stage = models.CharField(max_length=20, choices=STAGE_CHOICES, default='intake')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class OrderQuotation(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='quotation')
    labour_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    finishing_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paper_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    design_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)


class OrderDesign(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='design')
    assigned_designer = models.CharField(max_length=255, blank=True)
    requirements_files = models.JSONField(default=list, blank=True)
    design_status = models.CharField(max_length=50, blank=True)


class OrderPrint(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='print')
    print_operator = models.CharField(max_length=255, blank=True)
    print_time = models.DateTimeField(null=True, blank=True)
    batch_info = models.CharField(max_length=255, blank=True)
    print_status = models.CharField(max_length=50, blank=True)
    qa_checklist = models.JSONField(default=list, blank=True)


class OrderApproval(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='approval')
    client_approval_files = models.JSONField(default=list, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)


class OrderDelivery(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='delivery')
    delivery_code = models.CharField(max_length=6, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    rider_photo_path = models.CharField(max_length=500, blank=True)
    delivery_status = models.CharField(max_length=20, default="Dispatched")

# Create your models here.
