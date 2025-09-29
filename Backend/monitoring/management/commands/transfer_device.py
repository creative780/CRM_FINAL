from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from monitoring.models import Device

User = get_user_model()

class Command(BaseCommand):
    help = 'Transfer a device from one user to another'

    def add_arguments(self, parser):
        parser.add_argument('device_id', type=str, help='Device ID to transfer')
        parser.add_argument('new_username', type=str, help='Username to transfer device to')

    def handle(self, *args, **options):
        device_id = options['device_id']
        new_username = options['new_username']
        
        try:
            # Get the device
            device = Device.objects.get(id=device_id)
            old_user = device.current_user
            
            # Get the new user
            new_user = User.objects.get(username=new_username)
            
            # Transfer the device
            device.current_user = new_user
            device.save()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully transferred device {device_id} from {old_user.username if old_user else "None"} to {new_username}'
                )
            )
            
            # Show device details
            self.stdout.write(f'Device Details:')
            self.stdout.write(f'  ID: {device.id}')
            self.stdout.write(f'  Hostname: {device.hostname}')
            self.stdout.write(f'  Status: {device.status}')
            self.stdout.write(f'  Last Heartbeat: {device.last_heartbeat}')
            self.stdout.write(f'  New Owner: {device.current_user.username if device.current_user else "None"}')
            
        except Device.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Device {device_id} not found')
            )
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User {new_username} not found')
            )

