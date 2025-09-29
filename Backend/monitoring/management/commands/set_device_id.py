from django.core.management.base import BaseCommand
from monitoring.models import Device
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Set device ID for a user in browser localStorage'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Username to set device ID for')
        parser.add_argument('--device-id', type=str, help='Specific device ID to use')

    def handle(self, *args, **options):
        username = options['username']
        device_id = options.get('device_id')
        
        try:
            user = User.objects.get(username=username)
            
            if device_id:
                # Use specific device ID
                try:
                    device = Device.objects.get(id=device_id, user=user)
                except Device.DoesNotExist:
                    self.stdout.write(
                        self.style.ERROR(f'Device {device_id} not found for user {username}')
                    )
                    return
            else:
                # Find the most recent device for this user
                device = Device.objects.filter(user=user).order_by('-last_heartbeat').first()
                if not device:
                    self.stdout.write(
                        self.style.ERROR(f'No devices found for user {username}')
                    )
                    return
            
            self.stdout.write(f"Device ID for {username}: {device.id}")
            self.stdout.write(f"Device Status: {device.status}")
            self.stdout.write(f"Last Heartbeat: {device.last_heartbeat}")
            
            # Create HTML file to set device ID
            html_content = f"""<!DOCTYPE html>
<html>
<head>
    <title>Set Device ID - {username}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }}
        .container {{ background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }}
        .success {{ color: #28a745; font-weight: bold; }}
        .device-id {{ font-family: monospace; background: #f8f9fa; padding: 10px; border-radius: 4px; margin: 10px 0; }}
        .instructions {{ margin-top: 20px; padding: 15px; background: #e9ecef; border-radius: 4px; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Device ID Setup</h1>
        <p class="success">✅ Setting Device ID for {username}</p>
        <div class="device-id">Device ID: {device.id}</div>
        <div class="instructions">
            <h3>Status:</h3>
            <p id="status">Setting up device ID...</p>
            <p><strong>Note:</strong> This page will automatically set the device ID in your browser.</p>
        </div>
    </div>
    
    <script>
        // Set device ID in localStorage and cookies
        function setDeviceId() {{
            if (typeof(Storage) !== "undefined") {{
                localStorage.setItem('device_id', '{device.id}');
                document.cookie = "device_id={device.id}; path=/; max-age=86400";
                
                document.getElementById('status').innerHTML = '✅ Device ID set successfully! You can now close this tab and try logging in.';
                document.getElementById('status').style.color = '#28a745';
                
                console.log('Device ID set to', '{device.id}');
                
                // Auto-close after 3 seconds
                setTimeout(() => {{
                    window.close();
                }}, 3000);
            }} else {{
                document.getElementById('status').innerHTML = '❌ localStorage not supported in this browser';
                document.getElementById('status').style.color = '#dc3545';
            }}
        }}
        
        // Set device ID immediately
        setDeviceId();
    </script>
</body>
</html>"""
            
            # Write HTML file
            with open('set_device_id.html', 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            self.stdout.write(
                self.style.SUCCESS(f'HTML file created: set_device_id.html')
            )
            self.stdout.write(f'Open this file in your browser to set the device ID')
            self.stdout.write(f'Or manually set: localStorage.setItem("device_id", "{device.id}")')
            
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User {username} not found')
            )
