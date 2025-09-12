from django.db import models
from django.contrib.auth.models import AbstractUser


class Role(models.TextChoices):
    ADMIN = 'admin', 'Admin'
    SALES = 'sales', 'Sales'
    DESIGNER = 'designer', 'Designer'
    PRODUCTION = 'production', 'Production'
    DELIVERY = 'delivery', 'Delivery'
    FINANCE = 'finance', 'Finance'


class User(AbstractUser):
    roles = models.JSONField(default=list, blank=True)
    mfa_phone = models.CharField(max_length=32, blank=True, null=True)
    mfa_email_otp_enabled = models.BooleanField(default=False)

    def has_role(self, role: str) -> bool:
        return role in (self.roles or [])

# Create your models here.
