from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Conversation, Participant, Message, Prompt

User = get_user_model()


class ParticipantSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)

    class Meta:
        model = Participant
        fields = ['id', 'username', 'first_name', 'last_name', 'role', 'joined_at', 'last_read_at']


class ConversationSerializer(serializers.ModelSerializer):
    participants = ParticipantSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    participant_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'title', 'created_at', 'updated_at', 'is_archived',
            'participants', 'last_message', 'participant_count'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_last_message(self, obj):
        last_msg = obj.last_message
        if last_msg:
            return {
                'id': last_msg.id,
                'text': last_msg.text[:100] + '...' if len(last_msg.text) > 100 else last_msg.text,
                'type': last_msg.type,
                'sender': last_msg.sender.username if last_msg.sender else None,
                'created_at': last_msg.created_at,
            }
        return None

    def get_participant_count(self, obj):
        return obj.participants.count()


class CreateConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = ['title']

    def create(self, validated_data):
        conversation = Conversation.objects.create(
            created_by=self.context['request'].user,
            **validated_data
        )
        # Add creator as owner
        Participant.objects.create(
            conversation=conversation,
            user=self.context['request'].user,
            role='owner'
        )
        return conversation


class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_name = serializers.SerializerMethodField()
    attachment_url = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sender', 'sender_username', 'sender_name',
            'type', 'text', 'rich', 'attachment', 'attachment_url',
            'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_sender_name(self, obj):
        if obj.sender:
            return f"{obj.sender.first_name} {obj.sender.last_name}".strip() or obj.sender.username
        return "System"

    def get_attachment_url(self, obj):
        if obj.attachment:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.attachment.url)
        return None


class CreateMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['text', 'rich', 'attachment', 'type']

    def validate_attachment(self, value):
        if value:
            # Check file size (10MB limit)
            max_size = 10 * 1024 * 1024  # 10MB
            if value.size > max_size:
                raise serializers.ValidationError("File size cannot exceed 10MB")
        return value


class UserResponseSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=1000)
    conversation_id = serializers.CharField(required=False, allow_null=True)

    def validate_conversation_id(self, value):
        if value:
            try:
                conversation = Conversation.objects.get(id=value)
                # Check if user is participant
                if not Participant.objects.filter(
                    conversation=conversation,
                    user=self.context['request'].user
                ).exists():
                    raise serializers.ValidationError("You are not a participant in this conversation")
            except Conversation.DoesNotExist:
                raise serializers.ValidationError("Conversation not found")
        return value


class BotResponseSerializer(serializers.Serializer):
    conversation_id = serializers.CharField()

    def validate_conversation_id(self, value):
        try:
            conversation = Conversation.objects.get(id=value)
            # Check if user is participant
            if not Participant.objects.filter(
                conversation=conversation,
                user=self.context['request'].user
            ).exists():
                raise serializers.ValidationError("You are not a participant in this conversation")
        except Conversation.DoesNotExist:
            raise serializers.ValidationError("Conversation not found")
        return value


class PromptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prompt
        fields = ['id', 'title', 'text', 'order']


class TypingSerializer(serializers.Serializer):
    conversation_id = serializers.CharField()
    is_typing = serializers.BooleanField()


class ReadReceiptSerializer(serializers.Serializer):
    message_ids = serializers.ListField(
        child=serializers.CharField(),
        min_length=1
    )