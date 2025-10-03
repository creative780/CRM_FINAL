"""
Workflow-specific views for design approvals, machine assignments, and file management.
This file contains all the new API endpoints for the enhanced workflow system.
"""

from django.utils import timezone
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from drf_spectacular.utils import extend_schema

from .models import Order, DesignApproval, ProductMachineAssignment, OrderFile
from .serializers import (
    DesignApprovalSerializer, DesignApprovalCreateSerializer, ApproveDesignSerializer,
    ProductMachineAssignmentSerializer, MachineAssignmentCreateSerializer,
    OrderFileSerializer, FileUploadSerializer, OrderSerializer
)
from accounts.permissions import RolePermission


class RequestDesignApprovalView(APIView):
    """Designer requests approval from sales person"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'designer']
    
    @extend_schema(
        summary="Request Design Approval",
        description="Designer submits design for approval by sales person",
        request=DesignApprovalCreateSerializer,
        responses={201: DesignApprovalSerializer}
    )
    def post(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = DesignApprovalCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            # Determine the correct sales person - MUST be the one who created/owns this order
            target_sales_person = order.assigned_sales_person
            
            # If no sales person assigned to order, fallback to requested sales person
            if not target_sales_person:
                target_sales_person = serializer.validated_data['sales_person']
            
            print(f'📋 Design approval for order {order.order_code} to sales person: {target_sales_person}')
            
            # Create approval request - always send to the order's sales person
            approval = DesignApproval.objects.create(
                order=order,
                designer=serializer.validated_data['designer'],
                sales_person=target_sales_person,  # Use order's assigned sales person
                design_files_manifest=serializer.validated_data.get('design_files_manifest', []),
                approval_notes=serializer.validated_data.get('approval_notes', '')
            )
            
            # Update order status and assignments
            order.status = 'sent_for_approval'
            order.assigned_designer = serializer.validated_data['designer']
            # Ensure the sales person is set (the one who should approve)
            order.assigned_sales_person = target_sales_person
            order.save(update_fields=['status', 'assigned_designer', 'assigned_sales_person'])
        
        return Response(
            DesignApprovalSerializer(approval).data,
            status=status.HTTP_201_CREATED
        )


class ApproveDesignView(APIView):
    """Sales person approves or rejects design"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'sales']
    
    @extend_schema(
        summary="Approve or Reject Design",
        description="Sales person approves or rejects the designer's work",
        request=ApproveDesignSerializer,
        responses={200: DesignApprovalSerializer}
    )
    def post(self, request, approval_id):
        try:
            approval = DesignApproval.objects.get(id=approval_id)
        except DesignApproval.DoesNotExist:
            return Response({'error': 'Approval request not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Enhanced authorization logic - MORE FLEXIBLE
        current_user = request.user.username if hasattr(request.user, 'username') else 'unknown'
        user_roles = request.user.roles if hasattr(request.user, 'roles') and request.user.roles else ['unknown']
        
        # Check if user can approve
        can_approve = False
        
        # Admin can always approve
        if request.user.has_role('admin'):
            can_approve = True
            print(f'Admin {current_user} can approve approval {approval_id}')
        # Only the sales person who created/owns the order can approve
        elif 'sales' in user_roles and approval.order.assigned_sales_person == current_user:
            can_approve = True
            print(f'Sales person {current_user} can approve (owns this order: {approval.order.order_code})')
        # Temporary: Allow abdullah to approve any design (for debugging)
        elif current_user == 'abdullah':
            can_approve = True
            print(f'TEMPORARY: abdullah can approve any design (debugging mode)')
            print(f'   Order assigned to: {approval.order.assigned_sales_person}')
            print(f'   Approval assigned to: {approval.sales_person}')
            print(f'   abdullah has roles: {user_roles}')
        else:
            print(f'❌ User {current_user} cannot approve')
            print(f'   Current user has sales role: {"sales" in user_roles}')
            print(f'   Order assigned to: {approval.order.assigned_sales_person}')
            print(f'   Approval assigned to: {approval.sales_person}')
            print(f'   User roles: {user_roles}')
            
        if not can_approve:
            error_msg = f'User {current_user} cannot approve this order. '
            if approval.sales_person:
                error_msg += f'Assigned sales person: {approval.sales_person}. '
            if approval.order.assigned_sales_person:
                error_msg += f'Order assigned to: {approval.order.assigned_sales_person}. '
            error_msg += 'Only assigned sales person or admin can approve.'
            
            return Response(
                {'error': error_msg},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = ApproveDesignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        action = serializer.validated_data['action']
        
        with transaction.atomic():
            if action == 'approve':
                approval.approval_status = 'approved'
                approval.reviewed_at = timezone.now()
                approval.save()
                
                # Make design files visible to production team
                from .models import OrderFile
                design_files = approval.order.files.filter(file_type='design')
                for file_obj in design_files:
                    if 'production' not in (file_obj.visible_to_roles or []):
                        file_obj.visible_to_roles = (file_obj.visible_to_roles or []) + ['production']
                        file_obj.save(update_fields=['visible_to_roles'])
                
                # Update order status - designer can now send to production
                approval.order.status = 'sent_to_designer'  # Approved, waiting for designer to send to production
                approval.order.save(update_fields=['status'])
                
            elif action == 'reject':
                approval.approval_status = 'rejected'
                approval.rejection_reason = serializer.validated_data.get('rejection_reason', '')
                approval.reviewed_at = timezone.now()
                approval.save()
                
                # Update order status - back to designer for revisions
                approval.order.status = 'sent_to_designer'
                approval.order.save(update_fields=['status'])
        
        return Response(DesignApprovalSerializer(approval).data)


class SendToProductionView(APIView):
    """Designer sends approved design to production"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'designer']
    
    @extend_schema(
        summary="Send to Production",
        description="Designer sends approved order to production team",
        responses={200: OrderSerializer}
    )
    def post(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if design is approved
        latest_approval = order.design_approvals.filter(approval_status='approved').order_by('-reviewed_at').first()
        
        if not latest_approval and not request.user.has_role('admin'):
            return Response(
                {'error': 'Design must be approved before sending to production'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            order.status = 'sent_to_production'
            order.stage = 'printing'  # Move to printing stage
            order.save(update_fields=['status', 'stage'])
        
        return Response({
            'ok': True,
            'message': f'Order {order.order_code} sent to production',
            'data': OrderSerializer(order, context={'request': request}).data
        })


class AssignMachinesView(APIView):
    """Production assigns machines to products"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'production']
    
    @extend_schema(
        summary="Assign Machines to Products",
        description="Production person assigns machines to each product in the order",
        request=MachineAssignmentCreateSerializer(many=True),
        responses={201: ProductMachineAssignmentSerializer(many=True)}
    )
    def post(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Validate that we receive a list
        if not isinstance(request.data, list):
            return Response(
                {'error': 'Expected a list of machine assignments'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        assignments = []
        
        with transaction.atomic():
            # Clear existing assignments for this order
            order.machine_assignments.all().delete()
            
            # Create new assignments
            for assignment_data in request.data:
                serializer = MachineAssignmentCreateSerializer(data=assignment_data)
                serializer.is_valid(raise_exception=True)
                
                # Calculate expected completion time
                started_at = timezone.now()
                estimated_minutes = serializer.validated_data['estimated_time_minutes']
                
                assignment = ProductMachineAssignment.objects.create(
                    order=order,
                    product_name=serializer.validated_data['product_name'],
                    product_sku=serializer.validated_data.get('product_sku', ''),
                    product_quantity=serializer.validated_data['product_quantity'],
                    machine_id=serializer.validated_data['machine_id'],
                    machine_name=serializer.validated_data['machine_name'],
                    estimated_time_minutes=estimated_minutes,
                    started_at=started_at,
                    assigned_by=serializer.validated_data.get('assigned_by', request.user.username),
                    notes=serializer.validated_data.get('notes', ''),
                    status='queued'
                )
                assignments.append(assignment)
            
            # Update order status
            order.status = 'getting_ready'
            order.assigned_production_person = request.user.username if hasattr(request.user, 'username') else ''
            order.save(update_fields=['status', 'assigned_production_person'])
        
        return Response(
            ProductMachineAssignmentSerializer(assignments, many=True).data,
            status=status.HTTP_201_CREATED
        )


class UploadOrderFileView(APIView):
    """Upload files for any stage of the order"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'sales', 'designer', 'production', 'delivery']
    parser_classes = [MultiPartParser, FormParser]
    
    @extend_schema(
        summary="Upload Order File",
        description="Upload a file related to an order with role-based visibility",
        request=FileUploadSerializer,
        responses={201: OrderFileSerializer}
    )
    def post(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = FileUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        uploaded_file = serializer.validated_data['file']
        
        # Create order file
        order_file = OrderFile.objects.create(
            order=order,
            file=uploaded_file,
            file_name=uploaded_file.name,
            file_type=serializer.validated_data['file_type'],
            file_size=uploaded_file.size,
            mime_type=uploaded_file.content_type or 'application/octet-stream',
            uploaded_by=request.user.username if hasattr(request.user, 'username') else 'unknown',
            uploaded_by_role=', '.join(request.user.roles) if hasattr(request.user, 'roles') and request.user.roles else 'unknown',
            stage=serializer.validated_data['stage'],
            visible_to_roles=serializer.validated_data.get('visible_to_roles', ['admin']),
            description=serializer.validated_data.get('description', ''),
            product_related=serializer.validated_data.get('product_related', '')
        )
        
        return Response(
            OrderFileSerializer(order_file, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class OrderFilesListView(APIView):
    """Get all files for an order (filtered by role)"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'sales', 'designer', 'production', 'delivery']
    
    @extend_schema(
        summary="List Order Files",
        description="Get all files for an order, filtered by user role",
        responses={200: OrderFileSerializer(many=True)}
    )
    def get(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get user role
        user_roles = request.user.roles if hasattr(request.user, 'roles') and request.user.roles else ['unknown']
        
        # Admin sees all files
        if request.user.has_role('admin'):
            files = order.files.all()
        else:
            # Other roles see only files visible to them
            # SQLite doesn't support contains lookup on JSON fields, so we filter in Python
            all_files = order.files.all()
            files = []
            for file_obj in all_files:
                # Check if any of the user's roles are in the file's visible_to_roles
                if any(role in (file_obj.visible_to_roles or []) for role in user_roles):
                    files.append(file_obj)
        
        return Response(
            OrderFileSerializer(files, many=True, context={'request': request}).data
        )


class DeleteOrderFileView(APIView):
    """Delete a file from an order"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'sales', 'designer', 'production', 'delivery']
    
    @extend_schema(
        summary="Delete Order File",
        description="Delete a file from an order (only uploader or admin can delete)",
        responses={204: None, 403: None, 404: None}
    )
    def delete(self, request, order_id, file_id):
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            order_file = order.files.get(id=file_id)
        except OrderFile.DoesNotExist:
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check permissions
        user_username = request.user.username if hasattr(request.user, 'username') else 'unknown'
        
        # Only admin or the uploader can delete
        if not request.user.has_role('admin') and order_file.uploaded_by != user_username:
            return Response(
                {'error': 'Permission denied. Only admin or file uploader can delete files.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Delete the file
        order_file.file.delete(save=False)  # Delete from storage
        order_file.delete()  # Delete from database
        
        return Response(status=status.HTTP_204_NO_CONTENT)


class UpdateOrderFileView(APIView):
    """Update file metadata"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'sales', 'designer', 'production', 'delivery']
    
    @extend_schema(
        summary="Update Order File",
        description="Update file metadata (description, visibility, etc.)",
        responses={200: OrderFileSerializer}
    )
    def patch(self, request, order_id, file_id):
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            order_file = order.files.get(id=file_id)
        except OrderFile.DoesNotExist:
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check permissions
        user_username = request.user.username if hasattr(request.user, 'username') else 'unknown'
        
        # Only admin or the uploader can update
        if not request.user.has_role('admin') and order_file.uploaded_by != user_username:
            return Response(
                {'error': 'Permission denied. Only admin or file uploader can update files.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Update allowed fields
        allowed_fields = ['description', 'visible_to_roles', 'product_related']
        for field in allowed_fields:
            if field in request.data:
                setattr(order_file, field, request.data[field])
        
        order_file.save()
        
        return Response(
            OrderFileSerializer(order_file, context={'request': request}).data
        )


class PendingApprovalsView(APIView):
    """Get pending approval requests for a sales person"""
    permission_classes = []  # Temporarily remove permission check for debugging
    # allowed_roles = ['admin', 'sales']  # Commented out for debugging
    
    @extend_schema(
        summary="List Pending Approvals",
        description="Get all pending design approval requests for the current sales person",
        responses={200: DesignApprovalSerializer(many=True)}
    )
    def get(self, request):
        current_user = request.user.username if hasattr(request.user, 'username') else 'unknown'
        user_roles = request.user.roles if hasattr(request.user, 'roles') and request.user.roles else ['unknown']
        
        # DEBUG: Show all pending approvals for testing
        approvals = DesignApproval.objects.filter(approval_status='pending').select_related('order')
        
        print(f"DEBUG: Current user: {current_user}, roles: {user_roles}")
        print(f"DEBUG: Found {approvals.count()} pending approvals")
        for approval in approvals:
            # Correctly access order_code through the related Order object
            print(f"  - Approval {approval.id}: {approval.order.order_code}, sales_person: {approval.sales_person}, status: {approval.approval_status}")
        
        return Response(
            DesignApprovalSerializer(approvals, many=True).data
        )


class MachineQueueView(APIView):
    """Get production queue grouped by machine"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'production']
    
    @extend_schema(
        summary="Get Machine Queue",
        description="Get all active machine assignments grouped by machine",
        responses={200: ProductMachineAssignmentSerializer(many=True)}
    )
    def get(self, request):
        # Get all assignments that are not completed
        assignments = ProductMachineAssignment.objects.filter(
            status__in=['queued', 'in_progress']
        ).select_related('order').order_by('expected_completion_time')
        
        return Response(
            ProductMachineAssignmentSerializer(assignments, many=True).data
        )


class UpdateMachineAssignmentStatusView(APIView):
    """Update status of a machine assignment"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'production']
    
    @extend_schema(
        summary="Update Machine Assignment Status",
        description="Update the status of a product's machine assignment",
        responses={200: ProductMachineAssignmentSerializer}
    )
    def patch(self, request, assignment_id):
        try:
            assignment = ProductMachineAssignment.objects.get(id=assignment_id)
        except ProductMachineAssignment.DoesNotExist:
            return Response({'error': 'Assignment not found'}, status=status.HTTP_404_NOT_FOUND)
        
        new_status = request.data.get('status')
        if new_status not in dict(ProductMachineAssignment.PRODUCTION_STATUS_CHOICES):
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            assignment.status = new_status
            
            if new_status == 'in_progress' and not assignment.started_at:
                assignment.started_at = timezone.now()
            elif new_status == 'completed':
                assignment.completed_at = timezone.now()
            
            assignment.save()
            
            # Check if all assignments for this order are completed
            order = assignment.order
            all_completed = all(
                a.completed_at is not None 
                for a in order.machine_assignments.all()
            )
            
            if all_completed:
                # Auto-update order status to ready for delivery
                order.status = 'sent_for_delivery'
                order.save(update_fields=['status'])
        
        return Response(ProductMachineAssignmentSerializer(assignment).data)


class SendToAdminView(APIView):
    """Production sends completed order back to admin"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'production']
    
    @extend_schema(
        summary="Send to Admin",
        description="Production confirms order is ready and sends to admin for final processing",
        responses={200: OrderSerializer}
    )
    def post(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        
        with transaction.atomic():
            order.status = 'sent_to_admin'
            order.stage = 'printing'  # Move to printing/QA stage
            order.save(update_fields=['status', 'stage'])
        
        return Response({
            'ok': True,
            'message': f'Order {order.order_code} sent to admin',
            'data': OrderSerializer(order, context={'request': request}).data
        })


class OrderStatusTrackingView(APIView):
    """Get real-time status tracking information for an order"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'sales', 'designer', 'production', 'delivery']
    
    @extend_schema(
        summary="Get Order Status Tracking",
        description="Get detailed status tracking information for an order",
        responses={200: {"status": "string", "progress": "object", "next_actions": "array"}}
    )
    def get(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Calculate progress based on current status
        progress = self._calculate_progress(order)
        
        # Determine next actions
        next_actions = self._get_next_actions(order)
        
        # Get status timeline
        timeline = self._get_status_timeline(order)
        
        return Response({
            'order_id': order.id,
            'order_code': order.order_code,
            'current_status': order.status,
            'current_stage': order.stage,
            'progress': progress,
            'next_actions': next_actions,
            'timeline': timeline,
            'last_updated': order.updated_at,
            'estimated_completion': self._get_estimated_completion(order)
        })
    
    def _calculate_progress(self, order):
        """Calculate progress percentage based on order status"""
        status_progress = {
            'draft': 5,
            'sent_to_sales': 10,
            'sent_to_designer': 20,
            'sent_for_approval': 30,
            'sent_to_production': 40,
            'getting_ready': 60,
            'sent_for_delivery': 80,
            'delivered': 100,
            'new': 10,
            'active': 50,
            'completed': 100,
        }
        
        base_progress = status_progress.get(order.status, 0)
        
        # Add production progress if in production stage
        if order.status in ['getting_ready', 'sent_to_production']:
            assignments = order.machine_assignments.all()
            if assignments.exists():
                completed_assignments = assignments.exclude(actual_completion_time__isnull=True).count()
                total_assignments = assignments.count()
                production_progress = (completed_assignments / total_assignments) * 20  # 20% for production
                base_progress += production_progress
        
        return {
            'percentage': min(100, base_progress),
            'stage': order.stage,
            'status': order.status
        }
    
    def _get_next_actions(self, order):
        """Get next possible actions based on current status"""
        actions = []
        
        if order.status == 'draft':
            actions.append({
                'action': 'send_to_sales',
                'label': 'Send to Sales',
                'description': 'Submit order for sales review',
                'required_role': 'admin'
            })
        
        elif order.status == 'sent_to_sales':
            actions.append({
                'action': 'send_to_designer',
                'label': 'Send to Designer',
                'description': 'Assign order to designer',
                'required_role': 'sales'
            })
        
        elif order.status == 'sent_to_designer':
            actions.append({
                'action': 'request_approval',
                'label': 'Request Approval',
                'description': 'Submit design for approval',
                'required_role': 'designer'
            })
        
        elif order.status == 'sent_for_approval':
            actions.extend([
                {
                    'action': 'approve_design',
                    'label': 'Approve Design',
                    'description': 'Approve the submitted design',
                    'required_role': 'sales'
                },
                {
                    'action': 'reject_design',
                    'label': 'Reject Design',
                    'description': 'Reject design and request revisions',
                    'required_role': 'sales'
                }
            ])
        
        elif order.status == 'sent_to_production':
            actions.append({
                'action': 'assign_machines',
                'label': 'Assign Machines',
                'description': 'Assign machines to products',
                'required_role': 'production'
            })
        
        elif order.status == 'getting_ready':
            actions.append({
                'action': 'mark_ready',
                'label': 'Mark as Ready',
                'description': 'Mark order as ready for delivery',
                'required_role': 'production'
            })
        
        elif order.status == 'sent_for_delivery':
            actions.append({
                'action': 'mark_delivered',
                'label': 'Mark as Delivered',
                'description': 'Confirm order delivery',
                'required_role': 'delivery'
            })
        
        return actions
    
    def _get_status_timeline(self, order):
        """Get status change timeline"""
        timeline = [
            {
                'status': 'draft',
                'label': 'Order Created',
                'timestamp': order.created_at,
                'completed': True
            }
        ]
        
        # Add other status changes based on current status
        status_sequence = [
            ('sent_to_sales', 'Sent to Sales'),
            ('sent_to_designer', 'Sent to Designer'),
            ('sent_for_approval', 'Sent for Approval'),
            ('sent_to_production', 'Sent to Production'),
            ('getting_ready', 'Getting Ready'),
            ('sent_for_delivery', 'Sent for Delivery'),
            ('delivered', 'Delivered')
        ]
        
        current_status_index = -1
        for i, (status, label) in enumerate(status_sequence):
            if status == order.status:
                current_status_index = i
                break
        
        for i, (status, label) in enumerate(status_sequence):
            if i <= current_status_index:
                timeline.append({
                    'status': status,
                    'label': label,
                    'timestamp': order.updated_at if i == current_status_index else None,
                    'completed': i < current_status_index,
                    'current': i == current_status_index
                })
            else:
                timeline.append({
                    'status': status,
                    'label': label,
                    'timestamp': None,
                    'completed': False,
                    'current': False
                })
        
        return timeline
    
    def _get_estimated_completion(self, order):
        """Get estimated completion time"""
        if order.status == 'delivered':
            return order.delivered_at
        
        # Calculate based on machine assignments
        assignments = order.machine_assignments.all()
        if assignments.exists():
            # Use assigned_at + estimated_time_minutes for completion estimation
            completion_times = []
            for assignment in assignments:
                if assignment.started_at and assignment.estimated_time_minutes:
                    completion_time = assignment.started_at + timezone.timedelta(minutes=assignment.estimated_time_minutes)
                    completion_times.append(completion_time)
            if completion_times:
                return max(completion_times)
        
        # Default estimation based on status
        status_days = {
            'draft': 7,
            'sent_to_sales': 5,
            'sent_to_designer': 3,
            'sent_for_approval': 2,
            'sent_to_production': 1,
            'getting_ready': 1,
            'sent_for_delivery': 1,
        }
        
        days = status_days.get(order.status, 1)
        return timezone.now() + timezone.timedelta(days=days)


class DesignApprovalsListView(APIView):
    """
    Get all design approvals for a specific order.
    Used by designer to check approval status.
    """
    permission_classes = []  # Use allow_all from permissions

    def get(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
            approvals = order.design_approvals.all().order_by('-submitted_at')
            serializer = DesignApprovalSerializer(approvals, many=True)
            return Response(serializer.data)
        except Order.DoesNotExist:
            return Response({"error": "Order not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

