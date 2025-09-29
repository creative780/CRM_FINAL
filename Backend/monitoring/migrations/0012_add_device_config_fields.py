# Generated manually to add device configuration fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('monitoring', '0011_add_device_frequency_fields'),
    ]

    operations = [
        # Add configuration fields to Device model
        migrations.AddField(
            model_name='device',
            name='screenshot_freq_sec',
            field=models.IntegerField(default=15),
        ),
        migrations.AddField(
            model_name='device',
            name='heartbeat_freq_sec',
            field=models.IntegerField(default=20),
        ),
        migrations.AddField(
            model_name='device',
            name='auto_start',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='device',
            name='debug_mode',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='device',
            name='pause_monitoring',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='device',
            name='max_screenshot_storage_days',
            field=models.IntegerField(default=30),
        ),
        migrations.AddField(
            model_name='device',
            name='keystroke_monitoring',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='device',
            name='mouse_click_monitoring',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='device',
            name='productivity_tracking',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='device',
            name='idle_detection',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='device',
            name='idle_threshold_minutes',
            field=models.IntegerField(default=30),
        ),
        migrations.AddField(
            model_name='device',
            name='avg_productivity_score',
            field=models.FloatField(default=0.0),
        ),
    ]

