#!/usr/bin/env python3
"""
CRM Monitoring Agent

A cross-platform monitoring agent that captures screenshots and system metrics,
sending them to the CRM backend for admin monitoring.
"""

import os
import sys
import json
import time
import threading
import platform
import socket
import hashlib
import base64
import requests
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any

# Third-party imports (will be installed via requirements.txt)
try:
    import mss
    import psutil
    from PIL import Image
    import websocket
except ImportError as e:
    print(f"Missing required dependency: {e}")
    print("Please install requirements: pip install -r requirements.txt")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('agent.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class AgentConfig:
    """Agent configuration management"""
    
    def __init__(self, config_path: str = None):
        self.config_path = config_path or self._get_default_config_path()
        self.config = self._load_config()
    
    def _get_default_config_path(self) -> str:
        """Get default config file path based on OS"""
        if platform.system() == "Windows":
            return os.path.join(os.environ.get('APPDATA', ''), 'CRM_Agent', 'config.json')
        else:
            return os.path.join(os.path.expanduser('~'), '.config', 'crm_agent', 'config.json')
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from file"""
        default_config = {
            'server_base_url': 'http://localhost:8000',
            'device_token': None,
            'device_id': None,
            'screenshot_freq_sec': 15,
            'heartbeat_freq_sec': 20,
            'auto_start': True,
            'debug': False
        }
        
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, 'r') as f:
                    config = json.load(f)
                    # Merge with defaults
                    for key, value in default_config.items():
                        if key not in config:
                            config[key] = value
                    return config
        except Exception as e:
            logger.warning(f"Failed to load config: {e}")
        
        return default_config
    
    def save_config(self):
        """Save configuration to file"""
        try:
            os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
            with open(self.config_path, 'w') as f:
                json.dump(self.config, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save config: {e}")
    
    def get(self, key: str, default=None):
        """Get configuration value"""
        return self.config.get(key, default)
    
    def set(self, key: str, value: Any):
        """Set configuration value"""
        self.config[key] = value


class SystemInfo:
    """System information gathering"""
    
    @staticmethod
    def get_hostname() -> str:
        """Get system hostname"""
        return socket.gethostname()
    
    @staticmethod
    def get_os() -> str:
        """Get operating system name"""
        return platform.system()
    
    @staticmethod
    def get_cpu_percent() -> float:
        """Get CPU usage percentage"""
        return psutil.cpu_percent(interval=1)
    
    @staticmethod
    def get_memory_percent() -> float:
        """Get memory usage percentage"""
        return psutil.virtual_memory().percent
    
    @staticmethod
    def get_active_window() -> Optional[str]:
        """Get active window title (platform-specific)"""
        try:
            if platform.system() == "Windows":
                import win32gui
                import win32process
                import psutil
                
                # Get foreground window
                hwnd = win32gui.GetForegroundWindow()
                logger.debug(f"Foreground window handle: {hwnd}")
                
                if hwnd == 0:
                    logger.debug("No foreground window, returning Desktop")
                    return "Desktop"
                
                # Get window title
                window_title = win32gui.GetWindowText(hwnd)
                logger.debug(f"Window title: '{window_title}'")
                
                if window_title:
                    return window_title
                
                # If no title, try to get process name
                try:
                    _, pid = win32process.GetWindowThreadProcessId(hwnd)
                    process = psutil.Process(pid)
                    process_name = process.name()
                    logger.debug(f"Process name: {process_name}")
                    return f"{process_name}"
                except Exception as e:
                    logger.debug(f"Failed to get process name: {e}")
                    return "Unknown Application"
                    
            elif platform.system() == "Darwin":  # macOS
                import subprocess
                result = subprocess.run([
                    'osascript', '-e',
                    'tell application "System Events" to get name of first application process whose frontmost is true'
                ], capture_output=True, text=True)
                return result.stdout.strip() if result.returncode == 0 else "Unknown"
            else:  # Linux
                import subprocess
                result = subprocess.run([
                    'xprop', '-id', '$(xprop -root _NET_ACTIVE_WINDOW | cut -d" " -f5)', 'WM_NAME'
                ], capture_output=True, text=True, shell=True)
                if result.returncode == 0:
                    return result.stdout.split('=')[1].strip('"')
        except Exception as e:
            logger.error(f"Failed to get active window: {e}")
        return "Unknown"
    
    @staticmethod
    def is_screen_locked() -> bool:
        """Check if screen is locked (platform-specific)"""
        try:
            if platform.system() == "Windows":
                import ctypes
                return ctypes.windll.user32.GetForegroundWindow() == 0
            elif platform.system() == "Darwin":  # macOS
                import subprocess
                result = subprocess.run([
                    'python3', '-c',
                    'import Quartz; print(Quartz.CGSessionCopyCurrentDictionary() is None)'
                ], capture_output=True, text=True)
                return result.stdout.strip() == 'True' if result.returncode == 0 else False
            else:  # Linux
                import subprocess
                result = subprocess.run(['gnome-screensaver-command', '--query'], capture_output=True)
                return 'is active' in result.stdout.decode() if result.returncode == 0 else False
        except Exception as e:
            logger.debug(f"Failed to check screen lock: {e}")
        return False


class KeystrokeMonitor:
    """Monitor keystrokes and mouse clicks"""
    
    def __init__(self):
        self.keystroke_count = 0
        self.mouse_click_count = 0
        self.last_activity_time = time.time()
        self.running = False
        self.lock = threading.Lock()
        
    def start_monitoring(self):
        """Start keystroke and mouse monitoring"""
        try:
            from pynput import keyboard, mouse
            
            def on_key_press(key):
                with self.lock:
                    self.keystroke_count += 1
                    self.last_activity_time = time.time()
                    
            def on_mouse_click(x, y, button, pressed):
                if pressed:
                    with self.lock:
                        self.mouse_click_count += 1
                        self.last_activity_time = time.time()
            
            # Start listeners
            keyboard_listener = keyboard.Listener(on_press=on_key_press)
            mouse_listener = mouse.Listener(on_click=on_mouse_click)
            
            keyboard_listener.start()
            mouse_listener.start()
            
            self.running = True
            logger.info("Keystroke monitoring started")
            
        except Exception as e:
            logger.error(f"Failed to start keystroke monitoring: {e}")
    
    def get_activity_data(self) -> Dict[str, Any]:
        """Get current activity data and reset counters"""
        with self.lock:
            data = {
                'keystroke_count': self.keystroke_count,
                'mouse_click_count': self.mouse_click_count,
                'last_activity_time': self.last_activity_time
            }
            # Reset counters
            self.keystroke_count = 0
            self.mouse_click_count = 0
            return data


class IdleDetector:
    """Detect idle periods and generate alerts"""
    
    def __init__(self, idle_threshold_minutes: int = 30):
        self.idle_threshold_seconds = idle_threshold_minutes * 60
        self.last_activity_time = time.time()
        self.idle_alerts_sent = set()
        
    def update_activity(self, last_activity_time: float):
        """Update last activity time"""
        self.last_activity_time = last_activity_time
        
    def get_idle_time_seconds(self) -> float:
        """Get current idle time in seconds"""
        return time.time() - self.last_activity_time
        
    def is_idle(self) -> bool:
        """Check if user is currently idle"""
        return self.get_idle_time_seconds() > self.idle_threshold_seconds
        
    def should_send_alert(self) -> bool:
        """Check if an idle alert should be sent"""
        idle_time = self.get_idle_time_seconds()
        if idle_time > self.idle_threshold_seconds:
            # Send alert every 30 minutes of idle time
            alert_key = int(idle_time // self.idle_threshold_seconds)
            if alert_key not in self.idle_alerts_sent:
                self.idle_alerts_sent.add(alert_key)
                return True
        else:
            # Reset alerts when user becomes active
            self.idle_alerts_sent.clear()
        return False


class PerformanceTracker:
    """Track and calculate performance metrics"""
    
    def __init__(self):
        self.session_start_time = time.time()
        self.total_keystrokes = 0
        self.total_mouse_clicks = 0
        self.total_active_time = 0
        self.application_usage = {}
        
    def update_metrics(self, keystroke_count: int, mouse_click_count: int, 
                      active_window: str, time_delta: float):
        """Update performance metrics"""
        self.total_keystrokes += keystroke_count
        self.total_mouse_clicks += mouse_click_count
        
        # Track application usage
        if active_window and active_window != "Unknown":
            if active_window not in self.application_usage:
                self.application_usage[active_window] = 0
            self.application_usage[active_window] += time_delta
            
        # Update active time if there was activity
        if keystroke_count > 0 or mouse_click_count > 0:
            self.total_active_time += time_delta
            
    def calculate_productivity_score(self) -> float:
        """Calculate productivity score (0-100)"""
        session_duration = time.time() - self.session_start_time
        if session_duration == 0:
            return 0
            
        # Base score on activity ratio
        activity_ratio = self.total_active_time / session_duration
        
        # Factor in keystroke and click rates
        keystroke_rate = self.total_keystrokes / (session_duration / 60)  # per minute
        click_rate = self.total_mouse_clicks / (session_duration / 60)  # per minute
        
        # Normalize rates (typical rates: 40-80 keystrokes/min, 10-30 clicks/min)
        normalized_keystroke = min(keystroke_rate / 60, 1.0)
        normalized_click = min(click_rate / 20, 1.0)
        
        # Calculate weighted score
        productivity_score = (
            activity_ratio * 0.5 +
            normalized_keystroke * 0.3 +
            normalized_click * 0.2
        ) * 100
        
        return min(productivity_score, 100)
        
    def get_performance_data(self) -> Dict[str, Any]:
        """Get current performance data"""
        session_duration = time.time() - self.session_start_time
        return {
            'session_duration_minutes': session_duration / 60,
            'total_keystrokes': self.total_keystrokes,
            'total_mouse_clicks': self.total_mouse_clicks,
            'total_active_time_minutes': self.total_active_time / 60,
            'productivity_score': self.calculate_productivity_score(),
            'keystroke_rate_per_minute': self.total_keystrokes / (session_duration / 60) if session_duration > 0 else 0,
            'click_rate_per_minute': self.total_mouse_clicks / (session_duration / 60) if session_duration > 0 else 0,
            'top_applications': dict(sorted(self.application_usage.items(), key=lambda x: x[1], reverse=True)[:5])
        }


class ScreenshotCapture:
    """Screenshot capture functionality"""
    
    def __init__(self):
        # Test if mss is available but don't store instance
        try:
            test_mss = mss.mss()
            test_mss.close()  # Clean up test instance
            self.available = True
        except Exception as e:
            logger.warning(f"Screenshot capture not available: {e}")
            self.available = False
    
    def capture_screenshot(self) -> Optional[Dict[str, Any]]:
        """Capture screenshot and return metadata"""
        try:
            if not self.available:
                return None
                
            # Create fresh mss instance for this thread
            with mss.mss() as screenshot:
                # Get primary monitor
                monitor = screenshot.monitors[1]  # 0 is all monitors, 1 is primary
                
                # Capture screenshot
                screen_capture = screenshot.grab(monitor)
                
                # Convert to PIL Image
                img = Image.frombytes("RGB", screen_capture.size, screen_capture.bgra, "raw", "BGRX")
                
                # Resize if too large (max 1920x1080)
                max_width, max_height = 1920, 1080
                if img.width > max_width or img.height > max_height:
                    img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
                
                # Convert to JPEG
                import io
                buffer = io.BytesIO()
                img.save(buffer, format='JPEG', quality=80)
                image_data = buffer.getvalue()
                
                # Calculate hash
                sha256_hash = hashlib.sha256(image_data).hexdigest()
                
                # Encode to base64
                image_b64 = base64.b64encode(image_data).decode('utf-8')
                
                return {
                    'image': image_b64,
                    'width': img.width,
                    'height': img.height,
                    'sha256': sha256_hash,
                    'taken_at': datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Failed to capture screenshot: {e}")
            return None


class AgentAPI:
    """API communication with backend"""
    
    def __init__(self, config: AgentConfig):
        self.config = config
        self.base_url = config.get('server_base_url')
        self.device_token = config.get('device_token')
        self.device_id = config.get('device_id')
    
    def enroll_device(self, enrollment_token: str) -> bool:
        """Enroll device with backend"""
        try:
            data = {
                'enrollment_token': enrollment_token,
                'os': SystemInfo.get_os(),
                'hostname': SystemInfo.get_hostname(),
                'agent_version': '1.0.0',
                'ip': self._get_public_ip()
            }
            
            response = requests.post(
                f"{self.base_url}/api/enroll/complete",
                json=data,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                self.device_token = result['device_token']
                self.device_id = result['device_id']
                
                # Save to config
                self.config.set('device_token', self.device_token)
                self.config.set('device_id', self.device_id)
                self.config.save_config()
                
                logger.info(f"Device enrolled successfully: {self.device_id}")
                return True
            else:
                logger.error(f"Enrollment failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Enrollment error: {e}")
            return False
    
    def send_heartbeat(self, cpu_percent: float, mem_percent: float, 
                      active_window: Optional[str], is_locked: bool) -> bool:
        """Send heartbeat to backend"""
        try:
            data = {
                'cpu': cpu_percent,
                'mem': mem_percent,
                'activeWindow': active_window,
                'isLocked': is_locked,
                'ip': self._get_public_ip()
            }
            
            headers = {
                'Authorization': f'Bearer {self.device_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(
                f"{self.base_url}/api/ingest/heartbeat",
                json=data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.debug("Heartbeat sent successfully")
                return True
            else:
                logger.warning(f"Heartbeat failed: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Heartbeat error: {e}")
            return False
    
    def send_enhanced_heartbeat(self, cpu_percent: float, mem_percent: float, 
                              active_window: Optional[str], is_locked: bool,
                              activity_data: Dict[str, Any], performance_data: Dict[str, Any],
                              idle_alert: bool = False) -> bool:
        """Send enhanced heartbeat with activity and performance data"""
        try:
            data = {
                'cpu': cpu_percent,
                'mem': mem_percent,
                'activeWindow': active_window,
                'isLocked': is_locked,
                'ip': self._get_public_ip(),
                # Phase 2: Enhanced monitoring data
                'keystroke_count': activity_data.get('keystroke_count', 0),
                'mouse_click_count': activity_data.get('mouse_click_count', 0),
                'productivity_score': performance_data.get('productivity_score', 0),
                'keystroke_rate_per_minute': performance_data.get('keystroke_rate_per_minute', 0),
                'click_rate_per_minute': performance_data.get('click_rate_per_minute', 0),
                'active_time_minutes': performance_data.get('total_active_time_minutes', 0),
                'session_duration_minutes': performance_data.get('session_duration_minutes', 0),
                'top_applications': performance_data.get('top_applications', {}),
                'idle_alert': idle_alert
            }
            
            headers = {
                'Authorization': f'Bearer {self.device_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(
                f"{self.base_url}/api/ingest/heartbeat",
                json=data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.debug("Enhanced heartbeat sent successfully")
                return True
            else:
                logger.warning(f"Enhanced heartbeat failed: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Enhanced heartbeat error: {e}")
            return False
    
    def send_screenshot(self, screenshot_data: Dict[str, Any]) -> bool:
        """Send screenshot to backend"""
        try:
            headers = {
                'Authorization': f'Bearer {self.device_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(
                f"{self.base_url}/api/ingest/screenshot",
                json=screenshot_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                logger.debug("Screenshot sent successfully")
                return True
            else:
                logger.warning(f"Screenshot failed: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Screenshot error: {e}")
            return False
    
    def _get_local_ip(self) -> str:
        """Get local IP address"""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except:
            return "127.0.0.1"
    
    def _get_public_ip(self) -> str:
        """Get public IP address"""
        try:
            # Try multiple services for reliability
            services = [
                "https://api.ipify.org",
                "https://ipinfo.io/ip",
                "https://icanhazip.com",
                "https://ident.me"
            ]
            
            for service in services:
                try:
                    response = requests.get(service, timeout=5)
                    if response.status_code == 200:
                        ip = response.text.strip()
                        # Validate IP format
                        if self._is_valid_ip(ip):
                            return ip
                except:
                    continue
            
            # Fallback to local IP if all services fail
            return self._get_local_ip()
        except:
            return self._get_local_ip()
    
    def _is_valid_ip(self, ip: str) -> bool:
        """Validate IP address format"""
        try:
            parts = ip.split('.')
            if len(parts) != 4:
                return False
            for part in parts:
                if not part.isdigit() or int(part) < 0 or int(part) > 255:
                    return False
            return True
        except:
            return False


class MonitoringAgent:
    """Main monitoring agent class"""
    
    def __init__(self, config_path: str = None):
        self.config = AgentConfig(config_path)
        self.api = AgentAPI(self.config)
        self.screenshot_capture = ScreenshotCapture()
        # Phase 2: Add new monitoring components
        self.keystroke_monitor = KeystrokeMonitor()
        self.idle_detector = IdleDetector()
        self.performance_tracker = PerformanceTracker()
        self.running = False
        self.threads = []
        self.api_server = None  # Add API server for device ID
        self.last_heartbeat_time = time.time()
        
        # Set logging level
        if self.config.get('debug'):
            logging.getLogger().setLevel(logging.DEBUG)
    
    def enroll(self, enrollment_token: str) -> bool:
        """Enroll device with backend"""
        return self.api.enroll_device(enrollment_token)
    
    def start_api_server(self):
        """Start local API server for frontend communication"""
        import http.server
        import socketserver
        
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
                    
                    device_id = self.agent.api.device_id
                    if device_id:
                        response = {
                            'device_id': device_id,
                            'status': 'active',
                            'hostname': SystemInfo.get_hostname()
                        }
                    else:
                        response = {'error': 'Device not enrolled'}
                    
                    self.wfile.write(json.dumps(response).encode())
                else:
                    self.send_response(404)
                    self.end_headers()
                    self.wfile.write(b'Not found')
            
            def do_OPTIONS(self):
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                self.end_headers()
        
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
        
        # Start server in background thread
        server_thread = threading.Thread(target=start_server, daemon=True)
        server_thread.start()
        self.threads.append(server_thread)
    
    def start(self):
        """Start monitoring agent"""
        if not self.api.device_token:
            logger.error("No device token found. Please enroll first.")
            return False
        
        self.running = True
        logger.info("Starting monitoring agent...")
        
        # Start API server for device ID communication
        self.start_api_server()
        
        # Phase 2: Start keystroke monitoring
        self.keystroke_monitor.start_monitoring()
        
        # Start heartbeat thread
        heartbeat_thread = threading.Thread(target=self._enhanced_heartbeat_loop, daemon=True)
        heartbeat_thread.start()
        self.threads.append(heartbeat_thread)
        
        # Start screenshot thread
        screenshot_thread = threading.Thread(target=self._screenshot_loop, daemon=True)
        screenshot_thread.start()
        self.threads.append(screenshot_thread)
        
        logger.info("Enhanced monitoring agent started successfully")
        return True
    
    def stop(self):
        """Stop monitoring agent"""
        logger.info("Stopping monitoring agent...")
        self.running = False
        
        # Stop API server
        if self.api_server:
            self.api_server.shutdown()
            self.api_server.server_close()
        
        # Wait for threads to finish
        for thread in self.threads:
            thread.join(timeout=5)
        
        logger.info("Monitoring agent stopped")
    
    def _heartbeat_loop(self):
        """Heartbeat loop"""
        freq_sec = self.config.get('heartbeat_freq_sec', 20)
        
        while self.running:
            try:
                cpu_percent = SystemInfo.get_cpu_percent()
                mem_percent = SystemInfo.get_memory_percent()
                active_window = SystemInfo.get_active_window()
                is_locked = SystemInfo.is_screen_locked()
                
                self.api.send_heartbeat(cpu_percent, mem_percent, active_window, is_locked)
                
            except Exception as e:
                logger.error(f"Heartbeat loop error: {e}")
            
            time.sleep(freq_sec)
    
    def _enhanced_heartbeat_loop(self):
        """Enhanced heartbeat loop with Phase 2 features"""
        freq_sec = self.config.get('heartbeat_freq_sec', 20)
        
        while self.running:
            try:
                current_time = time.time()
                time_delta = current_time - self.last_heartbeat_time
                
                # Get system info
                cpu_percent = SystemInfo.get_cpu_percent()
                mem_percent = SystemInfo.get_memory_percent()
                active_window = SystemInfo.get_active_window()
                is_locked = SystemInfo.is_screen_locked()
                
                # Get activity data
                activity_data = self.keystroke_monitor.get_activity_data()
                
                # Update idle detector
                self.idle_detector.update_activity(activity_data['last_activity_time'])
                
                # Update performance tracker
                self.performance_tracker.update_metrics(
                    activity_data['keystroke_count'],
                    activity_data['mouse_click_count'],
                    active_window,
                    time_delta
                )
                
                # Get performance data
                performance_data = self.performance_tracker.get_performance_data()
                
                # Check for idle alert
                idle_alert = self.idle_detector.should_send_alert()
                
                # Send enhanced heartbeat
                self.api.send_enhanced_heartbeat(
                    cpu_percent, mem_percent, active_window, is_locked,
                    activity_data, performance_data, idle_alert
                )
                
                self.last_heartbeat_time = current_time
                
            except Exception as e:
                logger.error(f"Enhanced heartbeat loop error: {e}")
            
            time.sleep(freq_sec)
    
    def _screenshot_loop(self):
        """Screenshot capture loop"""
        freq_sec = self.config.get('screenshot_freq_sec', 15)
        
        while self.running:
            try:
                # Skip if screen is locked
                if SystemInfo.is_screen_locked():
                    logger.debug("Skipping screenshot - screen is locked")
                    time.sleep(freq_sec)
                    continue
                
                screenshot_data = self.screenshot_capture.capture_screenshot()
                if screenshot_data:
                    self.api.send_screenshot(screenshot_data)
                
            except Exception as e:
                logger.error(f"Screenshot loop error: {e}")
            
            time.sleep(freq_sec)


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='CRM Monitoring Agent')
    parser.add_argument('--enroll-token', help='Enrollment token for device registration')
    parser.add_argument('--config', help='Path to config file')
    parser.add_argument('--debug', action='store_true', help='Enable debug logging')
    
    args = parser.parse_args()
    
    # Create agent
    agent = MonitoringAgent(args.config)
    
    if args.debug:
        agent.config.set('debug', True)
        agent.config.save_config()
    
    # Handle enrollment
    if args.enroll_token:
        if agent.enroll(args.enroll_token):
            logger.info("Device enrolled successfully")
        else:
            logger.error("Device enrollment failed")
            sys.exit(1)
    
    # Start agent
    if agent.start():
        try:
            # Keep running
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("Received interrupt signal")
        finally:
            agent.stop()
    else:
        logger.error("Failed to start agent")
        sys.exit(1)


if __name__ == '__main__':
    main()
