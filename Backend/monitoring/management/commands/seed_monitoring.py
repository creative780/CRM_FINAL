from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from monitoring.models import Org
import secrets

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed initial data for monitoring system'

    def handle(self, *args, **options):
        # Create default organization
        org, created = Org.objects.get_or_create(
            name="Default Organization",
            defaults={'retention_days': 30}
        )
        
        if created:
            self.stdout.write(
                self.style.SUCCESS(f'Created organization: {org.name}')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'Organization already exists: {org.name}')
            )

        # Create admin user if it doesn't exist
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@company.com',
                'first_name': 'Admin',
                'last_name': 'User',
                'roles': ['admin'],
                'org_id': org.id,
                'is_staff': True,
                'is_superuser': True,
            }
        )
        
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            self.stdout.write(
                self.style.SUCCESS(f'Created admin user: {admin_user.email}')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'Admin user already exists: {admin_user.email}')
            )

        # Create a regular user for testing
        test_user, created = User.objects.get_or_create(
            username='testuser',
            defaults={
                'email': 'test@company.com',
                'first_name': 'Test',
                'last_name': 'User',
                'roles': ['sales'],
                'org_id': org.id,
            }
        )
        
        if created:
            test_user.set_password('test123')
            test_user.save()
            self.stdout.write(
                self.style.SUCCESS(f'Created test user: {test_user.email}')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'Test user already exists: {test_user.email}')
            )

        self.stdout.write(
            self.style.SUCCESS('Successfully seeded monitoring data!')
        )
