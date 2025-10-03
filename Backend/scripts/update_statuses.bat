@echo off
REM Script to update order statuses automatically on Windows
REM This should be run via Windows Task Scheduler every 15 minutes

REM Set the Django project directory
set DJANGO_DIR=D:\Abdullah\CRM\Backend

REM Change to Django project directory
cd /d "%DJANGO_DIR%"

REM Activate virtual environment if it exists
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

REM Run the management command
python manage.py update_order_statuses --verbose

REM Log the execution
echo %date% %time%: Status update command executed >> C:\logs\order_status_updates.log


