from django.db import models
from django.conf import settings
from django.utils import timezone


class Conversation(models.Model):
    """A conversation between users and/or bots"""
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='created_conversations'
    )
    title = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_archived = models.BooleanField(default=False)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.title or f"Conversation {self.id}"

    @property
    def last_message(self):
        return self.messages.order_by('-created_at').first()


class Participant(models.Model):
    """Participants in a conversation"""
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('member', 'Member'),
        ('agent', 'Agent'),
    ]
    
    conversation = models.ForeignKey(
        Conversation, 
        on_delete=models.CASCADE, 
        related_name='participants'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='conversation_participants'
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['conversation', 'user']

    def __str__(self):
        return f"{self.user.username} ({self.role}) in {self.conversation}"


class Message(models.Model):
    """Messages in a conversation"""
    MESSAGE_TYPES = [
        ('user', 'User'),
        ('bot', 'Bot'),
        ('system', 'System'),
    ]
    
    STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('read', 'Read'),
    ]
    
    conversation = models.ForeignKey(
        Conversation, 
        on_delete=models.CASCADE, 
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='sent_messages'
    )
    type = models.CharField(max_length=10, choices=MESSAGE_TYPES, default='user')
    text = models.TextField()
    rich = models.JSONField(null=True, blank=True)  # For rich content like markdown, code blocks
    attachment = models.FileField(
        upload_to='chat/attachments/', 
        null=True, 
        blank=True,
        help_text="File attachment (max 10MB)"
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='sent')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        sender_name = self.sender.username if self.sender else 'System'
        return f"{sender_name}: {self.text[:50]}"

    def mark_as_read(self, user):
        """Mark message as read for a specific user"""
        try:
            participant = Participant.objects.get(
                conversation=self.conversation,
                user=user
            )
            participant.last_read_at = timezone.now()
            participant.save(update_fields=['last_read_at'])
        except Participant.DoesNotExist:
            pass


class Prompt(models.Model):
    """Quick-start prompts for the bot"""
    title = models.CharField(max_length=255)
    text = models.TextField()
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'title']

    def __str__(self):
        return self.title