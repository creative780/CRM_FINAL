# Generated manually to fix column name mismatch

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0014_rename_quantity_to_product_quantity'),
    ]

    operations = [
        migrations.RenameField(
            model_name='designapproval',
            old_name='responded_at',
            new_name='reviewed_at',
        ),
    ]
