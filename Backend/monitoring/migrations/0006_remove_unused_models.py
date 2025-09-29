# Generated manually to fix migration issues

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('monitoring', '0005_heartbeat_activity_score_heartbeat_click_rate_and_more'),
    ]

    operations = [
        # Remove fields that were added in 0005 but don't exist in current models
        migrations.RemoveField(
            model_name='heartbeat',
            name='activity_score',
        ),
        migrations.RemoveField(
            model_name='heartbeat',
            name='click_rate',
        ),
        migrations.RemoveField(
            model_name='heartbeat',
            name='idle_duration',
        ),
        migrations.RemoveField(
            model_name='heartbeat',
            name='is_idle',
        ),
        migrations.RemoveField(
            model_name='heartbeat',
            name='keystroke_rate',
        ),
        migrations.RemoveField(
            model_name='heartbeat',
            name='keystrokes',
        ),
        migrations.RemoveField(
            model_name='heartbeat',
            name='mouse_clicks',
        ),
        migrations.RemoveField(
            model_name='heartbeat',
            name='productivity_reason',
        ),
        migrations.RemoveField(
            model_name='heartbeat',
            name='productivity_status',
        ),
        migrations.RemoveField(
            model_name='heartbeat',
            name='scroll_events',
        ),
        migrations.RemoveField(
            model_name='screenshot',
            name='active_window_snapshot',
        ),
        # Remove models that were created in 0004 but don't exist in current models
        migrations.DeleteModel(
            name='AnalyticsReport',
        ),
        migrations.DeleteModel(
            name='ApplicationUsage',
        ),
        migrations.DeleteModel(
            name='ProductivityAlert',
        ),
        migrations.DeleteModel(
            name='ProductivityMetric',
        ),
        migrations.DeleteModel(
            name='UserActivitySession',
        ),
    ]
