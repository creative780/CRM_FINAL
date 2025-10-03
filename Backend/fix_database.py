#!/usr/bin/env python
"""
Script to fix database schema mismatches
"""

import sqlite3
import os

def fix_database():
    db_path = 'db.sqlite3'
    
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found!")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check current table structure
        cursor.execute("PRAGMA table_info(orders_productmachineassignment)")
        columns = cursor.fetchall()
        existing_columns = [col[1] for col in columns]
        
        print("Current columns:", existing_columns)
        
        # Add missing columns
        missing_columns = [
            ('machine_id', 'VARCHAR(100) DEFAULT ""'),
            ('assigned_by', 'VARCHAR(255) DEFAULT ""'),
        ]
        
        for col_name, col_def in missing_columns:
            if col_name not in existing_columns:
                try:
                    sql = f"ALTER TABLE orders_productmachineassignment ADD COLUMN {col_name} {col_def}"
                    print(f"Adding column: {sql}")
                    cursor.execute(sql)
                    print(f"Successfully added column: {col_name}")
                except sqlite3.Error as e:
                    print(f"Error adding column {col_name}: {e}")
            else:
                print(f"Column {col_name} already exists")
        
        conn.commit()
        print("Database fix completed successfully!")
        
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    fix_database()


