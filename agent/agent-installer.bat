@echo off
echo Creative Connect Agent Installer
echo ================================

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.7+ from https://python.org
    pause
    exit /b 1
)

REM Create agent directory
set AGENT_DIR=%USERPROFILE%\CreativeConnectAgent
if not exist "%AGENT_DIR%" mkdir "%AGENT_DIR%"

REM Copy agent files
echo Installing agent files...
copy "%~dp0agent.py" "%AGENT_DIR%\agent.py" >nul
copy "%~dp0requirements.txt" "%AGENT_DIR%\requirements.txt" >nul

REM Install Python dependencies
echo Installing Python dependencies...
cd /d "%AGENT_DIR%"
pip install -r requirements.txt --quiet

REM Create startup script
echo Creating startup script...
echo @echo off > "%AGENT_DIR%\start_agent.bat"
echo cd /d "%AGENT_DIR%" >> "%AGENT_DIR%\start_agent.bat"
echo python agent.py --server-url http://localhost:8000 >> "%AGENT_DIR%\start_agent.bat"

REM Check if enrollment token was provided
if "%1"=="--enroll-token" (
    if "%2"=="" (
        echo ERROR: Enrollment token required
        echo Usage: agent-installer.exe --enroll-token "your_token_here"
        pause
        exit /b 1
    )
    
    echo Enrolling device with token: %2
    python agent.py --enroll-token "%2" --server-url http://localhost:8000
    
    if %errorlevel% equ 0 (
        echo Device enrolled successfully!
        echo Starting agent...
        start "" "%AGENT_DIR%\start_agent.bat"
    ) else (
        echo Enrollment failed. Please check your token and try again.
        pause
        exit /b 1
    )
) else (
    echo Installation complete!
    echo.
    echo To enroll your device, run:
    echo "%AGENT_DIR%\start_agent.bat" --enroll-token "your_token_here"
    echo.
    echo Or use the enrollment token from the web interface.
)

echo.
echo Agent installed to: %AGENT_DIR%
echo Log file: %AGENT_DIR%\agent.log
pause
