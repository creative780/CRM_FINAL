#!/usr/bin/env python3
"""
Build script for CRM monitoring agent
Creates platform-specific executables using PyInstaller
"""

import os
import sys
import platform
import subprocess
import shutil
from pathlib import Path


def build_agent():
    """Build the agent executable"""
    print("Building CRM Monitoring Agent...")
    
    # Get platform info
    system = platform.system().lower()
    arch = platform.machine().lower()
    
    print(f"Platform: {system} {arch}")
    
    # PyInstaller command
    cmd = [
        'pyinstaller',
        '--onefile',
        # Removed --windowed to show console window for debugging
        '--name', 'crm-monitoring-agent',
        '--add-data', 'requirements.txt:.',
        '--hidden-import', 'PIL',
        '--hidden-import', 'mss',
        '--hidden-import', 'psutil',
        '--hidden-import', 'websocket',
        '--hidden-import', 'requests',
        '--hidden-import', 'win32gui',  # Windows only
        '--hidden-import', 'win32api',   # Windows only
        '--hidden-import', 'winreg',     # Windows only
        '--hidden-import', 'Quartz',     # macOS only
        'main.py'
    ]
    
    # Platform-specific adjustments
    if system == 'windows':
        cmd.extend(['--icon', 'icon.ico'])  # Add icon if available
    elif system == 'darwin':
        cmd.extend(['--icon', 'icon.icns'])  # Add icon if available
    
    try:
        # Run PyInstaller
        print("Running PyInstaller...")
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print("Build completed successfully!")
        
        # Move executable to dist folder with platform suffix
        exe_name = f"crm-monitoring-agent-{system}-{arch}"
        if system == 'windows':
            exe_name += '.exe'
        
        src_path = Path('dist') / 'crm-monitoring-agent'
        if system == 'windows':
            src_path = src_path.with_suffix('.exe')
        
        dst_path = Path('dist') / exe_name
        
        if src_path.exists():
            shutil.move(str(src_path), str(dst_path))
            print(f"Executable created: {dst_path}")
            
            # Create installer script
            create_installer(dst_path, system)
        else:
            print(f"Executable not found at {src_path}")
            
    except subprocess.CalledProcessError as e:
        print(f"Build failed: {e}")
        print(f"Error output: {e.stderr}")
        return False
    except Exception as e:
        print(f"Build error: {e}")
        return False
    
    return True


def create_installer(agent_path: Path, system: str):
    """Create installer script for the agent"""
    installer_name = f"install-agent-{system}.sh"
    if system == 'windows':
        installer_name = f"install-agent-{system}.bat"
    
    installer_path = Path('dist') / installer_name
    
    if system == 'windows':
        installer_content = f"""@echo off
echo Installing CRM Monitoring Agent...

REM Create installation directory
set INSTALL_DIR=%APPDATA%\\CRM_Agent
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

REM Copy agent executable
copy "{agent_path.name}" "%INSTALL_DIR%\\crm-monitoring-agent.exe"

REM Enable auto-start
"%INSTALL_DIR%\\crm-monitoring-agent.exe" --auto-start enable

echo Installation completed!
echo Agent installed to: %INSTALL_DIR%
pause
"""
    else:
        installer_content = f"""#!/bin/bash
echo "Installing CRM Monitoring Agent..."

# Create installation directory
INSTALL_DIR="$HOME/.local/bin"
mkdir -p "$INSTALL_DIR"

# Copy agent executable
cp "{agent_path.name}" "$INSTALL_DIR/crm-monitoring-agent"
chmod +x "$INSTALL_DIR/crm-monitoring-agent"

# Enable auto-start
"$INSTALL_DIR/crm-monitoring-agent" --auto-start enable

echo "Installation completed!"
echo "Agent installed to: $INSTALL_DIR"
"""
    
    with open(installer_path, 'w') as f:
        f.write(installer_content)
    
    if system != 'windows':
        os.chmod(installer_path, 0o755)
    
    print(f"Installer created: {installer_path}")


def clean_build():
    """Clean build artifacts"""
    print("Cleaning build artifacts...")
    
    # Remove build directories
    dirs_to_remove = ['build', 'dist', '__pycache__']
    for dir_name in dirs_to_remove:
        if os.path.exists(dir_name):
            shutil.rmtree(dir_name)
            print(f"Removed {dir_name}/")
    
    # Remove spec file
    spec_file = Path('crm-monitoring-agent.spec')
    if spec_file.exists():
        spec_file.unlink()
        print("Removed spec file")


def main():
    """Main build process"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Build CRM Monitoring Agent')
    parser.add_argument('--clean', action='store_true', help='Clean build artifacts first')
    parser.add_argument('--clean-only', action='store_true', help='Only clean, do not build')
    
    args = parser.parse_args()
    
    if args.clean or args.clean_only:
        clean_build()
    
    if args.clean_only:
        return
    
    # Check if PyInstaller is installed
    try:
        subprocess.run(['pyinstaller', '--version'], check=True, capture_output=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("PyInstaller not found. Installing...")
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'pyinstaller'], check=True)
    
    # Build the agent
    success = build_agent()
    
    if success:
        print("\nBuild completed successfully!")
        print("Executable and installer are in the dist/ directory")
    else:
        print("\nBuild failed!")
        sys.exit(1)


if __name__ == '__main__':
    main()
