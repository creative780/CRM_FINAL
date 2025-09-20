from __future__ import annotations

import base64
import json
from datetime import datetime, timezone
from typing import Any, Dict

from django.conf import settings
from django.core import signing
from django.db import transaction
from django.db.models import Q
from django.http import FileResponse, Http404
from django.urls import reverse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.core.cache import cache
from rest_framework import generics, status
from rest_framework.authentication import BasicAuthentication
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import ActivityEventFilterSet
from .models import ActivityEvent, LogIngestionKey, ActorRole, Verb, Source, ExportJob, ExportFormat
from .permissions import IsAdmin
from .serializers import (
    ActivityEventIngestSerializer,
    ActivityEventSerializer,
    ExportJobRequestSerializer,
    ExportJobSerializer,
)
from .tasks import run_export_job
from .utils.hashing import compute_event_hash
from .utils.pagination import UICursorPagination
from .utils.rbac import apply_rbac
from .utils.hmac_signing import verify_hmac_sha256


ALLOW_TARGET_TYPES = {
    "Order",
    "Design",
    "Client",
    "InventoryItem",
    "File",
    "Job",
    "Machine",
    "QA",
    "Dispatch",
    "Attendance",
}


def normalize_actor(actor: dict | None) -> dict:
    if not actor:
        return {"id": None, "role": "SYSTEM"}
    return {"id": actor.get("id"), "role": str(actor.get("role", "SYSTEM")).upper()}


def normalize_payload(data: Dict[str, Any]) -> Dict[str, Any]:
    actor = normalize_actor(data.get("actor"))
    return {
        "timestamp": data.get("timestamp"),
        "tenant_id": data.get("tenant_id"),
        "actor": actor,
        "verb": str(data.get("verb", "OTHER")).upper(),
        "target": {
            "type": data["target"]["type"],
            "id": str(data["target"]["id"]),
        },
        "source": str(data.get("source", "API")).upper(),
        "request_id": data.get("request_id") or "",
        "context": data.get("context") or {},
    }


def canonicalize_for_hash(payload: Dict[str, Any]) -> Dict[str, Any]:
    # Reduce to fields included in hash and ensure stable types
    return {
        "timestamp": payload["timestamp"].strftime("%Y-%m-%dT%H:%M:%SZ") if hasattr(payload["timestamp"], "strftime") else str(payload["timestamp"]),
        "tenant_id": payload["tenant_id"],
        "actor": {"id": payload["actor"]["id"], "role": payload["actor"]["role"]},
        "verb": payload["verb"],
        "target": {"type": payload["target"]["type"], "id": str(payload["target"]["id"])},
        "source": payload["source"],
        "request_id": payload.get("request_id") or "",
        "context": payload.get("context") or {},
    }


@method_decorator(csrf_exempt, name="dispatch")
class IngestView(APIView):
    authentication_classes: list[type] = [BasicAuthentication]  # not used; we use HMAC headers
    permission_classes = [AllowAny]

    def post(self, request):
        # HMAC headers
        key_id = request.headers.get("X-Log-Key")
        signature = request.headers.get("X-Log-Signature")
        req_id_header = request.headers.get("X-Request-Id")
        if not key_id or not signature:
            return Response({"detail": "Missing HMAC headers"}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            key = LogIngestionKey.objects.get(key_id=key_id, is_active=True)
        except LogIngestionKey.DoesNotExist:
            return Response({"detail": "Invalid key"}, status=status.HTTP_401_UNAUTHORIZED)

        # Simple Redis-backed rate limit: per IP and per key
        ident_ip = request.META.get("REMOTE_ADDR", "unknown")
        per_min = int(getattr(settings, "INGEST_RATE_PER_MIN", 600))
        for k in (f"ingest:ip:{ident_ip}", f"ingest:key:{key_id}"):
            try:
                current = cache.get(k) or 0
                if current >= per_min:
                    return Response({"detail": "Rate limited"}, status=status.HTTP_429_TOO_MANY_REQUESTS)
                pipe = cache.client.get_client(write=True).pipeline(True)  # type: ignore[attr-defined]
                pipe.incr(k)
                pipe.expire(k, 60)
                pipe.execute()
            except Exception:
                # fallback: allow if cache not available
                pass

        raw_body = request.body or b"{}"
        if not verify_hmac_sha256(key.secret, raw_body, signature):
            return Response({"detail": "Bad signature"}, status=status.HTTP_401_UNAUTHORIZED)

        data = request.data
        # support bulk ingest array
        if isinstance(data, list):
            events_in = data
        else:
            events_in = [data]

        stored_ids: list[str] = []
        for item in events_in[:100]:
            ser = ActivityEventIngestSerializer(data=item)
            ser.is_valid(raise_exception=True)
            payload = normalize_payload(ser.validated_data)
            if req_id_header and not payload.get("request_id"):
                payload["request_id"] = req_id_header
            if payload["target"]["type"] not in ALLOW_TARGET_TYPES:
                return Response({"detail": "target.type not allowed"}, status=status.HTTP_400_BAD_REQUEST)
            if payload["verb"] not in dict(Verb.choices):
                return Response({"detail": "verb not allowed"}, status=status.HTTP_400_BAD_REQUEST)
            if payload["source"] not in dict(Source.choices):
                return Response({"detail": "source not allowed"}, status=status.HTTP_400_BAD_REQUEST)

            canon = canonicalize_for_hash(payload)
            event_hash = compute_event_hash(canon)

            # Idempotency on (tenant_id, request_id)
            if payload.get("request_id"):
                dup = ActivityEvent.objects.filter(
                    tenant_id=payload["tenant_id"], request_id=payload["request_id"]
                ).first()
                if dup:
                    stored_ids.append(str(dup.id))
                    continue

            with transaction.atomic():
                prev = (
                    ActivityEvent.objects.filter(tenant_id=payload["tenant_id"]).order_by("-timestamp").first()
                )
                ev = ActivityEvent.objects.create(
                    timestamp=payload["timestamp"],
                    actor_id=payload["actor"]["id"],
                    actor_role=payload["actor"]["role"],
                    verb=payload["verb"],
                    target_type=payload["target"]["type"],
                    target_id=str(payload["target"]["id"]),
                    context=payload.get("context") or {},
                    source=payload["source"],
                    request_id=payload.get("request_id") or "",
                    tenant_id=payload["tenant_id"],
                    hash=event_hash,
                    prev_hash=prev.hash if prev else None,
                )
                stored_ids.append(str(ev.id))

        return Response({"storedIds": stored_ids}, status=status.HTTP_200_OK)


class ActivityEventListView(generics.ListAPIView):
    serializer_class = ActivityEventSerializer
    pagination_class = UICursorPagination
    filterset_class = ActivityEventFilterSet
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = ActivityEvent.objects.select_related("actor").all().order_by("-timestamp", "-id")

        # include_pii=1 only if Admin and HTTPS
        include_pii = self.request.query_params.get("include_pii") == "1"
        if include_pii:
            if not self.request.is_secure() or not IsAdmin().has_permission(self.request, self):
                # redact PII in results; actual masking applied in serializer by stripping sensitive fields
                self.include_pii = False
            else:
                self.include_pii = True
        else:
            self.include_pii = False

        # RBAC
        qs = apply_rbac(qs, self.request.user)
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["include_pii"] = getattr(self, "include_pii", False)
        return ctx


class ActivityEventDetailView(generics.RetrieveAPIView):
    serializer_class = ActivityEventSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "id"
    queryset = ActivityEvent.objects.select_related("actor").all()

    def get_object(self):
        obj = super().get_object()
        # RBAC enforce
        qs = apply_rbac(ActivityEvent.objects.filter(id=obj.id), self.request.user)
        if not qs.exists():
            raise Http404
        return obj

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        # detail view follows same rules
        include_pii = self.request.query_params.get("include_pii") == "1" and self.request.is_secure() and IsAdmin().has_permission(self.request, self)
        ctx["include_pii"] = include_pii
        return ctx


class ExportStartView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        ser = ExportJobRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        job = ExportJob.objects.create(
            format=ser.validated_data["format"],
            filters_json={
                **ser.validated_data.get("filters", {}),
                "fields": ser.validated_data.get("fields", []),
            },
            requested_by=request.user,
        )
        run_export_job.delay(job.id)
        return Response({"jobId": job.id}, status=status.HTTP_202_ACCEPTED)


class ExportStatusView(generics.RetrieveAPIView):
    serializer_class = ExportJobSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = ExportJob.objects.all()
    lookup_field = "id"

    def retrieve(self, request, *args, **kwargs):
        job = self.get_object()
        data = ExportJobSerializer(job).data
        if job.status == "COMPLETED" and job.file_path:
            signer = signing.TimestampSigner()
            token = signer.sign(str(job.id))
            url = request.build_absolute_uri(
                reverse("activity_export_download", kwargs={"job_id": job.id}) + f"?sig={token}"
            )
            data["downloadUrl"] = url
        return Response(data)


class ExportDownloadView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, job_id: int):
        sig = request.GET.get("sig")
        if not sig:
            return Response(status=status.HTTP_403_FORBIDDEN)
        signer = signing.TimestampSigner()
        try:
            unsigned = signer.unsign(sig, max_age=300)
            if unsigned != str(job_id):
                return Response(status=status.HTTP_403_FORBIDDEN)
        except signing.BadSignature:
            return Response(status=status.HTTP_403_FORBIDDEN)
        job = ExportJob.objects.get(id=job_id)
        if not job.file_path:
            raise Http404
        return FileResponse(open(job.file_path, "rb"), as_attachment=True)


class MetricsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # lightweight metrics; for production use cached aggregations
        qs = apply_rbac(ActivityEvent.objects.all(), request.user)
        top_verbs = list(qs.values_list("verb", flat=True).order_by().distinct())
        top_targets = list(qs.values_list("target_type", flat=True).order_by().distinct())
        top_sources = list(qs.values_list("source", flat=True).order_by().distinct())
        return Response(
            {
                "topVerbs": top_verbs[:10],
                "topTargetTypes": top_targets[:10],
                "sources": top_sources[:10],
                # For brevity, p95 latency and events/day aggregation can be expanded later
            }
        )


class TypesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import ActivityType

        items = list(
            ActivityType.objects.all().values("key", "description", "role_scope", "default_severity")
        )
        return Response({"results": items})


class PoliciesView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        from .models import RetentionPolicy

        data = request.data
        rp, _ = RetentionPolicy.objects.update_or_create(
            name=data.get("name"),
            defaults={
                "role_filter": data.get("role_filter", []),
                "target_type_filter": data.get("target_type_filter", []),
                "keep_days": data.get("keep_days", 365),
                "action": data.get("action", "anonymize"),
                "drop_fields": data.get("drop_fields", []),
                "mask_fields": data.get("mask_fields", {}),
                "enabled": data.get("enabled", True),
            },
        )
        return Response({"id": rp.id, "name": rp.name})


class PoliciesRunView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        from .tasks import run_retention
        from .models import RetentionPolicy

        policy_id = request.data.get("policy_id")
        if not policy_id:
            return Response({"detail": "policy_id required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            policy = RetentionPolicy.objects.get(id=policy_id)
        except RetentionPolicy.DoesNotExist:
            return Response({"detail": "policy not found"}, status=status.HTTP_404_NOT_FOUND)
        run_retention.delay(policy.id)
        return Response({"status": "queued", "policyId": policy.id})
