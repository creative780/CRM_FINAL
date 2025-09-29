from django.core.management.base import BaseCommand
from orders.models import Order, Quotation
from decimal import Decimal


class Command(BaseCommand):
    help = 'Create missing quotations for orders that should have them'

    def handle(self, *args, **options):
        # Find orders that should have quotations but don't
        orders_without_quotation = Order.objects.filter(quotation__isnull=True)
        
        self.stdout.write(f'Found {orders_without_quotation.count()} orders without quotations')
        
        created_count = 0
        for order in orders_without_quotation:
            # Create a quotation for this order
            quotation, created = Quotation.objects.get_or_create(
                order=order,
                defaults={
                    'labour_cost': Decimal('0.00'),
                    'finishing_cost': Decimal('0.00'),
                    'paper_cost': Decimal('0.00'),
                    'machine_cost': Decimal('0.00'),
                    'design_cost': Decimal('0.00'),
                    'delivery_cost': Decimal('0.00'),
                    'other_charges': Decimal('0.00'),
                    'discount': Decimal('0.00'),
                    'advance_paid': Decimal('0.00'),
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created quotation for order {order.order_code} - {order.client_name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Quotation already exists for order {order.order_code} - {order.client_name}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} quotations')
        )

