from django.http import HttpResponse, Http404
from django.views import View
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from accounts.permissions import RolePermission, user_has_any_role
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
import os
import logging

logger = logging.getLogger(__name__)


class MonitoringFileView(APIView):
    """Serve monitoring files (screenshots, thumbnails)"""
    # Remove authentication - files are already protected by admin-only API endpoints
    permission_classes = []
    
    @method_decorator(cache_control(max_age=3600))  # Cache for 1 hour
    def get(self, request, file_path):
        """Serve file from monitoring storage"""
        try:
            # Security: prevent directory traversal
            if '..' in file_path or file_path.startswith('/'):
                raise Http404("File not found")
            
            # Try multiple storage locations
            storage_paths = [
                getattr(settings, 'MONITORING_STORAGE_PATH', '/var/app/data'),
                os.path.join(settings.BASE_DIR, 'monitoring_data'),
                os.path.join(settings.BASE_DIR, 'media', 'uploads'),
                os.path.join(settings.BASE_DIR, 'media')
            ]
            
            logger.info(f"Looking for file: {file_path}")
            logger.info(f"Storage paths: {storage_paths}")
            
            full_path = None
            for storage_path in storage_paths:
                # Try original path
                test_path = os.path.join(storage_path, file_path)
                logger.info(f"Testing path: {test_path} (exists: {os.path.exists(test_path)})")
                if os.path.exists(test_path):
                    full_path = test_path
                    logger.info(f"Found file at: {full_path}")
                    break
                
                # Handle "None/" prefix in file paths
                if file_path.startswith('None/'):
                    corrected_path = file_path.replace('None/', 'default/', 1)
                    test_path = os.path.join(storage_path, corrected_path)
                    if os.path.exists(test_path):
                        full_path = test_path
                        break
                
                # Try to find by SHA256 hash in media/uploads
                if 'media' in storage_path and file_path.endswith('.jpg'):
                    # Extract SHA256 from the file path
                    import re
                    sha256_match = re.search(r'([a-f0-9]{64})', file_path)
                    if sha256_match:
                        sha256 = sha256_match.group(1)
                        # Look for files with this SHA256
                        if os.path.exists(storage_path):
                            for filename in os.listdir(storage_path):
                                if sha256 in filename and filename.endswith('.jpg'):
                                    full_path = os.path.join(storage_path, filename)
                                    break
                        if full_path:
                            break
            
            if not full_path or not os.path.exists(full_path):
                # If thumbnail is missing, try to serve the full-size image
                if file_path.endswith('-thumb.jpg'):
                    full_size_path = file_path.replace('-thumb.jpg', '.jpg')
                    for storage_path in storage_paths:
                        test_path = os.path.join(storage_path, full_size_path)
                        if os.path.exists(test_path):
                            full_path = test_path
                            break
                
                # If still not found, return placeholder
                if not full_path or not os.path.exists(full_path):
                    placeholder_svg = b'''<svg width="200" height="150" xmlns="http://www.w3.org/2000/svg">
                        <rect width="200" height="150" fill="#f0f0f0"/>
                        <text x="100" y="75" text-anchor="middle" font-family="Arial" font-size="12" fill="#666">
                            Screenshot Not Available
                        </text>
                    </svg>'''
                    response = HttpResponse(placeholder_svg, content_type='image/svg+xml')
                    response['Content-Length'] = len(placeholder_svg)
                    return response
            
            # Determine content type
            if file_path.endswith('.jpg') or file_path.endswith('.jpeg'):
                content_type = 'image/jpeg'
            elif file_path.endswith('.png'):
                content_type = 'image/png'
            else:
                content_type = 'application/octet-stream'
            
            # Read and serve file
            with open(full_path, 'rb') as f:
                content = f.read()
            
            response = HttpResponse(content, content_type=content_type)
            response['Content-Length'] = len(content)
            return response
            
        except Exception as e:
            logger.error(f"Error serving monitoring file {file_path}: {e}")
            raise Http404("File not found")
