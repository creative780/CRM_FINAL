from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from monitoring.models import Device
from pathlib import Path
import webbrowser


class Command(BaseCommand):
    help = 'Manually inject device ID into browser for testing'

    def add_arguments(self, parser):
        parser.add_argument('--device-id', help='Specific device ID to inject')
        parser.add_argument('--open-browser', action='store_true', help='Open browser automatically')

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Creating device ID injection page...'))

        # Get the most recent active device
        if options['device_id']:
            try:
                device = Device.objects.get(id=options['device_id'])
            except Device.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Device {options["device_id"]} not found'))
                return
        else:
            # Get the most recent device with a heartbeat
            device = Device.objects.filter(
                last_heartbeat__gte=timezone.now() - timedelta(minutes=10)
            ).order_by('-last_heartbeat').first()
            
            if not device:
                self.stdout.write(self.style.ERROR('No active devices found'))
                return

        self.stdout.write(f'Using device: {device.id} ({device.hostname})')

        # Create HTML content
        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <title>CRM Agent - Device ID Setup</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }}
        .container {{ background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }}
        .success {{ color: #28a745; font-weight: bold; }}
        .device-id {{ font-family: monospace; background: #f8f9fa; padding: 10px; border-radius: 4px; margin: 10px 0; }}
        .instructions {{ margin-top: 20px; padding: 15px; background: #e9ecef; border-radius: 4px; }}
        .copy-btn {{ background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-left: 10px; }}
        .copy-btn:hover {{ background: #0056b3; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>CRM Monitoring Agent</h1>
        <p class="success">✅ Device ID Setup</p>
        <div class="device-id">
            Device ID: {device.id}
            <button class="copy-btn" onclick="copyDeviceId()">Copy</button>
        </div>
        <div class="instructions">
            <h3>Instructions:</h3>
            <ol>
                <li>Click the "Set Device ID" button below</li>
                <li>Go to the CRM login page</li>
                <li>Try logging in again</li>
            </ol>
            <p><strong>Note:</strong> The device ID will be stored in your browser's localStorage and sent with login requests.</p>
            <button onclick="setDeviceId()" style="background: #28a745; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-size: 16px; margin-top: 10px;">
                Set Device ID
            </button>
        </div>
    </div>
    
    <script>
        function setDeviceId() {{
            if (typeof(Storage) !== "undefined") {{
                localStorage.setItem('device_id', '{device.id}');
                document.cookie = "device_id={device.id}; path=/; max-age=86400";
                
                const status = document.querySelector('.success');
                status.innerHTML = '✅ Device ID set successfully! You can now close this tab and try logging in.';
                status.style.color = '#28a745';
                
                console.log('CRM Agent: Device ID set to', '{device.id}');
            }} else {{
                document.querySelector('.success').innerHTML = '❌ localStorage not supported in this browser';
                document.querySelector('.success').style.color = '#dc3545';
            }}
        }}
        
        function copyDeviceId() {{
            navigator.clipboard.writeText('{device.id}').then(() => {{
                alert('Device ID copied to clipboard!');
            }});
        }}
        
        // Auto-set on page load
        window.addEventListener('load', () => {{
            setTimeout(setDeviceId, 1000);
        }});
    </script>
</body>
</html>"""

        # Write to Desktop
        script_file = Path.home() / "Desktop" / "crm-agent-device-id.html"
        with open(script_file, 'w', encoding='utf-8') as f:
            f.write(html_content)

        self.stdout.write(self.style.SUCCESS(f'Device ID injection page created at: {script_file}'))
        self.stdout.write(f'Device ID: {device.id}')
        self.stdout.write(f'Hostname: {device.hostname}')
        self.stdout.write(f'Last heartbeat: {device.last_heartbeat}')

        if options['open_browser']:
            try:
                webbrowser.open(f"file://{script_file}")
                self.stdout.write(self.style.SUCCESS('Opened in browser'))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'Could not open browser: {e}'))
                self.stdout.write(f'Please manually open: {script_file}')
