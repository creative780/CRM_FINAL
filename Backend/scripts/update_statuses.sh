#!/bin/bash

# Script to update order statuses automatically
# This should be run via cron job every 15 minutes

# Set the Django project directory
DJANGO_DIR="/path/to/your/django/project"

# Change to Django project directory
cd "$DJANGO_DIR"

# Activate virtual environment if it exists
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

# Run the management command
python manage.py update_order_statuses --verbose

# Log the execution
echo "$(date): Status update command executed" >> /var/log/order_status_updates.log


