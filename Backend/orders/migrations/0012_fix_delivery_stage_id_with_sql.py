# Generated manually to fix DeliveryStage and ApprovalStage id fields using raw SQL

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0011_fix_delivery_stage_id_field'),
    ]

    def recreate_delivery_stage_table(apps, schema_editor):
        """Recreate delivery_stage table with proper auto-incrementing id"""
        if schema_editor.connection.vendor == 'sqlite':
            with schema_editor.connection.cursor() as cursor:
                # Create temporary table
                cursor.execute("""
                    CREATE TABLE orders_deliverystage_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        rider_photo_path VARCHAR(500) NOT NULL DEFAULT '',
                        delivered_at DATETIME NULL,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL,
                        order_id INTEGER NOT NULL UNIQUE,
                        FOREIGN KEY(order_id) REFERENCES orders_order(id)
                    )
                """)
                
                # Copy data from old table to new table
                cursor.execute("""
                    INSERT INTO orders_deliverystage_new (rider_photo_path, delivered_at, created_at, updated_at, order_id)
                    SELECT rider_photo_path, delivered_at, created_at, updated_at, order_id FROM orders_deliverystage
                """)
                
                # Drop old table and rename new table
                cursor.execute("DROP TABLE orders_deliverystage")
                cursor.execute("ALTER TABLE orders_deliverystage_new RENAME TO orders_deliverystage")
                
                # Recreate foreign key constraint properly
                cursor.execute("CREATE INDEX orders_deliverystage_order_id_1f3b9ea3 ON orders_deliverystage(order_id)")

    def reverse_recreate_delivery_stage_table(apps, schema_editor):
        """Reverse operation - recreate table without auto-increment"""
        if schema_editor.connection.vendor == 'sqlite':
            with schema_editor.connection.cursor() as cursor:
                cursor.execute("CREATE TABLE orders_deliverystage_new (id INTEGER NOT NULL, rider_photo_path VARCHAR(500) NOT NULL DEFAULT '', delivered_at DATETIME NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, order_id INTEGER NOT NULL)")
                cursor.execute("INSERT INTO orders_deliverystage_new SELECT * FROM orders_deliverystage")
                cursor.execute("DROP TABLE orders_deliverystage")
                cursor.execute("ALTER TABLE orders_deliverystage_new RENAME TO orders_deliverystage")
                cursor.execute("CREATE INDEX orders_deliverystage_order_id_1f3b9ea3 ON orders_deliverystage(order_id)")

    operations = [
        migrations.RunPython(
            recreate_delivery_stage_table,
            reverse_recreate_delivery_stage_table
        ),
    ]

