import re
import uuid
import os
from typing import Any, Mapping, Optional
from decimal import Decimal
from django.utils.crypto import get_random_string
from django.db import transaction
from django.conf import settings
from django.core.files.storage import default_storage
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from .models import (
    Order, OrderItem, Quotation, DesignStage, PrintingStage, 
    ApprovalStage, DeliveryStage, Upload
)
from .serializers import (
    OrderSerializer, OrderCreateSerializer, OrderUpdateSerializer, OrderListSerializer,
    StageTransitionSerializer, MarkPrintedSerializer, SendDeliveryCodeSerializer,
    RiderPhotoUploadSerializer, QuotationSerializer, DesignStageSerializer,
    PrintingStageSerializer, ApprovalStageSerializer, DeliveryStageSerializer
)
from accounts.permissions import RolePermission
from drf_spectacular.utils import extend_schema, extend_schema_view


def generate_order_code() -> str:
    """Generate a human-readable order code like ORD-ABC123"""
    prefix = "ORD"
    suffix = get_random_string(6, allowed_chars='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
    return f"{prefix}-{suffix}"


def _derive_status_from_stage(stage: str, payload: Optional[Mapping[str, Any]] = None) -> str:
    """Return the desired order.status for a given stage transition."""
    stage_status_map = {
        "order_intake": "new",
        "quotation": "active",
        "design": "active",
        "printing": "active",
        "approval": "active",
        "delivery": "active",
    }
    
    if stage == "delivery" and payload:
        delivered_at = payload.get("delivered_at")
        if delivered_at:
            return "completed"

    return stage_status_map.get(stage, "new")


def create_stage_models(order: Order, stage: str, payload: dict = None):
    """Create or update stage-specific models"""
    try:
        print(f"Creating stage models for {stage} with payload: {payload}")
        
        if stage == "quotation" and payload:
            quotation, created = Quotation.objects.get_or_create(order=order)
            for field in ['labour_cost', 'finishing_cost', 'paper_cost', 'machine_cost', 
                         'design_cost', 'delivery_cost', 'other_charges', 'discount', 'advance_paid']:
                if field in payload:
                    # Convert string values to Decimal for cost fields
                    value = payload[field]
                    if isinstance(value, str):
                        try:
                            value = Decimal(value)
                        except (ValueError, TypeError):
                            value = Decimal('0.00')
                    setattr(quotation, field, value)
            quotation.save(skip_calculation=True)  # Skip auto-calculation for manual updates
            print(f"Quotation model saved: {created}")
        
        elif stage == "design" and payload:
            design, created = DesignStage.objects.get_or_create(order=order)
            for field in ['assigned_designer', 'requirements_files_manifest', 'design_status']:
                if field in payload:
                    print(f"Setting {field} = {payload[field]}")
                    setattr(design, field, payload[field])
            design.save()
            print(f"Design model saved: {created}")
        
        elif stage == "printing" and payload:
            printing, created = PrintingStage.objects.get_or_create(order=order)
            for field in ['print_operator', 'print_time', 'batch_info', 'print_status', 'qa_checklist']:
                if field in payload:
                    print(f"Setting {field} = {payload[field]}")
                    setattr(printing, field, payload[field])
            printing.save()
            print(f"Printing model saved: {created}")
        
        elif stage == "approval" and payload:
            approval, created = ApprovalStage.objects.get_or_create(order=order)
            for field in ['client_approval_files', 'approved_at']:
                if field in payload:
                    print(f"Setting {field} = {payload[field]}")
                    setattr(approval, field, payload[field])
            approval.save()
            print(f"Approval model saved: {created}")
        
        elif stage == "delivery" and payload:
            delivery, created = DeliveryStage.objects.get_or_create(order=order)
            for field in ['rider_photo_path', 'delivered_at']:
                if field in payload:
                    print(f"Setting {field} = {payload[field]}")
                    setattr(delivery, field, payload[field])
            delivery.save()
            print(f"Delivery model saved: {created}")
            
    except Exception as e:
        import traceback
        print(f"Error in create_stage_models: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        print(f"Stage: {stage}, Payload: {payload}")
        raise


@extend_schema_view(
    create=extend_schema(
        summary="Create Order",
        description="Create a new order with items",
        request=OrderCreateSerializer,
        responses={201: OrderSerializer}
    ),
    list=extend_schema(
        summary="List Orders",
        description="List orders with optional filtering by stage and status",
        responses={200: OrderListSerializer(many=True)}
    ),
    retrieve=extend_schema(
        summary="Get Order",
        description="Get detailed order information including all stage data",
        responses={200: OrderSerializer}
    ),
    partial_update=extend_schema(
        summary="Update Order",
        description="Update order base fields or transition to a new stage",
        request=OrderUpdateSerializer,
        responses={200: OrderSerializer}
    ),
    mark_printed=extend_schema(
        summary="Mark Printed",
        description="Mark order items as printed",
        request=MarkPrintedSerializer,
        responses={200: {"ok": True}}
    )
)
class OrdersViewSet(ModelViewSet):
    """Main ViewSet for Order CRUD operations and stage transitions"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'sales', 'designer', 'production', 'delivery', 'finance']
    
    def get_queryset(self):
        queryset = Order.objects.all().prefetch_related('items', 'uploads')
        
        # Filter by stage
        stage = self.request.query_params.get('stage')
        if stage:
            queryset = queryset.filter(stage=stage)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.order_by('-created_at')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return OrderListSerializer
        elif self.action == 'create':
            return OrderCreateSerializer
        elif self.action == 'partial_update':
            return OrderUpdateSerializer
        return OrderSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new order - matches frontend contract"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            # Create order
            order_data = serializer.validated_data
            items_data = order_data.pop('items')
            
            order = Order.objects.create(
                order_code=generate_order_code(),
                client_name=order_data['clientName'],
                company_name=order_data.get('companyName', ''),
                phone=order_data.get('phone', ''),
                email=order_data.get('email', ''),
                address=order_data.get('address', ''),
                specs=order_data.get('specs', ''),
                urgency=order_data.get('urgency', 'Normal'),
                created_by=request.user if request.user.is_authenticated else None,
            )
            
            # Create order items
            for item_data in items_data:
                OrderItem.objects.create(order=order, **item_data)
        
        response_serializer = OrderSerializer(order, context={'request': request})
        return Response({
            'ok': True,
            'data': {
                'id': order.id,
                'order_code': order.order_code,
                'items': response_serializer.data['items']
            }
        }, status=status.HTTP_201_CREATED)
    
    def partial_update(self, request, *args, **kwargs):
        """Update order or transition stage - matches frontend contract"""
        try:
            instance = self.get_object()
            
            # Check if this is a stage transition
            if 'stage' in request.data:
                return self._handle_stage_transition(instance, request.data)
            
            # Regular order update
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            
            with transaction.atomic():
                serializer.save()
            
            response_serializer = OrderSerializer(instance, context={'request': request})
            return Response({
                'ok': True,
                'data': response_serializer.data
            })
        except Exception as e:
            import traceback
            print(f"Error in partial_update: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            print(f"Request data: {request.data}")
            raise
    
    def _handle_stage_transition(self, order: Order, data: dict):
        """Handle stage transitions with payload"""
        try:
            stage_serializer = StageTransitionSerializer(data=data)
            stage_serializer.is_valid(raise_exception=True)
            
            new_stage = stage_serializer.validated_data['stage']
            payload = stage_serializer.validated_data.get('payload', {})
            
            print(f"Stage transition: {new_stage}, payload: {payload}")
            
            with transaction.atomic():
                # Update order stage and status
                order.stage = new_stage
                order.status = _derive_status_from_stage(new_stage, payload)
                order.save(update_fields=['stage', 'status'])
                
                # Create/update stage-specific models
                create_stage_models(order, new_stage, payload)
            
            response_serializer = OrderSerializer(order, context={'request': self.request})
            return Response({
                'ok': True,
                'data': response_serializer.data
            })
        except Exception as e:
            import traceback
            print(f"Error in _handle_stage_transition: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            print(f"Stage data: {data}")
            raise
    
    @action(detail=True, methods=['post'])
    def mark_printed(self, request, pk=None):
        """Mark order items as printed - matches frontend contract"""
        order = self.get_object()
        serializer = MarkPrintedSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        sku = serializer.validated_data['sku']
        qty = serializer.validated_data['qty']
        
        with transaction.atomic():
            # Update printing stage
            printing, created = PrintingStage.objects.get_or_create(order=order)
            printing.print_status = 'Printed'
            printing.save()
            
            # Update order status if needed
            if order.stage == 'printing':
                order.status = 'active'
                order.save(update_fields=['status'])
        
        return Response({'ok': True})


class SendDeliveryCodeView(APIView):
    """Send delivery code via SMS - matches frontend contract"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'delivery']
    
    @extend_schema(
        summary="Send Delivery Code",
        description="Send a 6-digit delivery code via SMS",
        request=SendDeliveryCodeSerializer,
        responses={200: {"ok": True}}
    )
    def post(self, request):
        serializer = SendDeliveryCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        code = serializer.validated_data['code']
        phone = serializer.validated_data['phone']
        
        # TODO: Integrate with Twilio for production
        # For now, just log the SMS
        print(f"SMS to {phone}: Your delivery code is {code}")
        
        return Response({'ok': True})


class RiderPhotoUploadView(APIView):
    """Upload rider photo for delivery proof - matches frontend contract"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'delivery']
    parser_classes = [MultiPartParser, FormParser]
    
    @extend_schema(
        summary="Upload Rider Photo",
        description="Upload proof of delivery photo",
        request=RiderPhotoUploadSerializer,
        responses={200: {"url": "string"}}
    )
    def post(self, request):
        serializer = RiderPhotoUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        photo = serializer.validated_data['photo']
        order_id = serializer.validated_data['orderId']
        
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Save the file
        file_path = default_storage.save(f'rider_photos/{order_id}_{photo.name}', photo)
        file_url = default_storage.url(file_path)
        
        # Update delivery stage
        delivery, created = DeliveryStage.objects.get_or_create(order=order)
        delivery.rider_photo_path = file_path
        delivery.save()
        
        # Build absolute URL
        if request:
            file_url = request.build_absolute_uri(file_url)
        
        return Response({'url': file_url})


# Legacy views for backward compatibility - can be removed after frontend migration
class OrdersListView(ListAPIView):
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'sales', 'designer', 'production', 'delivery', 'finance']
    serializer_class = OrderListSerializer
    
    def get_queryset(self):
        return Order.objects.all().order_by('-created_at')


class OrderDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'sales', 'designer', 'production', 'delivery', 'finance']
    serializer_class = OrderSerializer
    queryset = Order.objects.all()
    lookup_field = 'id'
    

class QuotationView(APIView):
    """Dedicated view for quotation operations"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'sales']
    
    def get(self, request, order_id):
        """Get quotation for an order"""
        try:
            order = Order.objects.get(id=order_id)
            quotation, created = Quotation.objects.get_or_create(order=order)
            
            serializer = QuotationSerializer(quotation)
            return Response({
                'ok': True,
                'data': serializer.data
            })
        except Order.DoesNotExist:
            return Response({
                'ok': False,
                'error': 'Order not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'ok': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def patch(self, request, order_id):
        """Update quotation for an order"""
        try:
            order = Order.objects.get(id=order_id)
            quotation, created = Quotation.objects.get_or_create(order=order)
            
            # Validate and update quotation fields
            serializer = QuotationSerializer(quotation, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            
            with transaction.atomic():
                # Update the quotation
                quotation = serializer.save()
                
                # Only recalculate totals if grand_total was not manually set
                if 'grand_total' not in request.data:
                    quotation.calculate_totals()
                    quotation.save()
                else:
                    # If grand_total was manually set, manually set it and save without recalculating
                    quotation.grand_total = Decimal(str(request.data['grand_total']))
                    quotation.save(skip_calculation=True)
                
                # Don't change order stage/status when updating quotations
                # This allows quotations to be updated without affecting order workflow
            
            return Response({
                'ok': True,
                'data': QuotationSerializer(quotation).data
            })
        except Order.DoesNotExist:
            return Response({
                'ok': False,
                'error': 'Order not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'ok': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
