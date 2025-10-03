import os
import sys
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import connections
import sqlite3
import json
from datetime import datetime


class Command(BaseCommand):
    help = 'Migrate data from SQLite to MySQL database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--sqlite-file',
            type=str,
            default='db.sqlite3',
            help='Path to SQLite database file'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be migrated without actually doing it'
        )

    def handle(self, *args, **options):
        sqlite_file = options['sqlite_file']
        dry_run = options['dry_run']
        
        if not os.path.exists(sqlite_file):
            self.stdout.write(
                self.style.ERROR(f'SQLite file not found: {sqlite_file}')
            )
            return

        # Get database connections
        sqlite_conn = sqlite3.connect(sqlite_file)
        sqlite_conn.row_factory = sqlite3.Row
        sqlite_cursor = sqlite_conn.cursor()
        
        mysql_conn = connections['default']
        
        self.stdout.write(
            self.style.SUCCESS(f'Connected to SQLite: {sqlite_file}')
        )
        self.stdout.write(
            self.style.SUCCESS(f'Connected to MySQL: {settings.DATABASES["default"]["NAME"]}')
        )

        # Get list of tables from SQLite
        sqlite_cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )
        tables = [row[0] for row in sqlite_cursor.fetchall()]
        
        self.stdout.write(f'Found {len(tables)} tables to migrate: {", ".join(tables)}')

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No data will be migrated'))
            for table in tables:
                sqlite_cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = sqlite_cursor.fetchone()[0]
                self.stdout.write(f'  {table}: {count} records')
            return

        # Disable foreign key checks temporarily
        with mysql_conn.cursor() as mysql_cursor:
            mysql_cursor.execute('SET FOREIGN_KEY_CHECKS = 0')

        migrated_tables = []
        total_records = 0

        try:
            for table in tables:
                self.stdout.write(f'Migrating table: {table}')
                
                # Get table structure
                sqlite_cursor.execute(f"PRAGMA table_info({table})")
                columns_info = sqlite_cursor.fetchall()
                columns = [col[1] for col in columns_info]
                
                # Get all data from SQLite
                sqlite_cursor.execute(f"SELECT * FROM {table}")
                rows = sqlite_cursor.fetchall()
                
                if not rows:
                    self.stdout.write(f'  No data in {table}')
                    continue
                
                # Convert rows to list of dictionaries
                data_rows = []
                for row in rows:
                    row_dict = {}
                    for i, value in enumerate(row):
                        col_name = columns[i]
                        # Handle different data types
                        if value is None:
                            row_dict[col_name] = None
                        elif isinstance(value, (int, float, str)):
                            row_dict[col_name] = value
                        elif isinstance(value, bytes):
                            # Handle binary data (like images)
                            row_dict[col_name] = value
                        else:
                            row_dict[col_name] = str(value)
                    data_rows.append(row_dict)
                
                # Insert data into MySQL
                if data_rows:
                    with mysql_conn.cursor() as mysql_cursor:
                        # Get MySQL table structure
                        mysql_cursor.execute(f"DESCRIBE {table}")
                        mysql_columns = [row[0] for row in mysql_cursor.fetchall()]
                        
                        # Clear existing data
                        mysql_cursor.execute(f'DELETE FROM {table}')
                        
                        # Insert new data
                        for row_dict in data_rows:
                            # Filter row_dict to only include columns that exist in MySQL
                            filtered_row = {k: v for k, v in row_dict.items() if k in mysql_columns}
                            
                            if not filtered_row:
                                self.stdout.write(f'  Skipping row - no matching columns in {table}')
                                continue
                            
                            # Build INSERT statement
                            columns_str = ', '.join(filtered_row.keys())
                            placeholders = ', '.join(['%s'] * len(filtered_row))
                            values = list(filtered_row.values())
                            
                            insert_sql = f"INSERT INTO {table} ({columns_str}) VALUES ({placeholders})"
                            
                            try:
                                mysql_cursor.execute(insert_sql, values)
                            except Exception as e:
                                self.stdout.write(
                                    self.style.WARNING(f'  Error inserting row into {table}: {e}')
                                )
                                self.stdout.write(f'  Row data: {filtered_row}')
                                continue
                        
                        mysql_conn.commit()
                        migrated_tables.append(table)
                        total_records += len(data_rows)
                        self.stdout.write(f'  Migrated {len(data_rows)} records to {table}')

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error during migration: {e}')
            )
            mysql_conn.rollback()
        finally:
            # Re-enable foreign key checks
            with mysql_conn.cursor() as mysql_cursor:
                mysql_cursor.execute('SET FOREIGN_KEY_CHECKS = 1')
            
            sqlite_conn.close()

        self.stdout.write(
            self.style.SUCCESS(
                f'Migration completed! Migrated {total_records} records from {len(migrated_tables)} tables.'
            )
        )
        self.stdout.write(f'Migrated tables: {", ".join(migrated_tables)}')
