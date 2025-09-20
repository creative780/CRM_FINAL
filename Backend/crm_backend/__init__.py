try:  # Make Celery optional in dev envs without celery installed
    from .celery import app as celery_app  # type: ignore
    __all__ = ("celery_app",)
except Exception:  # pragma: no cover
    celery_app = None  # type: ignore
    __all__ = ()
