# Generated manually to fix database schema mismatch
# Renames 'quantity' to 'product_quantity' in ProductMachineAssignment table

from django.db import migrations


def rename_quantity_column(apps, schema_editor):
    """Rename quantity to product_quantity using raw SQL"""
    if schema_editor.connection.vendor == 'sqlite':
        # SQLite doesn't support column renaming directly, we need to recreate the table
        # Django migrations already run in a transaction, so we don't need to start one
        
        # Create new table with correct column name
        schema_editor.execute("""
            CREATE TABLE orders_productmachineassignment_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_name VARCHAR(255) NOT NULL,
                product_sku VARCHAR(100),
                product_quantity INTEGER NOT NULL,
                machine_id VARCHAR(100) NOT NULL,
                machine_name VARCHAR(255) NOT NULL,
                estimated_time_minutes INTEGER NOT NULL,
                started_at DATETIME,
                completed_at DATETIME,
                status VARCHAR(20) NOT NULL,
                assigned_by VARCHAR(255) NOT NULL,
                notes TEXT,
                FOREIGN KEY (order_id) REFERENCES orders_order(id)
            )
        """)
        
        # Copy data from old table, renaming quantity to product_quantity
        schema_editor.execute("""
            INSERT INTO orders_productmachineassignment_new (
                id, order_id, product_name, product_sku, product_quantity,
                machine_id, machine_name, estimated_time_minutes,
                started_at, completed_at, status, assigned_by, notes
            )
            SELECT
                id, order_id, product_name, product_sku, quantity,
                machine_id, machine_name, estimated_time_minutes,
                started_at, completed_at, status, assigned_by, notes
            FROM orders_productmachineassignment
        """)
        
        # Drop old table
        schema_editor.execute("DROP TABLE orders_productmachineassignment;")
        
        # Rename new table
        schema_editor.execute("ALTER TABLE orders_productmachineassignment_new RENAME TO orders_productmachineassignment;")
        
        # Recreate indexes
        schema_editor.execute("""
            CREATE INDEX orders_productmachineassignment_order_status_idx 
                ON orders_productmachineassignment(order_id, status)
        """)
        schema_editor.execute("""
            CREATE INDEX orders_productmachineassignment_machine_status_idx 
                ON orders_productmachineassignment(machine_id, status)
        """)
    else:
        # For PostgreSQL/MySQL
        schema_editor.execute(
            "ALTER TABLE orders_productmachineassignment RENAME COLUMN quantity TO product_quantity"
        )


def reverse_rename_quantity_column(apps, schema_editor):
    """Reverse the rename"""
    if schema_editor.connection.vendor == 'sqlite':
        # Not implemented for SQLite - migrations should not be rolled back in production
        pass
    else:
        schema_editor.execute(
            "ALTER TABLE orders_productmachineassignment RENAME COLUMN product_quantity TO quantity"
        )


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0013_fix_field_conflicts'),
    ]

    operations = [
        migrations.RunPython(rename_quantity_column, reverse_rename_quantity_column),
    ]
