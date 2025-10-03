#!/usr/bin/env python
"""
Script to add custom_requirements column to orders_orderitem table
"""

import sqlite3
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from django.core.management import execute_from_command_line

def fix_custom_requirements():
    db_path = 'db.sqlite3'
    
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found!")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check current table structure
        cursor.execute("PRAGMA table_info(orders_orderitem)")
        columns = cursor.fetchall()
        existing_columns = [col[1] for col in columns]
        
        print("Current columns in orders_orderitem:", existing_columns)
        
        # Add custom_requirements column if missing
        if 'custom_requirements' not in existing_columns:
            try:
                sql = "ALTER TABLE orders_orderitem ADD COLUMN custom_requirements TEXT NULL"
                print(f"Adding column: {sql}")
                cursor.execute(sql)
                conn.commit()
                print("Successfully added column: custom_requirements")
            except sqlite3.Error as e:
                print(f"Error adding column custom_requirements: {e}")
                conn.rollback()
                return False
        else:
            print("Column custom_requirements already exists")
        
        print("\nVerifying the fix...")
        cursor.execute("PRAGMA table_info(orders_orderitem)")
        columns = cursor.fetchall()
        existing_columns = [col[1] for col in columns]
        
        if 'custom_requirements' in existing_columns:
            print("[SUCCESS] Column custom_requirements is now present in the database")
            
            # Mark migration as applied
            print("\nMarking migration as applied...")
            try:
                cursor.execute("""
                    INSERT OR IGNORE INTO django_migrations (app, name, applied)
                    VALUES ('orders', '0007_add_custom_requirements', datetime('now'))
                """)
                conn.commit()
                print("[SUCCESS] Migration marked as applied")
            except sqlite3.Error as e:
                print(f"Warning: Could not mark migration as applied: {e}")
            
            return True
        else:
            print("[ERROR] Failed to add column")
            return False
        
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Fixing custom_requirements column in orders_orderitem table")
    print("=" * 60)
    
    if fix_custom_requirements():
        print("\n[SUCCESS] Database fix completed successfully!")
        print("\nYou can now restart your backend server:")
        print("  cd Backend && python manage.py runserver")
    else:
        print("\n[ERROR] Database fix failed!")
        print("\nPlease check the error messages above.")
