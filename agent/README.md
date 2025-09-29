# CRM Monitoring Agent

A cross-platform monitoring agent that captures screenshots and system metrics, sending them to the CRM backend for admin monitoring.

## Features

- **Cross-platform support**: Windows, macOS, and Linux
- **Screenshot capture**: Automatic screenshot capture with configurable frequency
- **System monitoring**: CPU, memory, and active window tracking
- **Auto-start**: Automatically starts with the system
- **Privacy-aware**: Respects screen lock status and can be paused
- **Secure communication**: Uses device tokens for authentication

## Installation

### Prerequisites

- Python 3.8 or higher
- Required system permissions for screenshot capture
- Network access to the CRM backend

### Development Setup

1. Clone or download the agent code
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the agent:
   ```bash
   python main.py --enroll-token YOUR_ENROLLMENT_TOKEN
   ```

### Production Installation

1. Build the executable:
   ```bash
   python build.py
   ```
2. Run the installer for your platform:
   - Windows: `install-agent-windows.bat`
   - macOS: `install-agent-macos.sh`
   - Linux: `install-agent-linux.sh`

## Usage

### Command Line Options

```bash
python main.py [options]

Options:
  --enroll-token TOKEN    Enrollment token for device registration
  --config PATH          Path to config file
  --debug               Enable debug logging
```

### Configuration

The agent stores its configuration in a platform-specific location:

- **Windows**: `%APPDATA%/CRM_Agent/config.json`
- **macOS**: `~/.config/crm_agent/config.json`
- **Linux**: `~/.config/crm_agent/config.json`

Example configuration:
```json
{
  "server_base_url": "http://localhost:8000",
  "device_token": "your_device_token",
  "device_id": "your_device_id",
  "screenshot_freq_sec": 15,
  "heartbeat_freq_sec": 20,
  "auto_start": true,
  "debug": false
}
```

### Auto-start Management

Enable auto-start:
```bash
python auto_start.py enable --agent-path /path/to/agent
```

Disable auto-start:
```bash
python auto_start.py disable --agent-path /path/to/agent
```

## Privacy and Security

- **Screenshot capture**: Only captures when screen is unlocked
- **Data transmission**: All data is transmitted over HTTPS
- **Authentication**: Uses secure device tokens
- **Local storage**: Minimal local data storage
- **User control**: Can be paused or uninstalled at any time

## Troubleshooting

### Common Issues

1. **Permission denied**: Ensure the agent has necessary permissions for screenshot capture
2. **Network errors**: Check network connectivity and backend URL
3. **Auto-start not working**: Verify platform-specific auto-start setup
4. **High CPU usage**: Adjust screenshot frequency in configuration

### Logs

The agent logs to:
- Console output (if running interactively)
- `agent.log` file in the agent directory
- Platform-specific log locations for auto-start

### Debug Mode

Enable debug logging for troubleshooting:
```bash
python main.py --debug
```

## Development

### Building from Source

1. Install build dependencies:
   ```bash
   pip install pyinstaller
   ```

2. Build the executable:
   ```bash
   python build.py
   ```

3. Test the build:
   ```bash
   ./dist/crm-monitoring-agent --help
   ```

### Platform-Specific Notes

#### Windows
- Requires `pywin32` for window management
- Uses Windows Registry for auto-start
- Screenshot capture uses `mss` library

#### macOS
- Requires `pyobjc` for system integration
- Uses LaunchAgents for auto-start
- Screenshot capture respects privacy settings

#### Linux
- Uses systemd user services for auto-start
- Requires X11 or Wayland for screenshot capture
- May need additional permissions for window management

## License

This agent is part of the CRM monitoring system and is subject to the same license terms.

## Support

For issues or questions:
1. Check the logs for error messages
2. Verify network connectivity
3. Contact your system administrator
4. Check the backend server status
