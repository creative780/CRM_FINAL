# Creative Connect Agent Installer (PowerShell)
param(
    [Parameter(Mandatory=$false)]
    [string]$EnrollToken,
    
    [Parameter(Mandatory=$false)]
    [string]$ServerUrl = "http://localhost:8000"
)

Write-Host "Creative Connect Agent Installer" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Found Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python 3.7+ from https://python.org" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Create agent directory
$agentDir = Join-Path $env:USERPROFILE "CreativeConnectAgent"
if (-not (Test-Path $agentDir)) {
    New-Item -ItemType Directory -Path $agentDir -Force | Out-Null
    Write-Host "Created agent directory: $agentDir" -ForegroundColor Green
}

# Copy agent files
Write-Host "Installing agent files..." -ForegroundColor Yellow
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Copy-Item (Join-Path $scriptDir "agent.py") (Join-Path $agentDir "agent.py") -Force
Copy-Item (Join-Path $scriptDir "requirements.txt") (Join-Path $agentDir "requirements.txt") -Force

# Install Python dependencies
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
Set-Location $agentDir
try {
    pip install -r requirements.txt --quiet
    Write-Host "Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "Warning: Some dependencies may not have installed correctly" -ForegroundColor Yellow
}

# Create startup script
Write-Host "Creating startup script..." -ForegroundColor Yellow
$startScript = @"
@echo off
cd /d "$agentDir"
python agent.py --server-url $ServerUrl
"@
$startScript | Out-File -FilePath (Join-Path $agentDir "start_agent.bat") -Encoding ASCII

# Create auto-start entry
Write-Host "Setting up auto-start..." -ForegroundColor Yellow
$regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$regName = "CreativeConnectAgent"
$regValue = "`"$agentDir\start_agent.bat`""
try {
    Set-ItemProperty -Path $regPath -Name $regName -Value $regValue -Force
    Write-Host "Auto-start configured successfully" -ForegroundColor Green
} catch {
    Write-Host "Warning: Could not configure auto-start" -ForegroundColor Yellow
}

# Handle enrollment if token provided
if ($EnrollToken) {
    Write-Host "Enrolling device with provided token..." -ForegroundColor Yellow
    try {
        $enrollResult = python agent.py --enroll-token $EnrollToken --server-url $ServerUrl
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Device enrolled successfully!" -ForegroundColor Green
            Write-Host "Starting agent..." -ForegroundColor Yellow
            Start-Process (Join-Path $agentDir "start_agent.bat") -WindowStyle Minimized
        } else {
            Write-Host "Enrollment failed. Please check your token and try again." -ForegroundColor Red
            Read-Host "Press Enter to exit"
            exit 1
        }
    } catch {
        Write-Host "Enrollment error: $_" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host "Installation complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To enroll your device, run:" -ForegroundColor Yellow
    Write-Host "`"$agentDir\start_agent.bat`" --enroll-token `"your_token_here`"" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or use the enrollment token from the web interface." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Agent installed to: $agentDir" -ForegroundColor Green
Write-Host "Log file: $agentDir\agent.log" -ForegroundColor Green
Write-Host "Auto-start: Enabled" -ForegroundColor Green

Read-Host "Press Enter to exit"
