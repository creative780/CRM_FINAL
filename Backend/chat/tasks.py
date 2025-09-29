from celery import shared_task
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import Message
import os


@shared_task
def cleanup_orphaned_uploads():
    """
    Clean up orphaned file uploads that are older than 24 hours
    and not associated with any messages.
    """
    # Find messages with attachments that are older than 24 hours
    # and have empty conversation (temporary uploads)
    cutoff_time = timezone.now() - timedelta(hours=24)
    
    orphaned_messages = Message.objects.filter(
        conversation__isnull=True,
        attachment__isnull=False,
        created_at__lt=cutoff_time
    )
    
    deleted_count = 0
    for message in orphaned_messages:
        try:
            if message.attachment:
                # Delete the file from filesystem
                file_path = message.attachment.path
                if os.path.exists(file_path):
                    os.remove(file_path)
                
                # Delete the message record
                message.delete()
                deleted_count += 1
        except Exception as e:
            print(f"Error deleting orphaned upload {message.id}: {e}")
    
    return f"Cleaned up {deleted_count} orphaned uploads"
