#!/usr/bin/env python
import os
import sys
import django
import pymysql

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from django.conf import settings

def fix_column_directly():
    """Fix the column name directly using PyMySQL"""
    try:
        # Get database settings
        db_settings = settings.DATABASES['default']
        
        # Connect directly to MySQL
        connection = pymysql.connect(
            host=db_settings['HOST'],
            user=db_settings['USER'],
            password=db_settings['PASSWORD'],
            database=db_settings['NAME'],
            charset='utf8mb4'
        )
        
        with connection.cursor() as cursor:
            # Check if the column exists
            cursor.execute("SHOW COLUMNS FROM orders_designapproval LIKE 'responded_at'")
            if cursor.fetchone():
                print("Found 'responded_at' column, renaming to 'reviewed_at'...")
                cursor.execute("ALTER TABLE orders_designapproval CHANGE COLUMN responded_at reviewed_at DATETIME(6) NULL")
                connection.commit()
                print("Column renamed successfully!")
            else:
                print("Column 'responded_at' not found, checking for 'reviewed_at'...")
                cursor.execute("SHOW COLUMNS FROM orders_designapproval LIKE 'reviewed_at'")
                if cursor.fetchone():
                    print("Column 'reviewed_at' already exists!")
                else:
                    print("Neither column found!")
                    
        connection.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_column_directly()
