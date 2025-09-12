from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from monitoring.models import Employee
from inventory.models import InventoryItem
from orders.models import Order
from django.utils.crypto import get_random_string


class Command(BaseCommand):
    help = 'Seed demo data: roles/users, employees, inventory, sample orders'

    def handle(self, *args, **options):
        User = get_user_model()
        users = [
            ('admin', ['admin']),
            ('sales1', ['sales']),
            ('designer1', ['designer']),
            ('prod1', ['production']),
            ('delivery1', ['delivery']),
            ('finance1', ['finance']),
        ]
        for username, roles in users:
            u, created = User.objects.get_or_create(username=username, defaults={'roles': roles})
            if created:
                u.set_password('password')
                u.save()
        for i in range(10):
            Employee.objects.get_or_create(
                email=f'employee{i}@example.com',
                defaults={'name': f'Employee {i}', 'department': 'Ops', 'status': 'active', 'salary': 3000 + i * 100},
            )
        items = [('PAPER-A4', 'A4 Paper'), ('INK-BLK', 'Black Ink'), ('INK-CMYK', 'CMYK Set')]
        for sku, name in items:
            InventoryItem.objects.get_or_create(sku=sku, defaults={'name': name, 'quantity': 100})
        for i in range(3):
            Order.objects.get_or_create(order_id=get_random_string(10).upper(), defaults={'client_name': f'Client {i}', 'product_type': 'Flyer'})
        self.stdout.write(self.style.SUCCESS('Demo data seeded.'))

