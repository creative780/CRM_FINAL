from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Fix user roles for login'

    def handle(self, *args, **options):
        # Fix all users' roles
        users_to_fix = [
            ('affan', ['sales']),
            ('testuser@company.com', ['sales']),
            ('husnain', ['designer']),
            ('yasir', ['production']),
            ('ikrash', ['admin']),
            ('admin', ['admin']),
            ('testuser', ['sales']),
        ]
        
        for username, roles in users_to_fix:
            try:
                user = User.objects.get(username=username)
                user.roles = roles
                user.save()
                self.stdout.write(self.style.SUCCESS(f'Updated user {user.username} roles to: {user.roles}'))
            except User.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'User {username} not found'))
        
        # Check all users and their roles
        self.stdout.write('\nAll users and their roles:')
        for user in User.objects.all():
            self.stdout.write(f'  {user.username}: {user.roles}')
