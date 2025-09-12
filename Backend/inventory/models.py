from django.db import models


class InventoryItem(models.Model):
    sku = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=255)
    quantity = models.IntegerField(default=0)
    unit = models.CharField(max_length=32, default='unit')

    def __str__(self):
        return f"{self.sku} - {self.name}"


class InventoryMovement(models.Model):
    order_id = models.IntegerField(null=True, blank=True)
    sku = models.CharField(max_length=64)
    delta = models.IntegerField()
    reason = models.CharField(max_length=120)
    created_at = models.DateTimeField(auto_now_add=True)

# Create your models here.
