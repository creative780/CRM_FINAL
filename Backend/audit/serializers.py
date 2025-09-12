from rest_framework import serializers
from .models import ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    content_type_name = serializers.CharField(source='content_type.model', read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = [
            'id', 'user', 'user_name', 'action', 'content_type', 'content_type_name',
            'object_id', 'description', 'ip_address', 'user_agent', 'metadata', 'created_at'
        ]
        read_only_fields = ['created_at']
