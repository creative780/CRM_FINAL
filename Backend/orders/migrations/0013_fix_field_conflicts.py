# Generated manually to fix Django migration conflicts
# Fixes field name conflicts for session.created_at and designapproval.responded_at

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0012_fix_delivery_stage_id_with_sql'),
    ]

    operations = [
        # We're not making any changes - this migration is to resolve conflicts
        # The fields are already properly named in the models
        migrations.RunPython(
            lambda apps, schema_editor: None,
            lambda apps, schema_editor: None
        ),
    ]

