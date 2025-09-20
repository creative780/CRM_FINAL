from __future__ import annotations

from django.db import migrations, connections


def pg_indexes_and_partition(apps, schema_editor):
    conn = connections[schema_editor.connection.alias]
    if conn.vendor != "postgresql":
        return
    with conn.cursor() as cur:
        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_event_context_gin ON activity_event USING GIN ((context));"
        )
        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_event_hash_hash ON activity_event USING HASH (hash);"
        )
        # Partition parent scaffold (optional)
        cur.execute(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables WHERE table_name='activity_event_parent'
                ) THEN
                    CREATE TABLE activity_event_parent (
                        LIKE activity_event INCLUDING ALL
                    ) PARTITION BY RANGE (timestamp);
                END IF;
            END$$;
            """
        )


class Migration(migrations.Migration):
    dependencies = [
        ("activity_log", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(pg_indexes_and_partition, migrations.RunPython.noop),
    ]
