from django.apps import AppConfig


class ActivityLogConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "activity_log"
    verbose_name = "Activity Log"

    def ready(self) -> None:
        # Import signal registrations
        try:
            from . import signals  # noqa: F401
        except Exception:
            # Avoid import errors if DB not ready during migrations
            pass

