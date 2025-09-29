import random
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from orders.models import Order, DeliveryStage
from .models import DeliveryCode
from accounts.permissions import RolePermission
from drf_spectacular.utils import extend_schema


logger = logging.getLogger(__name__)


def _generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


class SendCodeView(APIView):
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'delivery']
    @extend_schema(responses={200: None})
    def post(self, request):
        order_id = request.data.get('orderId')
        phone = request.data.get('phone')
        if not order_id or not phone:
            return Response({'detail': 'orderId and phone required'}, status=400)
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found'}, status=404)
        code = _generate_code()
        ttl = timezone.now() + timedelta(minutes=15)
        DeliveryCode.objects.update_or_create(order=order, defaults={'code': code, 'expires_at': ttl})
        od, _ = DeliveryStage.objects.get_or_create(order=order)
        # Note: delivery_code is now on Order model, not DeliveryStage
        order.delivery_code = code
        order.save(update_fields=['delivery_code'])
        # SMS provider abstraction (console)
        provider = getattr(settings, 'SMS_PROVIDER', 'console')
        if provider == 'console' and settings.DEBUG:
            logger.info("[SMS] to %s: Your delivery code is %s", phone, code)
        return Response({'code': code, 'sent': True})


class RiderPhotoUploadView(APIView):
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'delivery']
    parser_classes = [MultiPartParser]
    @extend_schema(responses={200: None})
    def post(self, request):
        order_id = request.data.get('orderId')
        photo = request.FILES.get('photo') or request.FILES.get('file')
        if not order_id or not photo:
            return Response({'detail': 'orderId and photo required'}, status=400)
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found'}, status=404)
        # Save to MEDIA_ROOT
        import uuid, os
        ext = photo.name.split('.')[-1]
        fname = f"rider_{uuid.uuid4().hex}.{ext}"
        dest_dir = settings.MEDIA_ROOT
        os.makedirs(dest_dir, exist_ok=True)
        dest_path = os.path.join(dest_dir, fname)
        with open(dest_path, 'wb') as fh:
            for chunk in photo.chunks():
                fh.write(chunk)
        url = f"{settings.MEDIA_URL}{fname}"
        od, _ = DeliveryStage.objects.get_or_create(order=order)
        od.rider_photo_path = url
        od.save(update_fields=['rider_photo_path'])
        return Response({'url': url})

# Create your views here.
