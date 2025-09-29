from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from monitoring.models import Device

User = get_user_model()


class Command(BaseCommand):
    help = 'Check user roles and device status'

    def add_arguments(self, parser):
        parser.add_argument('--set-offline', action='store_true', help='Set all devices to offline status')
        parser.add_argument('--user', type=str, help='Specific user to check')

    def handle(self, *args, **options):
        self.stdout.write("=== USER ROLES AND DEVICE STATUS ===")
        
        # Get all users or specific user
        if options['user']:
            users = User.objects.filter(username=options['user'])
        else:
            users = User.objects.all()
        
        for user in users:
            self.stdout.write(f"\nUser: {user.username}")
            self.stdout.write(f"  Email: {user.email}")
            self.stdout.write(f"  Roles: {user.roles}")
            self.stdout.write(f"  Is Admin: {user.is_admin()}")
            self.stdout.write(f"  Org ID: {user.org_id}")
            
            # Check devices for this user
            devices = Device.objects.filter(user=user)
            self.stdout.write(f"  Devices: {devices.count()}")
            
            for device in devices:
                self.stdout.write(f"    Device {device.id}:")
                self.stdout.write(f"      Hostname: {device.hostname}")
                self.stdout.write(f"      Status: {device.status}")
                self.stdout.write(f"      Last Heartbeat: {device.last_heartbeat}")
                self.stdout.write(f"      Enrolled: {device.enrolled_at}")
                
                # Set to offline if requested
                if options['set_offline']:
                    device.status = 'OFFLINE'
                    device.save()
                    self.stdout.write(f"      -> Set to OFFLINE")
        
        self.stdout.write("\n=== SUMMARY ===")
        self.stdout.write(f"Total Users: {users.count()}")
        admin_count = sum(1 for user in users if user.is_admin())
        self.stdout.write(f"Admin Users: {admin_count}")
        self.stdout.write(f"Total Devices: {Device.objects.count()}")
        self.stdout.write(f"Online Devices: {Device.objects.filter(status='ONLINE').count()}")
