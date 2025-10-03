from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from orders.models import Order

User = get_user_model()

class Command(BaseCommand):
    help = 'Fix abdullah user access and update old orders'

    def handle(self, *args, **options):
        # Fix abdullah's roles
        try:
            user = User.objects.get(username='abdullah')
            user.roles = ['sales', 'admin']  # Give both sales and admin privileges
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Updated abdullah roles to: {user.roles}'))
        except User.DoesNotExist:
            self.stdout.write(self.style.WARNING('User abdullah not found'))
            return
        
        # Fix orders assigned to generic 'sales_person'
        orders_to_fix = Order.objects.filter(assigned_sales_person='sales_person')
        count_fixed = 0
        
        for order in orders_to_fix:
            order.assigned_sales_person = 'abdullah'
            order.sales_person = 'abdullah'
            order.save()
            count_fixed += 1
            self.stdout.write(f'Fixed order {order.order_code} - assigned to abdullah')
        
        if count_fixed > 0:
            self.stdout.write(self.style.SUCCESS(f'Fixed {count_fixed} orders assigned to abdullah'))
        else:
            self.stdout.write(self.style.SUCCESS('No orders needed fixing'))
        
        # Show abdullah's current status
        abdullah = User.objects.get(username='abdullah')
        abdullah_orders = Order.objects.filter(assigned_sales_person='abdullah').count()
        
        self.stdout.write('\nabdullah status:')
        self.stdout.write(f'  Username: {abdullah.username}')
        self.stdout.write(f'  Roles: {abdullah.roles}')
        self.stdout.write(f'  Orders assigned: {abdullah_orders}')
