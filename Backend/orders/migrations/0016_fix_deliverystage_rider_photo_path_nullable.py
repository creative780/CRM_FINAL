# Generated manually to fix rider_photo_path NOT NULL constraint

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0015_fix_designapproval_reviewed_at_field'),
    ]

    operations = [
        migrations.RunSQL(
            # SQLite doesn't support ALTER COLUMN directly, so we need to recreate the table
            sql="""
                -- Create new table with nullable rider_photo_path
                CREATE TABLE orders_deliverystage_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id INTEGER NOT NULL,
                    rider_photo_path VARCHAR(500),
                    delivered_at DATETIME,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    FOREIGN KEY (order_id) REFERENCES orders_order(id)
                );
                
                -- Copy data from old table
                INSERT INTO orders_deliverystage_new (
                    id, order_id, rider_photo_path, delivered_at, created_at, updated_at
                )
                SELECT 
                    id, order_id, 
                    CASE WHEN rider_photo_path = '' THEN NULL ELSE rider_photo_path END,
                    delivered_at, created_at, updated_at
                FROM orders_deliverystage;
                
                -- Drop old table
                DROP TABLE orders_deliverystage;
                
                -- Rename new table
                ALTER TABLE orders_deliverystage_new RENAME TO orders_deliverystage;
            """,
            reverse_sql="""
                -- Reverse migration (not implemented for safety)
                -- This migration should not be rolled back in production
            """
        ),
    ]
