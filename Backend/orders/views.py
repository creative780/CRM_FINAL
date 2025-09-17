import re
from typing import Any, Mapping, Optional

from django.utils.crypto import get_random_string
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveUpdateDestroyAPIView
from django.db import transaction
from .models import Order, OrderQuotation, OrderDesign, OrderPrint, OrderApproval, OrderDelivery
from .serializers import OrderSerializer, OrderIntakeSerializer, StagePatchSerializer, REQUIRED_FIELDS
from inventory.models import InventoryItem, InventoryMovement
from accounts.permissions import RolePermission
from drf_spectacular.utils import extend_schema


def generate_order_id() -> str:
    return get_random_string(10).upper()


_COMPLETED_KEYWORDS = {"delivered", "completed", "complete", "fulfilled"}


_STATUS_ALIASES = {
    "new": "new",
    "intake": "new",
    "pending": "new",
    "neworder": "new",
    "neworders": "new",
    "active": "in_progress",
    "inprogress": "in_progress",
    "inprogression": "in_progress",
    "progress": "in_progress",
    "working": "in_progress",
    "processing": "in_progress",
    "activeorder": "in_progress",
    "activeorders": "in_progress",
    "completed": "completed",
    "complete": "completed",
    "done": "completed",
    "finished": "completed",
    "fulfilled": "completed",
    "completedorder": "completed",
    "completedorders": "completed",
    "delivered": "delivered",
    "deliveredorder": "delivered",
    "deliveredorders": "delivered",
}


def _normalize_status(raw: Optional[str]) -> Optional[str]:
    """Map arbitrary status labels to one of the canonical Order statuses."""

    if not raw or not isinstance(raw, str):
        return None

    normalized = raw.strip().lower()
    if not normalized:
        return None

    candidates = {normalized}
    # allow callers to send values like "Active Orders" or "in-progress"
    candidates.add(normalized.replace("-", "").replace(" ", ""))
    candidates.add(re.sub(r"[^a-z]", "", normalized))

    for key in candidates:
        if key in _STATUS_ALIASES:
            return _STATUS_ALIASES[key]

    return None


def _derive_status_from_stage(
    stage: str,
    *,
    payload: Optional[Mapping[str, Any]] = None,
    delivery: Optional[OrderDelivery] = None,
) -> Optional[str]:
    """Return the desired order.status for a given stage transition."""

    stage_status_map = {
        "intake": "new",
        "quotation": "in_progress",
        "design": "in_progress",
        "printing": "in_progress",
        "approval": "in_progress",
    }

    if stage != "delivery":
        return stage_status_map.get(stage)

    delivered_at = None
    delivery_status = None

    if payload:
        delivered_at = payload.get("delivered_at") or payload.get("deliveredAt")
        delivery_status = payload.get("delivery_status") or payload.get("deliveryStatus")

    if delivery:
        delivered_at = delivered_at or getattr(delivery, "delivered_at", None)
        delivery_status = delivery_status or getattr(delivery, "delivery_status", None)

    if delivered_at:
        return "completed"

    if delivery_status and delivery_status.strip().lower() in _COMPLETED_KEYWORDS:
        return "completed"

    return "in_progress"


class OrdersCreateView(APIView):
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'sales']
    @extend_schema(request=OrderIntakeSerializer, responses={201: OrderSerializer})
    def post(self, request):
        s = OrderIntakeSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = s.validated_data
        status_value = _normalize_status(data.get('status'))
        order_kwargs = {
            'order_id': generate_order_id(),
            'client_name': data['clientName'],
            'product_type': data['productType'],
            'specs': data.get('specs', ''),
            'urgency': data.get('urgency', ''),
            'created_by': request.user if request.user.is_authenticated else None,
        }
        if status_value:
            order_kwargs['status'] = status_value
        order = Order.objects.create(**order_kwargs)
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderStagePatchView(APIView):
    permission_classes = [RolePermission]
    # Allowed broadly; enforce per-stage below
    allowed_roles = ['admin', 'sales', 'designer', 'production', 'delivery', 'finance']
    @extend_schema(request=StagePatchSerializer, responses={200: None})
    def patch(self, request, id):
        order = Order.objects.get(id=id)
        s = StagePatchSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        stage = s.validated_data['stage']
        payload = s.validated_data['payload']
        missing = [f for f in REQUIRED_FIELDS[stage] if f not in payload]
        if missing:
            return Response({'detail': 'Missing required fields', 'missing': missing}, status=400)
        # RBAC per stage
        stage_to_roles = {
            'quotation': ['admin', 'sales'],
            'design': ['admin', 'designer'],
            'printing': ['admin', 'production'],
            'approval': ['admin', 'sales', 'designer', 'production'],
            'delivery': ['admin', 'delivery'],
        }
        user_roles = getattr(request.user, 'roles', []) or []
        if not any(r in user_roles for r in stage_to_roles.get(stage, [])) and not getattr(request.user, 'is_superuser', False):
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        with transaction.atomic():
            new_status = None
            if stage == 'quotation':
                obj, _ = OrderQuotation.objects.get_or_create(order=order)
                for f in ['labour_cost', 'finishing_cost', 'paper_cost', 'design_cost']:
                    if f in payload:
                        setattr(obj, f, payload[f])
                obj.save()
                new_status = _derive_status_from_stage(stage)
            elif stage == 'design':
                obj, _ = OrderDesign.objects.get_or_create(order=order)
                for f in ['assigned_designer', 'requirements_files', 'design_status']:
                    if f in payload:
                        setattr(obj, f, payload[f])
                obj.save()
                new_status = _derive_status_from_stage(stage)
            elif stage == 'printing':
                obj, _ = OrderPrint.objects.get_or_create(order=order)
                for f in ['print_operator', 'print_time', 'batch_info', 'print_status', 'qa_checklist']:
                    if f in payload:
                        setattr(obj, f, payload[f])
                obj.save()
                new_status = _derive_status_from_stage(stage)
            elif stage == 'approval':
                obj, _ = OrderApproval.objects.get_or_create(order=order)
                for f in ['client_approval_files', 'approved_at']:
                    if f in payload:
                        setattr(obj, f, payload[f])
                obj.save()
                new_status = _derive_status_from_stage(stage)
            elif stage == 'delivery':
                obj, _ = OrderDelivery.objects.get_or_create(order=order)
                for f in ['delivery_code', 'delivery_status', 'delivered_at', 'rider_photo_path']:
                    if f in payload:
                        setattr(obj, f, payload[f])
                obj.save()
                new_status = _derive_status_from_stage(stage, payload=payload, delivery=obj)
            else:
                new_status = _derive_status_from_stage(stage)

            order.stage = stage
            update_fields = ['stage']
            if new_status and new_status != order.status:
                order.status = new_status
                update_fields.append('status')
            order.save(update_fields=update_fields)
        return Response({'ok': True})


class MarkPrintedView(APIView):
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'production']
    @extend_schema(responses={200: None})
    def post(self, request, id=None):
        # Idempotent decrement example: expect sku and qty from payload
        sku = request.data.get('sku')
        qty = int(request.data.get('qty', 0))
        if not sku or qty <= 0:
            return Response({'detail': 'sku and positive qty required'}, status=400)
        try:
            item = InventoryItem.objects.get(sku=sku)
        except InventoryItem.DoesNotExist:
            return Response({'detail': 'SKU not found'}, status=404)
        with transaction.atomic():
            # naive idempotency by ensuring not decrementing below zero
            new_q = max(0, item.quantity - qty)
            delta_applied = new_q - item.quantity
            item.quantity = new_q
            item.save(update_fields=['quantity'])
            InventoryMovement.objects.create(order_id=id, sku=sku, delta=delta_applied, reason='print')
        return Response({'ok': True, 'sku': sku})


class OrdersListView(ListAPIView):
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'sales', 'designer', 'production', 'delivery', 'finance']
    serializer_class = OrderSerializer
    
    @extend_schema(responses={200: OrderSerializer(many=True)})
    def get(self, request, *args, **kwargs):
        queryset = Order.objects.all().order_by('-created_at')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class OrderDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'sales', 'designer', 'production', 'delivery', 'finance']
    serializer_class = OrderSerializer
    queryset = Order.objects.all()
    lookup_field = 'id'
    
    @extend_schema(responses={200: OrderSerializer})
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @extend_schema(request=OrderSerializer, responses={200: OrderSerializer})
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)
    
    @extend_schema(responses={204: None})
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)


class OrderQuotationView(APIView):
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'sales']
    
    @extend_schema(responses={200: None})
    def get(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
            quotation, created = OrderQuotation.objects.get_or_create(order=order)
            return Response({
                'labour_cost': quotation.labour_cost,
                'finishing_cost': quotation.finishing_cost,
                'paper_cost': quotation.paper_cost,
                'design_cost': quotation.design_cost,
            })
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found'}, status=404)
    
    @extend_schema(responses={200: None})
    def patch(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
            quotation, created = OrderQuotation.objects.get_or_create(order=order)
            for field in ['labour_cost', 'finishing_cost', 'paper_cost', 'design_cost']:
                if field in request.data:
                    setattr(quotation, field, request.data[field])
            quotation.save()
            return Response({'ok': True})
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found'}, status=404)


class OrderDesignView(APIView):
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'designer']
    
    @extend_schema(responses={200: None})
    def get(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
            design, created = OrderDesign.objects.get_or_create(order=order)
            return Response({
                'assigned_designer': design.assigned_designer,
                'requirements_files': design.requirements_files,
                'design_status': design.design_status,
            })
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found'}, status=404)
    
    @extend_schema(responses={200: None})
    def patch(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
            design, created = OrderDesign.objects.get_or_create(order=order)
            for field in ['assigned_designer', 'requirements_files', 'design_status']:
                if field in request.data:
                    setattr(design, field, request.data[field])
            design.save()
            return Response({'ok': True})
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found'}, status=404)


class OrderPrintView(APIView):
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'production']
    
    @extend_schema(responses={200: None})
    def get(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
            print_obj, created = OrderPrint.objects.get_or_create(order=order)
            return Response({
                'print_operator': print_obj.print_operator,
                'print_time': print_obj.print_time,
                'batch_info': print_obj.batch_info,
                'print_status': print_obj.print_status,
                'qa_checklist': print_obj.qa_checklist,
            })
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found'}, status=404)
    
    @extend_schema(responses={200: None})
    def patch(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
            print_obj, created = OrderPrint.objects.get_or_create(order=order)
            for field in ['print_operator', 'print_time', 'batch_info', 'print_status', 'qa_checklist']:
                if field in request.data:
                    setattr(print_obj, field, request.data[field])
            print_obj.save()
            return Response({'ok': True})
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found'}, status=404)


class OrderApprovalView(APIView):
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'sales', 'designer', 'production']
    
    @extend_schema(responses={200: None})
    def get(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
            approval, created = OrderApproval.objects.get_or_create(order=order)
            return Response({
                'client_approval_files': approval.client_approval_files,
                'approved_at': approval.approved_at,
            })
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found'}, status=404)
    
    @extend_schema(responses={200: None})
    def patch(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
            approval, created = OrderApproval.objects.get_or_create(order=order)
            for field in ['client_approval_files', 'approved_at']:
                if field in request.data:
                    setattr(approval, field, request.data[field])
            approval.save()
            return Response({'ok': True})
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found'}, status=404)


class OrderDeliveryView(APIView):
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'delivery']
    
    @extend_schema(responses={200: None})
    def get(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
            delivery, created = OrderDelivery.objects.get_or_create(order=order)
            return Response({
                'delivery_code': delivery.delivery_code,
                'delivery_status': delivery.delivery_status,
                'delivered_at': delivery.delivered_at,
                'rider_photo_path': delivery.rider_photo_path,
            })
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found'}, status=404)
    
    @extend_schema(responses={200: None})
    def patch(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
            delivery, created = OrderDelivery.objects.get_or_create(order=order)
            for field in ['delivery_code', 'delivery_status', 'delivered_at', 'rider_photo_path']:
                if field in request.data:
                    setattr(delivery, field, request.data[field])
            delivery.save()
            new_status = _derive_status_from_stage(order.stage, payload=request.data, delivery=delivery)
            if new_status and new_status != order.status:
                order.status = new_status
                order.save(update_fields=['status'])
            return Response({'ok': True})
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found'}, status=404)

# Create your views here.
