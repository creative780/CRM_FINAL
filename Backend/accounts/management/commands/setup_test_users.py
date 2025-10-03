from django.core.management.base import BaseCommand
from accounts.models import User

class Command(BaseCommand):
    help = 'Setup test users with known passwords for testing'

    def handle(self, *args, **options):
        # Test users with known passwords
        test_users = [
            {
                'email': 'admin@test.com',
                'password': 'admin123',
                'roles': ['admin'],
                'first_name': 'Admin',
                'last_name': 'User'
            },
            {
                'email': 'sales@test.com',
                'password': 'sales123',
                'roles': ['sales'],
                'first_name': 'Sales',
                'last_name': 'User'
            },
            {
                'email': 'designer@test.com',
                'password': 'designer123',
                'roles': ['designer'],
                'first_name': 'Designer',
                'last_name': 'User'
            },
            {
                'email': 'production@test.com',
                'password': 'production123',
                'roles': ['production'],
                'first_name': 'Production',
                'last_name': 'User'
            }
        ]
        
        for user_data in test_users:
            user, created = User.objects.get_or_create(
                email=user_data['email'],
                defaults={
                    'username': user_data['email'],
                    'first_name': user_data['first_name'],
                    'last_name': user_data['last_name'],
                    'roles': user_data['roles'],
                    'is_active': True,
                    'is_staff': 'admin' in user_data['roles'],
                    'is_superuser': 'admin' in user_data['roles']
                }
            )
            
            if created:
                user.set_password(user_data['password'])
                user.save()
                self.stdout.write(
                    self.style.SUCCESS(f'Created user: {user.email} with roles: {user.roles}')
                )
            else:
                # Update existing user
                user.set_password(user_data['password'])
                user.roles = user_data['roles']
                user.is_staff = 'admin' in user_data['roles']
                user.is_superuser = 'admin' in user_data['roles']
                user.save()
                self.stdout.write(
                    self.style.SUCCESS(f'Updated user: {user.email} with roles: {user.roles}')
                )
        
        self.stdout.write(
            self.style.SUCCESS('\nTest users setup completed!')
        )
        self.stdout.write('\nTest credentials:')
        for user_data in test_users:
            self.stdout.write(f'  {user_data["email"]} / {user_data["password"]} ({user_data["roles"]})')
