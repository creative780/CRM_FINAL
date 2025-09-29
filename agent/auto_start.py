#!/usr/bin/env python3
"""
Auto-start functionality for the CRM monitoring agent
"""

import os
import sys
import platform
import subprocess
from pathlib import Path


class AutoStartManager:
    """Manage auto-start functionality across platforms"""
    
    def __init__(self, agent_path: str):
        self.agent_path = agent_path
        self.platform = platform.system()
    
    def enable_autostart(self) -> bool:
        """Enable auto-start for the agent"""
        try:
            if self.platform == "Windows":
                return self._enable_windows_autostart()
            elif self.platform == "Darwin":  # macOS
                return self._enable_macos_autostart()
            elif self.platform == "Linux":
                return self._enable_linux_autostart()
            else:
                print(f"Unsupported platform: {self.platform}")
                return False
        except Exception as e:
            print(f"Failed to enable auto-start: {e}")
            return False
    
    def disable_autostart(self) -> bool:
        """Disable auto-start for the agent"""
        try:
            if self.platform == "Windows":
                return self._disable_windows_autostart()
            elif self.platform == "Darwin":  # macOS
                return self._disable_macos_autostart()
            elif self.platform == "Linux":
                return self._disable_linux_autostart()
            else:
                print(f"Unsupported platform: {self.platform}")
                return False
        except Exception as e:
            print(f"Failed to disable auto-start: {e}")
            return False
    
    def _enable_windows_autostart(self) -> bool:
        """Enable auto-start on Windows"""
        try:
            import winreg
            
            key = winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                r"Software\Microsoft\Windows\CurrentVersion\Run",
                0,
                winreg.KEY_SET_VALUE
            )
            
            winreg.SetValueEx(key, "CRM_Monitoring_Agent", 0, winreg.REG_SZ, self.agent_path)
            winreg.CloseKey(key)
            
            print("Auto-start enabled for Windows")
            return True
            
        except Exception as e:
            print(f"Failed to enable Windows auto-start: {e}")
            return False
    
    def _disable_windows_autostart(self) -> bool:
        """Disable auto-start on Windows"""
        try:
            import winreg
            
            key = winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                r"Software\Microsoft\Windows\CurrentVersion\Run",
                0,
                winreg.KEY_SET_VALUE
            )
            
            try:
                winreg.DeleteValue(key, "CRM_Monitoring_Agent")
            except FileNotFoundError:
                pass  # Already disabled
            
            winreg.CloseKey(key)
            
            print("Auto-start disabled for Windows")
            return True
            
        except Exception as e:
            print(f"Failed to disable Windows auto-start: {e}")
            return False
    
    def _enable_macos_autostart(self) -> bool:
        """Enable auto-start on macOS"""
        try:
            plist_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.crm.monitoring.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>{self.agent_path}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/crm_agent.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/crm_agent_error.log</string>
</dict>
</plist>"""
            
            plist_path = Path.home() / "Library" / "LaunchAgents" / "com.crm.monitoring.agent.plist"
            plist_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(plist_path, 'w') as f:
                f.write(plist_content)
            
            # Load the plist
            subprocess.run(['launchctl', 'load', '-w', str(plist_path)], check=True)
            
            print("Auto-start enabled for macOS")
            return True
            
        except Exception as e:
            print(f"Failed to enable macOS auto-start: {e}")
            return False
    
    def _disable_macos_autostart(self) -> bool:
        """Disable auto-start on macOS"""
        try:
            plist_path = Path.home() / "Library" / "LaunchAgents" / "com.crm.monitoring.agent.plist"
            
            # Unload the plist
            subprocess.run(['launchctl', 'unload', str(plist_path)], check=False)
            
            # Remove the plist file
            if plist_path.exists():
                plist_path.unlink()
            
            print("Auto-start disabled for macOS")
            return True
            
        except Exception as e:
            print(f"Failed to disable macOS auto-start: {e}")
            return False
    
    def _enable_linux_autostart(self) -> bool:
        """Enable auto-start on Linux"""
        try:
            service_content = f"""[Unit]
Description=CRM Monitoring Agent
After=graphical-session.target

[Service]
Type=simple
ExecStart={self.agent_path}
Restart=always
RestartSec=10
User=%i
Environment=DISPLAY=:0

[Install]
WantedBy=default.target
"""
            
            service_path = Path.home() / ".config" / "systemd" / "user" / "crm-monitoring-agent.service"
            service_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(service_path, 'w') as f:
                f.write(service_content)
            
            # Enable and start the service
            subprocess.run(['systemctl', '--user', 'enable', 'crm-monitoring-agent.service'], check=True)
            subprocess.run(['systemctl', '--user', 'start', 'crm-monitoring-agent.service'], check=True)
            
            print("Auto-start enabled for Linux")
            return True
            
        except Exception as e:
            print(f"Failed to enable Linux auto-start: {e}")
            return False
    
    def _disable_linux_autostart(self) -> bool:
        """Disable auto-start on Linux"""
        try:
            service_path = Path.home() / ".config" / "systemd" / "user" / "crm-monitoring-agent.service"
            
            # Stop and disable the service
            subprocess.run(['systemctl', '--user', 'stop', 'crm-monitoring-agent.service'], check=False)
            subprocess.run(['systemctl', '--user', 'disable', 'crm-monitoring-agent.service'], check=False)
            
            # Remove the service file
            if service_path.exists():
                service_path.unlink()
            
            print("Auto-start disabled for Linux")
            return True
            
        except Exception as e:
            print(f"Failed to disable Linux auto-start: {e}")
            return False


def main():
    """Command line interface for auto-start management"""
    import argparse
    
    parser = argparse.ArgumentParser(description='CRM Agent Auto-start Manager')
    parser.add_argument('action', choices=['enable', 'disable'], help='Action to perform')
    parser.add_argument('--agent-path', required=True, help='Path to agent executable')
    
    args = parser.parse_args()
    
    manager = AutoStartManager(args.agent_path)
    
    if args.action == 'enable':
        success = manager.enable_autostart()
    else:
        success = manager.disable_autostart()
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
