from django.db import models
from django.utils import timezone
from orders.models import Order


class DeliveryCode(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='delivery_code_obj')
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def is_valid(self):
        return timezone.now() < self.expires_at

# Create your models here.
