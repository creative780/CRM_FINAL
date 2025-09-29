import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
import django
django.setup()

from monitoring.models import Session
from django.utils import timezone
from datetime import timedelta

recent = Session.objects.filter(created_at__gte=timezone.now() - timedelta(minutes=10)).order_by('-created_at')
print('Recent login attempts:')
for s in recent[:10]:
    print(f'  {s.created_at}: {s.user.username if s.user else "Unknown"} - {s.status} - Device: {s.device}')
