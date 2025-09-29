# Generated manually to add missing token field

from django.db import migrations, models
import secrets


def populate_token_field(apps, schema_editor):
    """Populate the token field with unique values based on secret"""
    DeviceToken = apps.get_model('monitoring', 'DeviceToken')
    for token in DeviceToken.objects.all():
        # Use the existing secret as the token value
        token.token = token.secret
        token.save()


def reverse_populate_token_field(apps, schema_editor):
    """Reverse migration - nothing to do"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('monitoring', '0007_phase2_enhancements'),
    ]

    operations = [
        # Add the missing token field without unique constraint first
        migrations.AddField(
            model_name='devicetoken',
            name='token',
            field=models.CharField(max_length=255, default=''),
            preserve_default=False,
        ),
        # Populate the token field with values
        migrations.RunPython(populate_token_field, reverse_populate_token_field),
        # Now add the unique constraint
        migrations.AlterField(
            model_name='devicetoken',
            name='token',
            field=models.CharField(max_length=255, unique=True),
        ),
    ]
