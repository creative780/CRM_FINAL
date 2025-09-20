from django.db import migrations


def seed_types(apps, schema_editor):
    ActivityType = apps.get_model('activity_log', 'ActivityType')
    seed = [
        ("LOGIN", "User login"),
        ("LOGOUT", "User logout"),
        ("CREATE", "Create resource"),
        ("UPDATE", "Update resource"),
        ("DELETE", "Delete resource"),
        ("ASSIGN", "Assign"),
        ("COMMENT", "Comment"),
        ("UPLOAD", "Upload file"),
        ("STATUS_CHANGE", "Status change"),
        ("LEAD_CREATED", "Lead created", ["SALES"]),
        ("LEAD_STAGE_CHANGED", "Lead stage changed", ["SALES"]),
        ("QUOTE_SENT", "Quote sent", ["SALES"]),
        ("ORDER_CREATED", "Order created", ["SALES"]),
        ("PAYMENT_RECEIVED", "Payment received", ["SALES"]),
        ("DESIGN_BRIEF_RECEIVED", "Design brief received", ["DESIGNER"]),
        ("DESIGN_REVISION_SUBMITTED", "Design revision submitted", ["DESIGNER"]),
        ("FILE_UPLOADED", "File uploaded", ["DESIGNER"]),
        ("DESIGN_APPROVED", "Design approved", ["DESIGNER"]),
        ("DESIGN_REJECTED", "Design rejected", ["DESIGNER"]),
        ("JOB_STARTED", "Job started", ["PRODUCTION"]),
        ("MACHINE_STATE_CHANGED", "Machine state changed", ["PRODUCTION"]),
        ("QA_PASSED", "QA passed", ["PRODUCTION"]),
        ("QA_FAILED", "QA failed", ["PRODUCTION"]),
        ("INVENTORY_DECREMENTED", "Inventory decremented", ["PRODUCTION"]),
        ("DISPATCHED", "Dispatched", ["PRODUCTION"]),
        ("CHECKIN", "Check-in"),
        ("CHECKOUT", "Check-out"),
        ("SCREENSHOT_CAPTURED", "Screenshot captured"),
    ]
    for row in seed:
        key, desc, *scope = row
        ActivityType.objects.get_or_create(
            key=key,
            defaults={"description": desc, "role_scope": (scope[0] if scope else [])},
        )


class Migration(migrations.Migration):
    dependencies = [
        ("activity_log", "0002_pg_indexes_partitioning"),
    ]

    operations = [
        migrations.RunPython(seed_types, migrations.RunPython.noop),
    ]
