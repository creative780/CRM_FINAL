#!/usr/bin/env python3
"""
Creative Connect Monitoring Agent
A simple agent that registers with the server and sends heartbeats
"""

import argparse
import json
import time
import requests
import platform
import socket
import os
import sys
import logging
import base64
import threading
from pathlib import Path
from datetime import datetime

# Try to import screenshot libraries
try:
    import mss
    import psutil
    from PIL import Image
    import io
    SCREENSHOT_AVAILABLE = True
except ImportError:
    SCREENSHOT_AVAILABLE = False
    logger.warning("Screenshot libraries not available. Install with: pip install mss psutil Pillow")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('agent.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class MonitoringAgent:
    def __init__(self, server_url="http://localhost:8000"):
        self.server_url = server_url
        self.device_token = None
        self.device_id = None
        self.current_user = None  # Cache current user context
        self.config_file = Path.home() / ".creative_connect_agent_config.json"
        self.api_server = None  # Add API server
        
    def load_config(self):
        """Load configuration from file"""
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load config: {e}")
        return {}
    
    def save_config(self, config):
        """Save configuration to file"""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(config, f, indent=2)
            logger.info(f"Config saved to {self.config_file}")
        except Exception as e:
            logger.error(f"Failed to save config: {e}")
    
    def get_system_info(self):
        """Get basic system information"""
        info = {
            "hostname": socket.gethostname(),
            "platform": platform.system(),
            "platform_version": platform.version(),
            "architecture": platform.architecture()[0],
            "processor": platform.processor(),
            "python_version": platform.python_version()
        }
        
        # Add system metrics if psutil is available
        if SCREENSHOT_AVAILABLE:
            try:
                info.update({
                    "cpu_percent": psutil.cpu_percent(interval=1),
                    "memory_percent": psutil.virtual_memory().percent,
                    "disk_percent": psutil.disk_usage('/').percent if platform.system() != 'Windows' else psutil.disk_usage('C:').percent,
                    "boot_time": psutil.boot_time()
                })
            except Exception as e:
                logger.warning(f"Failed to get system metrics: {e}")
        
        return info
    
    def capture_screenshot(self):
        """Capture screenshot using mss"""
        if not SCREENSHOT_AVAILABLE:
            return None
        
        try:
            with mss.mss() as sct:
                # Capture the primary monitor
                monitor = sct.monitors[1]  # monitors[0] is all monitors, monitors[1] is primary
                screenshot = sct.grab(monitor)
                
                # Convert to PIL Image
                img = Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")
                
                # Resize to reduce file size (max width 1920)
                if img.width > 1920:
                    ratio = 1920 / img.width
                    new_height = int(img.height * ratio)
                    img = img.resize((1920, new_height), Image.Resampling.LANCZOS)
                
                # Convert to JPEG bytes
                img_buffer = io.BytesIO()
                img.save(img_buffer, format='JPEG', quality=85, optimize=True)
                img_bytes = img_buffer.getvalue()
                
                # Encode as base64
                img_base64 = base64.b64encode(img_bytes).decode('utf-8')
                
                return {
                    'image': img_base64,
                    'width': img.width,
                    'height': img.height,
                    'taken_at': datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Failed to capture screenshot: {e}")
            return None
    
    def get_active_window_info(self):
        """Get active window information"""
        if not SCREENSHOT_AVAILABLE:
            return {"title": "Unknown", "process": "Unknown"}
        
        try:
            # This is a simplified version - in production you'd want more robust window detection
            import subprocess
            
            if platform.system() == "Windows":
                # Get active window title on Windows
                try:
                    result = subprocess.run(['powershell', '-Command', 
                        '(Get-Process | Where-Object {$_.MainWindowTitle -ne ""} | Sort-Object CPU -Descending | Select-Object -First 1).MainWindowTitle'], 
                        capture_output=True, text=True, timeout=2)
                    title = result.stdout.strip() if result.stdout.strip() else "Unknown"
                except:
                    title = "Unknown"
            else:
                title = "Unknown"
            
            return {
                "title": title,
                "process": "Unknown"  # Could be enhanced to get process name
            }
        except Exception as e:
            logger.warning(f"Failed to get active window info: {e}")
            return {"title": "Unknown", "process": "Unknown"}
    
    def fetch_user_context(self):
        """Fetch current user context from server"""
        if not self.device_token:
            return None
            
        try:
            response = requests.get(
                f"{self.server_url}/api/agent/context",
                headers={
                    "Authorization": f"Bearer {self.device_token}",
                    "Content-Type": "application/json"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.current_user = data.get('user')
                
                # Update config with current user
                config = self.load_config()
                config['current_user'] = self.current_user
                self.save_config(config)
                
                logger.info(f"Updated user context: {self.current_user}")
                return self.current_user
            else:
                logger.warning(f"Failed to fetch user context: {response.status_code}")
                return None
                
        except Exception as e:
            logger.warning(f"Error fetching user context: {e}")
            return None
    
    def inject_device_id(self):
        """Legacy method - now replaced by direct API server"""
        # This method is deprecated and replaced by start_api_server()
        # Keeping for backward compatibility but not used
        logger.info("Device ID injection via HTML page is deprecated. Using direct API instead.")
    
    def start_api_server(self):
        """Start local API server for frontend communication"""
        import http.server
        import socketserver
        import threading
        
        class AgentAPIHandler(http.server.BaseHTTPRequestHandler):
            def __init__(self, agent, *args, **kwargs):
                self.agent = agent
                super().__init__(*args, **kwargs)
            
            def do_GET(self):
                if self.path == '/device-id':
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
                    self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                    self.end_headers()
                    
                    response = {
                        'device_id': self.agent.device_id,
                        'status': 'active' if self.agent.device_token else 'inactive',
                        'hostname': socket.gethostname()
                    }
                    self.wfile.write(json.dumps(response).encode())
                else:
                    self.send_response(404)
                    self.end_headers()
            
            def do_OPTIONS(self):
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                self.end_headers()
            
            def log_message(self, format, *args):
                # Suppress default logging
                pass
        
        def create_handler(agent):
            def handler(*args, **kwargs):
                return AgentAPIHandler(agent, *args, **kwargs)
            return handler
        
        def start_server():
            try:
                port = 47114  # Different from HostAgent port
                self.api_server = socketserver.TCPServer(("127.0.0.1", port), create_handler(self))
                logger.info(f"Agent API server started on http://127.0.0.1:{port}")
                self.api_server.serve_forever()
            except Exception as e:
                logger.error(f"Failed to start API server: {e}")
        
        # Start server in background thread (non-daemon so it stays alive)
        server_thread = threading.Thread(target=start_server, daemon=False)
        server_thread.start()
        
        # Give the server a moment to start
        import time
        time.sleep(0.5)
    
    def enroll_device(self, enrollment_token):
        try:
            logger.info("Enrolling device with server...")
            
            # Get system info
            system_info = self.get_system_info()
            
            # Send enrollment request
            response = requests.post(
                f"{self.server_url}/api/enroll/complete",
                json={
                    "enrollment_token": enrollment_token,
                    "os": system_info["platform"],
                    "hostname": system_info["hostname"],
                    "agent_version": "1.0.0"
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                self.device_token = data.get("device_token")
                self.device_id = data.get("device_id")
                
                # Save config
                config = {
                    "device_token": self.device_token,
                    "device_id": self.device_id,
                    "server_url": self.server_url,
                    "enrolled_at": time.time()
                }
                self.save_config(config)
                
                logger.info(f"Device enrolled successfully! Device ID: {self.device_id}")
                # Inject device ID into browser
                self.inject_device_id()
                return True
            else:
                logger.error(f"Enrollment failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Enrollment error: {e}")
            return False
    
    def send_heartbeat(self):
        """Send heartbeat to server"""
        if not self.device_token:
            logger.error("No device token available")
            return False
            
        try:
            system_info = self.get_system_info()
            active_window = self.get_active_window_info()
            
            # Prepare heartbeat data with system metrics and user context
            heartbeat_data = {
                "cpu": system_info.get("cpu_percent", 0.0),
                "mem": system_info.get("memory_percent", 0.0),
                "activeWindow": active_window.get("title", "Unknown"),
                "isLocked": False,  # Could be enhanced to detect screen lock
                "timestamp": time.time(),
                "system_info": system_info,
                "user": self.current_user  # Include current user context
            }
            
            response = requests.post(
                f"{self.server_url}/api/ingest/heartbeat",
                headers={
                    "Authorization": f"Bearer {self.device_token}",
                    "Content-Type": "application/json"
                },
                json=heartbeat_data,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info("Heartbeat sent successfully")
                return True
            else:
                logger.error(f"Heartbeat failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Heartbeat error: {e}")
            return False
    
    def send_screenshot(self):
        """Send screenshot to server"""
        if not self.device_token:
            logger.error("No device token available")
            return False
        
        if not SCREENSHOT_AVAILABLE:
            logger.warning("Screenshot capture not available")
            return False
            
        try:
            screenshot_data = self.capture_screenshot()
            if not screenshot_data:
                logger.warning("Failed to capture screenshot")
                return False
            
            # Add user context to screenshot data
            screenshot_data['user'] = self.current_user
            
            response = requests.post(
                f"{self.server_url}/api/ingest/screenshot",
                headers={
                    "Authorization": f"Bearer {self.device_token}",
                    "Content-Type": "application/json"
                },
                json=screenshot_data,
                timeout=30
            )
            
            if response.status_code == 200:
                logger.info("Screenshot sent successfully")
                return True
            else:
                logger.error(f"Screenshot failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Screenshot error: {e}")
            return False
    
    def run(self, enrollment_token=None):
        """Main agent loop"""
        logger.info("Starting Creative Connect Monitoring Agent")
        
        # Load existing config
        config = self.load_config()
        self.device_token = config.get("device_token")
        self.device_id = config.get("device_id")
        self.current_user = config.get("current_user")  # Load cached user context
        
        # If no token and enrollment token provided, enroll
        if not self.device_token and enrollment_token:
            if not self.enroll_device(enrollment_token):
                logger.error("Failed to enroll device. Exiting.")
                return False
        
        # If still no token, can't proceed
        if not self.device_token:
            logger.error("No device token available. Please enroll first.")
            return False
        
        logger.info(f"Agent running for device {self.device_id}")
        
        # Start API server for frontend communication
        self.start_api_server()
        
        # Remove the unreliable HTML injection
        # self.inject_device_id()  # Remove this line
        
        # Fetch initial user context
        self.fetch_user_context()
        
        # Start screenshot thread
        screenshot_thread = threading.Thread(target=self._screenshot_loop, daemon=True)
        screenshot_thread.start()
        
        # Start context polling thread
        context_thread = threading.Thread(target=self._context_polling_loop, daemon=True)
        context_thread.start()
        
        # Main loop - send heartbeats every 30 seconds
        try:
            while True:
                self.send_heartbeat()
                time.sleep(30)
        except KeyboardInterrupt:
            logger.info("Agent stopped by user")
        except Exception as e:
            logger.error(f"Agent error: {e}")
        
        return True
    
    def _screenshot_loop(self):
        """Screenshot capture loop running in separate thread"""
        logger.info("Screenshot capture thread started")
        while True:
            try:
                self.send_screenshot()
                time.sleep(3)  # Capture every 3 seconds
            except Exception as e:
                logger.error(f"Screenshot loop error: {e}")
                time.sleep(3)  # Wait before retrying
    
    def _context_polling_loop(self):
        """Context polling loop running in separate thread"""
        logger.info("Context polling thread started")
        while True:
            try:
                self.fetch_user_context()
                time.sleep(60)  # Poll every 60 seconds
            except Exception as e:
                logger.error(f"Context polling error: {e}")
                time.sleep(60)  # Wait before retrying

def main():
    parser = argparse.ArgumentParser(description="Creative Connect Monitoring Agent")
    parser.add_argument("--enroll-token", help="One-time enrollment token")
    parser.add_argument("--server-url", default="http://localhost:8000", help="Server URL")
    
    args = parser.parse_args()
    
    agent = MonitoringAgent(args.server_url)
    success = agent.run(args.enroll_token)
    
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
