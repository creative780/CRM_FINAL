# Generated manually to fix IntegrityError with Quotation.id

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0007_add_custom_requirements'),
    ]

    operations = [
        migrations.AlterField(
            model_name='quotation',
            name='id',
            field=models.AutoField(primary_key=True, serialize=False),
        ),
    ]
