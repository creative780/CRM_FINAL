# Generated manually to fix DeliveryStage id field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0010_add_design_fields_to_orderitem'),
    ]

    operations = [
        # Fix DeliveryStage id field to be properly auto-incrementing
        migrations.AlterField(
            model_name='deliverystage',
            name='id',
            field=models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID'),
        ),
        
        # Fix ApprovalStage id field to be consistent with the original migration
        migrations.AlterField(
            model_name='approvalstage', 
            name='id',
            field=models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID'),
        ),
    ]

