from __future__ import annotations

import csv
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Iterable

from celery import shared_task
from django.conf import settings
from django.db import transaction

from .models import ActivityEvent, ExportJob, JobStatus, ExportFormat, RetentionPolicy, AnonymizationJob


def _exports_dir() -> Path:
    base = Path(getattr(settings, "EXPORTS_DIR", settings.MEDIA_ROOT))
    d = base / "activity_exports"
    d.mkdir(parents=True, exist_ok=True)
    return d


@shared_task
def run_export_job(job_id: int) -> None:
    job = ExportJob.objects.get(id=job_id)
    job.status = JobStatus.RUNNING
    job.started_at = datetime.now(timezone.utc)
    job.save(update_fields=["status", "started_at"])
    try:
        qs = ActivityEvent.objects.all()
        # basic filters from job
        filters = job.filters_json or {}
        for k, v in filters.items():
            if k in {"actor_id", "actor_role", "verb", "target_type", "target_id", "source", "tenant_id"}:
                qs = qs.filter(**{k: v})
            elif k == "since":
                qs = qs.filter(timestamp__gte=v)
            elif k == "until":
                qs = qs.filter(timestamp__lte=v)
            elif k == "severity":
                qs = qs.filter(context__severity=v)
        out_dir = _exports_dir()
        ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        if job.format == ExportFormat.NDJSON:
            fp = out_dir / f"export_{job.id}_{ts}.ndjson"
            with fp.open("w", encoding="utf-8") as f:
                for ev in qs.iterator(chunk_size=1000):
                    row = {
                        "id": str(ev.id),
                        "timestamp": ev.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ"),
                        "actor": {"id": str(ev.actor_id) if ev.actor_id else None, "role": ev.actor_role},
                        "verb": ev.verb,
                        "target": {"type": ev.target_type, "id": ev.target_id},
                        "context": ev.context,
                        "source": ev.source,
                        "hash": ev.hash,
                    }
                    f.write(json.dumps(row, separators=(",", ":")) + "\n")
        else:
            fp = out_dir / f"export_{job.id}_{ts}.csv"
            fields: Iterable[str] = (
                job.filters_json.get("fields")
                if isinstance(job.filters_json, dict)
                else None
            ) or [
                "timestamp",
                "actor.role",
                "verb",
                "target.type",
                "target.id",
                "context.severity",
                "context.tags",
            ]
            with fp.open("w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(fields)
                for ev in qs.iterator(chunk_size=1000):
                    row = []
                    data = {
                        "timestamp": ev.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ"),
                        "actor.role": ev.actor_role,
                        "actor.id": str(ev.actor_id) if ev.actor_id else "",
                        "verb": ev.verb,
                        "target.type": ev.target_type,
                        "target.id": ev.target_id,
                        "context.severity": ev.context.get("severity"),
                        "context.tags": ",".join(ev.context.get("tags", [])),
                    }
                    for field in fields:
                        row.append(data.get(field, ""))
                    writer.writerow(row)
        job.file_path = str(fp)
        job.status = JobStatus.COMPLETED
        job.finished_at = datetime.now(timezone.utc)
        job.save(update_fields=["file_path", "status", "finished_at"])
    except Exception as e:  # pragma: no cover - best effort
        job.status = JobStatus.FAILED
        job.error = str(e)
        job.finished_at = datetime.now(timezone.utc)
        job.save(update_fields=["status", "error", "finished_at"])


@shared_task
def run_retention(policy_id: int) -> None:
    policy = RetentionPolicy.objects.get(id=policy_id)
    job = AnonymizationJob.objects.create(policy=policy, status=JobStatus.RUNNING, started_at=datetime.now(timezone.utc))
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=policy.keep_days)
        qs = ActivityEvent.objects.all()
        if policy.role_filter:
            qs = qs.filter(actor_role__in=policy.role_filter)
        if policy.target_type_filter:
            qs = qs.filter(target_type__in=policy.target_type_filter)
        if cutoff:
            qs = qs.filter(timestamp__lte=cutoff)
        total = qs.count()
        affected = 0
        if policy.action == "purge":
            affected = total
            qs.delete()
        else:
            # anonymize
            with transaction.atomic():
                for ev in qs.iterator(chunk_size=1000):
                    ctx = dict(ev.context or {})
                    for fld in policy.drop_fields:
                        ctx.pop(fld, None)
                    for fld, mask in (policy.mask_fields or {}).items():
                        if fld in ctx:
                            ctx[fld] = mask
                    ev.context = ctx
                    ev.save(update_fields=["context"])  # immutable exception: retention process
                    affected += 1
        job.total_events = total
        job.affected_events = affected
        job.status = JobStatus.COMPLETED
        job.finished_at = datetime.now(timezone.utc)
        job.save()
    except Exception as e:  # pragma: no cover - best effort
        job.status = JobStatus.FAILED
        job.log = str(e)
        job.finished_at = datetime.now(timezone.utc)
        job.save(update_fields=["status", "log", "finished_at"])
