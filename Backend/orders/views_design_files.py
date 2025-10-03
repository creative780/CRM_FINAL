"""
Design File Management Views
Provides secure file upload, storage, and management for design files.
HANDLES: File validation, secure storage, access control, and metadata management
"""

import os
import uuid
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.http import JsonResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from drf_spectacular.utils import extend_schema
from django.core.exceptions import ValidationError
import mimetypes

from .models import Order, OrderItem, OrderFile
from accounts.permissions import RolePermission


class DesignFileUploadView(APIView):
    """
    Ultra-Secure Design File Upload
    Features:
    - File type validation
    - Size limits
    - Virus scanning preparation
    - Unique naming
    - Secure storage paths
    - Complete audit trail
    """
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'sales', 'designer']
    parser_classes = [MultiPartParser, FormParser]
    
    # SECURITY: File type validation
    ALLOWED_EXTENSIONS = {
        # Images
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tiff',
        # Documents
        '.pdf', '.doc', '.docx', '.txt', '.rtf',
        # Design Files
        '.ai', '.psd', '.eps', '.sketch', '.fig', '.xd',
        # Archives
        '.zip', '.rar', '.7z'
    }
    
    # SECURITY: MIME type validation
    ALLOWED_MIME_TYPES = [
        # Images
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 
        'image/bmp', 'image/svg+xml', 'image/tiff', 'image/x-tiff',
        # Documents
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'application/rtf',
        # Archives
        'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
    ]
    
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB limit
    
    @extend_schema(
        summary="Upload Design File",
        description="Securely upload design files for order items with validation and storage",
        request={
            'multipart/form-data': {
                'files': 'File(s) to upload',
                'order_id': 'Order ID',
                'product_id': 'Product ID (optional)',
                'description': 'File description (optional)'
            }
        },
        responses={
            201: {'file_id': 'int', 'file_url': 'string', 'file_name': 'string', 'status': 'success'},
            400: {'error': 'Validation error message'},
            401: {'error': 'Authentication required'},
            403: {'error': 'Permission denied'}
        }
    )
    def post(self, request):
        """Upload design files with comprehensive security validation"""
        
        # Extract data from request
        files = request.FILES.getlist('files')
        order_id = request.data.get('order_id')
        product_id = request.data.get('product_id')
        description = request.data.get('description', '')
        
        # Validate required fields
        if not files:
            return Response({'error': 'No files provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not order_id:
            return Response({'error': 'Order ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate order exists
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        
        uploaded_files = []
        
        with transaction.atomic():
            for file in files:
                # SECURITY: Validate file
                validation_result = self._validate_file(file)
                if not validation_result['valid']:
                    return Response({'error': validation_result['error']}, status=status.HTTP_400_BAD_REQUEST)
                
                # Generate secure filename
                secure_filename = self._generate_secure_filename(file)
                
                # SECURITY: Save file with secure path
                file_path = f'design_files/{order_id}/{timezone.now().year}/{timezone.now().month:02d}/{secure_filename}'
                
                try:
                    # Upload file to storage
                    saved_path = default_storage.save(file_path, ContentFile(file.read()))
                    
                    # Create OrderFile record
                    order_file = OrderFile.objects.create(
                        order=order,
                        file=default_storage.path(saved_path) if default_storage.exists(saved_path) else saved_path,
                        file_name=file.name,
                        file_type='design',
                        file_size=file.size,
                        mime_type=file.content_type or 'application/octet-stream',
                        uploaded_by=request.user.username if hasattr(request.user, 'username') else 'unknown',
                        uploaded_by_role=request.user.role if hasattr(request.user, 'role') else 'unknown',
                        stage='design',
                        visible_to_roles=['admin', 'designer', 'sales', 'production'],
                        description=description,
                        product_related=f"Product ID: {product_id}" if product_id else ""
                    )
                    
                    uploaded_files.append({
                        'file_id': order_file.id,
                        'file_url': request.build_absolute_uri(default_storage.url(saved_path)),
                        'file_name': file.name,
                        'file_size': file.size,
                        'mime_type': file.content_type
                    })
                    
                except Exception as e:
                    return Response(
                        {'error': f'Failed to save file: {str(e)}'}, 
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            
            # Update design_files_manifest for backward compatibility
            if product_id and uploaded_files:
                item = order.items.filter(product_id=product_id).first()
                if item:
                    manifest_entry = {
                        'id': str(uuid.uuid4()),
                        'name': file.name,
                        'size': file.size,
                        'type': file.content_type,
                        'url': uploaded_files[-1]['file_url'],
                        'uploaded_at': timezone.now().isoformat(),
                        'order_file_id': order_file.id
                    }
                    
                    # Add to manifest
                    current_manifest = item.design_files_manifest or []
                    current_manifest.append(manifest_entry)
                    item.design_files_manifest = current_manifest
                    item.save(update_fields=['design_files_manifest'])
        
        return Response({
            'uploaded_files': uploaded_files,
            'total_files': len(uploaded_files),
            'status': 'success',
            'message': f'Successfully uploaded {len(uploaded_files)} design file(s)'
        }, status=status.HTTP_201_CREATED)
    
    def _validate_file(self, file):
        """Comprehensive file validation"""
        try:
            # Check file size
            if file.size > self.MAX_FILE_SIZE:
                return {'valid': False, 'error': f'File size exceeds limit. Maximum allowed: {self.MAX_FILE_SIZE // (1024*1024)}MB'}
            
            # Check file extension
            file_ext = os.path.splitext(file.name.lower())[1]
            if file_ext not in self.ALLOWED_EXTENSIONS:
                return {'valid': False, 'error': f'File type not allowed: {file_ext}. Allowed: {", ".join(self.ALLOWED_EXTENSIONS)}'}
            
            # Check MIME type
            if file.content_type and file.content_type not in self.ALLOWED_MIME_TYPES:
                return {'valid': False, 'error': f'File MIME type not allowed: {file.content_type}'}
            
            # Additional security checks
            if self._contains_suspicious_content(file):
                return {'valid': False, 'error': 'File contains suspicious content. Upload rejected for security.'}
            
            return {'valid': True}
            
        except Exception as e:
            return {'valid': False, 'error': f'File validation error: {str(e)}'}
    
    def _generate_secure_filename(self, file):
        """Generate secure filename with UUID"""
        file_ext = os.path.splitext(file.name.lower())[1]
        secure_name = f"{uuid.uuid4()}{file_ext}"
        return secure_name
    
    def _contains_suspicious_content(self, file):
        """Basic security check for suspicious file content"""
        try:
            # Check file extension vs actual content
            file_ext = os.path.splitext(file.name.lower())[1]
            
            # Read first few bytes to check for file signatures
            file.seek(0)
            file_header = file.read(10)
            file.seek(0)  # Reset position
            
            # Basic file signature validation
            suspicious_signatures = {
                b'\x4D\x5A': 'potential_exe',
                b'\x7F\x45\x4C\x46': 'potential_binary',
                b'\xCA\xFE\xBA\xBE': 'potential_java'
            }
            
            for signature, _ in suspicious_signatures.items():
                if file_header.startswith(signature):
                    return True
            
            return False
            
        except Exception:
            return False


class DesignFileUrlView(APIView):
    """
    Get secure preview URL for design files
    """
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'sales', 'designer', 'production']
    
    @extend_schema(
        summary="Get Design File URL",
        description="Get secure preview URL for design files",
        responses={
            200: {'url': 'secure_preview_url'},
            404: {'error': 'File not found'},
            403: {'error': 'Access denied'}
        }
    )
    def get(self, request, order_id, file_id):
        """Get secure preview URL for design file"""
        try:
            order_file = OrderFile.objects.get(id=file_id, order_id=order_id)
            
            # Check access permissions
            user_role = request.user.role if hasattr(request.user, 'role') else 'unknown'
            if user_role not in order_file.visible_to_roles:
                return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
            
            # Generate secure URL or serve file URL
            if order_file.file and hasattr(order_file.file, 'url'):
                # Use the file's URL
                file_url = order_file.file.url
                request_url = request.build_absolute_uri(file_url)
                return Response({'url': request_url})
            else:
                return Response({'error': 'File not available'}, status=status.HTTP_404_NOT_FOUND)
                
        except OrderFile.DoesNotExist:
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error getting design file URL: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DesignFileDownloadView(APIView):
    """
    Secure Design File Download
    Features:
    - Access control by role
    - Audit logging
    - Secure file serving
    """
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'sales', 'designer', 'production']
    
    @extend_schema(
        summary="Download Design File",
        description="Securely download design files with access control",
        responses={
            200: {'file_served': 'success'},
            404: {'error': 'File not found'},
            403: {'error': 'Access denied'}
        }
    )
    def get(self, request, order_id, file_id):
        """Serve design file with security check"""
        
        try:
            order_file = OrderFile.objects.select_related('order').get(
                id=file_id, 
                order_id=order_id,
                file_type='design'
            )
        except OrderFile.DoesNotExist:
            return Response({'error': 'Design file not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check access permissions
        if not self._check_file_access(order_file, request.user):
            return Response({'error': 'Access denied to this design file'}, status=status.HTTP_403_FORBIDDEN)
        
        # Serve file securely
        try:
            if default_storage.exists(order_file.file.name):
                response = FileResponse(
                    default_storage.open(order_file.file.name, 'rb'),
                    filename=order_file.file_name
                )
                
                # Log download for audit
                self._log_download_audit(order_file, request.user)
                
                return response
            else:
                return Response({'error': 'File not found on storage'}, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            return Response({'error': f'File serving error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _check_file_access(self, order_file, user):
        """Check if user can access this file"""
        user_role = getattr(user, 'role', 'unknown')
        
        # Admin has access to all files
        if user_role == 'admin':
            return True
        
        # Check if user role is in visible roles
        return user_role in order_file.visible_to_roles
    
    def _log_download_audit(self, order_file, user):
        """Log file download for audit trail"""
        audit_message = f"Design file downloaded: {order_file.file_name} from Order {order_file.order.order_code} by {user.username}"
        print(f"AUDIT: {audit_message}")


class DesignFileListView(APIView):
    """
    List Design Files for Order
    Features:
    - Role-based filtering
    - Organized by product
    - Metadata included
    """
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'sales', 'designer', 'production']
    
    @extend_schema(
        summary="List Design Files",
        description="Get all design files for an order with access control",
        responses={200: {'design_files': 'array'}}
    )
    def get(self, request, order_id):
        """Get all design files for an order"""
        
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        
        user_role = getattr(request.user, 'role', 'unknown')
        
        # Get files based on access level
        if user_role == 'admin':
            files = order.files.filter(file_type='design')
        else:
            files = order.files.filter(
                file_type='design',
                visible_to_roles__contains=[user_role]
            )
        
        # Organize files by product
        files_data = []
        for file_in_order in files:
            files_data.append({
                'id': file_in_order.id,
                'file_name': file_in_order.file_name,
                'file_url': request.build_absolute_uri(default_storage.url(file_in_order.file.name)) if default_storage.exists(file_in_order.file.name) else None,
                'file_size': file_in_order.file_size,
                'mime_type': file_in_order.mime_type,
                'uploaded_by': file_in_order.uploaded_by,
                'uploaded_at': file_in_order.uploaded_at,
                'product_related': file_in_order.product_related,
                'description': file_in_order.description
            })
        
        return Response({
            'order_id': order_id,
            'design_files': files_data,
            'total_count': len(files_data)
        })


class DesignFileDeleteView(APIView):
    """
    Delete Design File
    Features:
    - Permission checking
    - Complete file removal
    - Manifest updates
    """
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'designer']  # Only admin and designer can delete design files
    
    @extend_schema(
        summary="Delete Design File",
        description="Delete a design file from an order",
        responses={204: None, 404: {'error': 'File not found'}}
    )
    def delete(self, request, order_id, file_id):
        """Delete a design file"""
        
        try:
            order_file = OrderFile.objects.select_related('order').get(
                id=file_id,
                order_id=order_id,
                file_type='design'
            )
        except OrderFile.DoesNotExist:
            return Response({'error': 'Design file not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check delete permissions
        user_role = getattr(request.user, 'role', 'unknown')
        if user_role != 'admin' and order_file.uploaded_by != request.user.username:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        with transaction.atomic():
            # Remove from storage
            if default_storage.exists(order_file.file.name):
                default_storage.delete(order_file.file.name)
            
            # Update design_files_manifest in related OrderItems
            for item in order_file.order.items.all():
                if item.design_files_manifest:
                    updated_manifest = [
                        file_entry for file_entry in item.design_files_manifest
                        if file_entry.get('order_file_id') != file_id
                    ]
                    item.design_files_manifest = updated_manifest
                    item.save(update_fields=['design_files_manifest'])
            
            # Delete database record
            order_file.delete()
        
        return Response(status=status.HTTP_204_NO_CONTENT)
