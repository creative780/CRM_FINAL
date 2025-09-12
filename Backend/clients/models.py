from django.db import models
from django.conf import settings


class Organization(models.Model):
    name = models.CharField(max_length=255)
    industry = models.CharField(max_length=120, blank=True)
    website = models.URLField(blank=True)
    notes = models.TextField(blank=True)

    def __str__(self) -> str:
        return self.name


class Contact(models.Model):
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='contacts', null=True, blank=True)
    first_name = models.CharField(max_length=120)
    last_name = models.CharField(max_length=120, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=64, blank=True)
    title = models.CharField(max_length=120, blank=True)

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class Lead(models.Model):
    STAGE_CHOICES = (
        ('new', 'New'),
        ('contacted', 'Contacted'),
        ('proposal', 'Proposal'),
        ('negotiation', 'Negotiation'),
        ('won', 'Won'),
        ('lost', 'Lost'),
    )

    org = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True, blank=True, related_name='leads')
    contact = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True, related_name='leads')
    title = models.CharField(max_length=255, blank=True)
    source = models.CharField(max_length=120, blank=True)
    stage = models.CharField(max_length=20, choices=STAGE_CHOICES, default='new')
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='owned_leads')
    value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    probability = models.IntegerField(default=0)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_leads')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Client(models.Model):
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='clients')
    primary_contact = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True, related_name='client_primary')
    account_owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='client_accounts')
    status = models.CharField(max_length=50, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

# Create your models here.
