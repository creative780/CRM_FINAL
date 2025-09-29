from django.contrib import admin
from .models import Conversation, Participant, Message, Prompt


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'created_by', 'created_at', 'updated_at', 'is_archived']
    list_filter = ['is_archived', 'created_at']
    search_fields = ['title', 'created_by__username']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-updated_at']


@admin.register(Participant)
class ParticipantAdmin(admin.ModelAdmin):
    list_display = ['id', 'conversation', 'user', 'role', 'joined_at', 'last_read_at']
    list_filter = ['role', 'joined_at']
    search_fields = ['conversation__title', 'user__username']
    readonly_fields = ['joined_at']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'conversation', 'sender', 'type', 'text_preview', 'status', 'created_at']
    list_filter = ['type', 'status', 'created_at']
    search_fields = ['text', 'sender__username', 'conversation__title']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    def text_preview(self, obj):
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    text_preview.short_description = 'Text Preview'


@admin.register(Prompt)
class PromptAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'is_active', 'order']
    list_filter = ['is_active']
    search_fields = ['title', 'text']
    ordering = ['order', 'title']
