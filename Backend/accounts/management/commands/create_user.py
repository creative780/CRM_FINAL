from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from accounts.models import Role

User = get_user_model()

class Command(BaseCommand):
    help = 'Create a new user with specified username, password, and role'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Username for the new user')
        parser.add_argument('password', type=str, help='Password for the new user')
        parser.add_argument('role', type=str, help='Role for the new user')

    def handle(self, *args, **options):
        username = options['username']
        password = options['password']
        role = options['role']
        
        # Check if user already exists
        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f'User "{username}" already exists')
            )
            return
        
        # Validate role
        valid_roles = [choice[0] for choice in Role.choices]
        if role not in valid_roles:
            self.stdout.write(
                self.style.ERROR(f'Invalid role "{role}". Valid roles are: {", ".join(valid_roles)}')
            )
            return
        
        # Create user
        try:
            user = User.objects.create_user(
                username=username,
                password=password,
                roles=[role]
            )
            self.stdout.write(
                self.style.SUCCESS(f'Successfully created user "{username}" with role "{role}"')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error creating user: {str(e)}')
            )

