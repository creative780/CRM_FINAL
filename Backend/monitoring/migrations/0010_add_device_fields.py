# Generated manually to add missing device fields

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('monitoring', '0009_add_token_field'),
    ]

    operations = [
        # Add missing fields to Device model
        migrations.AddField(
            model_name='device',
            name='last_seen',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name='device',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='device',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='device',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
    ]


