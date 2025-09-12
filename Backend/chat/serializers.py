from rest_framework import serializers
from .models import ChatRoom, ChatRoomMember, ChatMessage


class ChatRoomSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatRoom
        fields = ['id', 'name', 'description', 'room_type', 'created_by', 'is_active', 'member_count', 'last_message', 'created_at', 'updated_at']
        read_only_fields = ['created_by', 'created_at', 'updated_at']
    
    def get_member_count(self, obj):
        return obj.members.count()
    
    def get_last_message(self, obj):
        last_msg = obj.messages.last()
        if last_msg:
            return {
                'id': last_msg.id,
                'content': last_msg.content[:100],
                'sender': last_msg.sender.username,
                'created_at': last_msg.created_at
            }
        return None


class ChatRoomMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = ChatRoomMember
        fields = ['id', 'user', 'username', 'joined_at', 'is_admin']


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.username', read_only=True)
    reply_to_content = serializers.CharField(source='reply_to.content', read_only=True)
    
    class Meta:
        model = ChatMessage
        fields = [
            'id', 'room', 'sender', 'sender_name', 'content', 'message_type',
            'attachment', 'reply_to', 'reply_to_content', 'is_edited',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['sender', 'created_at', 'updated_at']


class CreateChatRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatRoom
        fields = ['name', 'description', 'room_type']
