from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from monitoring.models import Device, DeviceUserBind, Heartbeat, Screenshot
from monitoring.auth_utils import bind_device_to_user, create_enrollment_token
from django.utils import timezone

User = get_user_model()

class Command(BaseCommand):
    help = 'Test device binding functionality'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Testing device binding...'))

        # Create a test user if it doesn't exist
        user, created = User.objects.get_or_create(
            username='testuser@company.com',
            email='testuser@company.com',
            defaults={'first_name': 'Test', 'last_name': 'User'}
        )
        if created:
            user.set_password('testpassword')
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Created test user: {user.email}'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Test user already exists: {user.email}'))

        # Create a test device
        device, created = Device.objects.get_or_create(
            hostname='test-device',
            defaults={
                'os': 'Windows',
                'agent_version': '1.0.0',
                'status': 'OFFLINE'
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created test device: {device.hostname}'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Test device already exists: {device.hostname}'))

        # Test device binding
        self.stdout.write('Testing device binding...')
        success = bind_device_to_user(device.id, user)
        
        if success:
            self.stdout.write(self.style.SUCCESS('Device binding successful!'))
            
            # Refresh device from database
            device.refresh_from_db()
            self.stdout.write(f'Device current user: {device.current_user_name}')
            self.stdout.write(f'Device current role: {device.current_user_role}')
            self.stdout.write(f'Last bind time: {device.last_user_bind_at}')
            
            # Check binding history
            bind_count = DeviceUserBind.objects.filter(device=device).count()
            self.stdout.write(f'Binding history entries: {bind_count}')
            
            # Test heartbeat with user snapshots
            self.stdout.write('Testing heartbeat with user snapshots...')
            heartbeat = Heartbeat.objects.create(
                device=device,
                cpu_percent=25.5,
                mem_percent=60.2,
                active_window='Test Application',
                is_locked=False,
                ip='127.0.0.1',
                user_id_snapshot=device.current_user.id if device.current_user else None,
                user_name_snapshot=device.current_user_name,
                user_role_snapshot=device.current_user_role,
            )
            self.stdout.write(self.style.SUCCESS(f'Created heartbeat: {heartbeat.id}'))
            self.stdout.write(f'Heartbeat user snapshot: {heartbeat.user_name_snapshot}')
            
        else:
            self.stdout.write(self.style.ERROR('Device binding failed!'))

        # Test enrollment token creation
        self.stdout.write('Testing enrollment token creation...')
        enrollment_token = create_enrollment_token(
            user_id=str(user.id),
            org_id=None
        )
        self.stdout.write(self.style.SUCCESS(f'Created enrollment token: {enrollment_token[:20]}...'))

        self.stdout.write(self.style.SUCCESS('Device binding test completed!'))
