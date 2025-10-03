# Generated manually to add trn field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0003_order_pricing_status_quotation_custom_field_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='trn',
            field=models.CharField(blank=True, max_length=50),
        ),
    ]
