#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from django.db import connection

def fix_designapproval_column():
    """Fix the column name mismatch in DesignApproval table"""
    try:
        with connection.cursor() as cursor:
            # Check if the column exists
            cursor.execute("SHOW COLUMNS FROM orders_designapproval LIKE 'responded_at'")
            if cursor.fetchone():
                print("Found 'responded_at' column, renaming to 'reviewed_at'...")
                cursor.execute("ALTER TABLE orders_designapproval CHANGE COLUMN responded_at reviewed_at DATETIME(6) NULL")
                print("Column renamed successfully!")
            else:
                print("Column 'responded_at' not found, checking for 'reviewed_at'...")
                cursor.execute("SHOW COLUMNS FROM orders_designapproval LIKE 'reviewed_at'")
                if cursor.fetchone():
                    print("Column 'reviewed_at' already exists!")
                else:
                    print("Neither column found!")
                    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_designapproval_column()
