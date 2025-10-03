#!/usr/bin/env python
import subprocess
import sys
import os

def run_django_command_with_input(command, input_text="N\n"):
    """Run a Django command with automatic input"""
    try:
        process = subprocess.Popen(
            command,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            shell=True
        )
        
        stdout, stderr = process.communicate(input=input_text)
        
        print("STDOUT:", stdout)
        if stderr:
            print("STDERR:", stderr)
            
        return process.returncode
    except Exception as e:
        print(f"Error: {e}")
        return 1

if __name__ == "__main__":
    # First try to run showmigrations to see the current state
    print("Checking migration status...")
    run_django_command_with_input("python manage.py showmigrations")
    
    # Then try to run the column fix
    print("\nFixing column name...")
    run_django_command_with_input("python manage.py shell -c \"from django.db import connection; cursor = connection.cursor(); cursor.execute('ALTER TABLE orders_designapproval CHANGE COLUMN responded_at reviewed_at DATETIME(6) NULL'); print('Column renamed successfully')\"")
