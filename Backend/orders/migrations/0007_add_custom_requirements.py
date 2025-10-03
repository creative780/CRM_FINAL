# Generated manually for custom requirements field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0006_add_workflow_models'),
    ]

    operations = [
        migrations.AddField(
            model_name='orderitem',
            name='custom_requirements',
            field=models.TextField(blank=True, help_text='Custom design requirements for this product', null=True),
        ),
    ]
