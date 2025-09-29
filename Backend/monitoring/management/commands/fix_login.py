from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from monitoring.models import Device, Heartbeat
from accounts.models import User
from monitoring.auth_utils import check_device_heartbeat_by_id

class Command(BaseCommand):
    help = 'Fix login issues by checking device status and providing solutions'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Username to check')

    def handle(self, *args, **options):
        username = options['username']
        
        try:
            user = User.objects.get(username=username)
            self.stdout.write(f"=== LOGIN FIX FOR {username.upper()} ===")
            self.stdout.write(f"User ID: {user.id}")
            self.stdout.write(f"Roles: {user.roles}")
            self.stdout.write(f"Is Admin: {user.is_admin()}")
            
            if user.is_admin():
                self.stdout.write(self.style.SUCCESS("✅ Admin user - no device check required"))
                self.stdout.write("Admin users can login without device agent.")
                return
            
            # Find device for this user
            device = Device.objects.filter(user=user).first()
            if not device:
                self.stdout.write(
                    self.style.ERROR(f"❌ No devices found for user {username}")
                )
                self.stdout.write("SOLUTION: Install and run the monitoring agent first.")
                return
            
            self.stdout.write(f"\n--- DEVICE STATUS ---")
            self.stdout.write(f"Device ID: {device.id}")
            self.stdout.write(f"Hostname: {device.hostname}")
            self.stdout.write(f"Status: {device.status}")
            self.stdout.write(f"Last Heartbeat: {device.last_heartbeat}")
            
            # Check heartbeat
            has_recent_heartbeat, device_obj = check_device_heartbeat_by_id(device.id, max_age_minutes=2)
            
            self.stdout.write(f"\n--- HEARTBEAT CHECK ---")
            self.stdout.write(f"Has Recent Heartbeat: {'✅ YES' if has_recent_heartbeat else '❌ NO'}")
            
            if device.last_heartbeat:
                time_diff = timezone.now() - device.last_heartbeat
                self.stdout.write(f"Heartbeat Age: {time_diff}")
                self.stdout.write(f"Max Age (2 min): {timedelta(minutes=2)}")
            
            # Show recent heartbeats
            recent_heartbeats = Heartbeat.objects.filter(device=device).order_by('-created_at')[:3]
            self.stdout.write(f"\n--- RECENT HEARTBEATS ---")
            self.stdout.write(f"Count: {recent_heartbeats.count()}")
            for hb in recent_heartbeats:
                self.stdout.write(f"  - {hb.created_at}: CPU {hb.cpu_percent}%, MEM {hb.mem_percent}%")
            
            # Final verdict and solution
            self.stdout.write(f"\n--- SOLUTION ---")
            if has_recent_heartbeat:
                self.stdout.write(self.style.SUCCESS("✅ Device is healthy - login should work"))
                self.stdout.write("Make sure device ID is set in browser localStorage:")
                self.stdout.write(f"localStorage.setItem('device_id', '{device.id}')")
            else:
                self.stdout.write(self.style.ERROR("❌ Device has no recent heartbeat"))
                self.stdout.write("SOLUTION: Make sure the agent is running and sending heartbeats.")
                self.stdout.write("Check agent logs for 'Heartbeat sent successfully' messages.")
            
            # Create HTML file to set device ID
            html_content = f"""<!DOCTYPE html>
<html>
<head>
    <title>Fix Login - {username}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }}
        .container {{ background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }}
        .success {{ color: #28a745; font-weight: bold; }}
        .error {{ color: #dc3545; font-weight: bold; }}
        .device-id {{ font-family: monospace; background: #f8f9fa; padding: 10px; border-radius: 4px; margin: 10px 0; }}
        .instructions {{ margin-top: 20px; padding: 15px; background: #e9ecef; border-radius: 4px; }}
        button {{ background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 5px; }}
        button:hover {{ background: #0056b3; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Fix Login for {username}</h1>
        
        <div id="status"></div>
        
        <div class="instructions">
            <h3>Device Status:</h3>
            <p>Device ID: <span class="device-id">{device.id}</span></p>
            <p>Status: {device.status}</p>
            <p>Last Heartbeat: {device.last_heartbeat}</p>
            <p>Recent Heartbeat: {'✅ YES' if has_recent_heartbeat else '❌ NO'}</p>
        </div>
        
        <div class="instructions">
            <h3>Actions:</h3>
            <button onclick="setDeviceId()">Set Device ID</button>
            <button onclick="testLogin()">Test Login</button>
            <button onclick="checkStatus()">Check Status</button>
        </div>
        
        <div class="instructions">
            <h3>Manual Setup:</h3>
            <p>If automatic setup fails, run in browser console:</p>
            <code>localStorage.setItem('device_id', '{device.id}')</code>
        </div>
    </div>
    
    <script>
        const DEVICE_ID = '{device.id}';
        
        function updateStatus() {{
            const deviceId = localStorage.getItem('device_id');
            const statusEl = document.getElementById('status');
            
            if (deviceId === DEVICE_ID) {{
                statusEl.innerHTML = '<div class="success">✅ Device ID is correctly set!</div>';
            }} else if (deviceId) {{
                statusEl.innerHTML = '<div class="error">❌ Wrong device ID: ' + deviceId + '</div>';
            }} else {{
                statusEl.innerHTML = '<div class="error">❌ Device ID not set</div>';
            }}
        }}
        
        function setDeviceId() {{
            try {{
                localStorage.setItem('device_id', DEVICE_ID);
                updateStatus();
            }} catch (e) {{
                document.getElementById('status').innerHTML = '<div class="error">❌ Failed to set device ID: ' + e.message + '</div>';
            }}
        }}
        
        function checkStatus() {{
            updateStatus();
        }}
        
        async function testLogin() {{
            const deviceId = localStorage.getItem('device_id');
            if (!deviceId) {{
                document.getElementById('status').innerHTML = '<div class="error">❌ Device ID not set. Please set it first.</div>';
                return;
            }}
            
            try {{
                document.getElementById('status').innerHTML = '<div>🔄 Testing login...</div>';
                
                const response = await fetch('http://localhost:8000/api/auth/login', {{
                    method: 'POST',
                    headers: {{
                        'Content-Type': 'application/json',
                        'X-Device-ID': deviceId
                    }},
                    body: JSON.stringify({{
                        username: '{username}',
                        password: '{username}',
                        role: 'sales'
                    }})
                }});
                
                const data = await response.json();
                
                if (response.ok) {{
                    document.getElementById('status').innerHTML = '<div class="success">✅ Login successful! You can now login normally.</div>';
                }} else {{
                    document.getElementById('status').innerHTML = '<div class="error">❌ Login failed: ' + (data.error || data.detail || 'Unknown error') + '</div>';
                }}
            }} catch (e) {{
                document.getElementById('status').innerHTML = '<div class="error">❌ Network error: ' + e.message + '</div>';
            }}
        }}
        
        // Update status on page load
        updateStatus();
    </script>
</body>
</html>"""
            
            # Write HTML file
            with open('fix_login.html', 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            self.stdout.write(f"\n--- HTML FILE CREATED ---")
            self.stdout.write(f"File: fix_login.html")
            self.stdout.write(f"Open this file in your browser to fix the login issue.")
            
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f"User {username} not found")
            )

