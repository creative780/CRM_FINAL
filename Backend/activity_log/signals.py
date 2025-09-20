from __future__ import annotations

from typing import Callable, Optional

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver


_registry: dict[str, dict[str, Callable]] = {}


def register_model(model_path: str, *, include_diffs: bool = True) -> None:
    _registry[model_path] = {"include_diffs": include_diffs}


@receiver(post_save)
def _on_save(sender, instance, created, **kwargs):  # pragma: no cover - opt-in
    key = f"{sender.__module__}.{sender.__name__}"
    if key not in _registry:
        return
    # Placeholder for auto-capture integration
    # A project can hook in activity_log.utils API to log changes
    return


@receiver(post_delete)
def _on_delete(sender, instance, **kwargs):  # pragma: no cover - opt-in
    key = f"{sender.__module__}.{sender.__name__}"
    if key not in _registry:
        return
    return

