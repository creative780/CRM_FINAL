"""
Celery tasks for monitoring data cleanup and maintenance
"""

from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from monitoring.models import Device, Screenshot, Heartbeat
from monitoring.storage import get_storage
import logging

logger = logging.getLogger(__name__)


@shared_task
def cleanup_old_monitoring_data(days=30):
    """
    Clean up old monitoring data (screenshots and heartbeats)
    """
    try:
        cutoff_date = timezone.now() - timedelta(days=days)
        
        logger.info(f"Starting cleanup of monitoring data older than {days} days")
        
        # Clean up old screenshots
        old_screenshots = Screenshot.objects.filter(taken_at__lt=cutoff_date)
        screenshot_count = old_screenshots.count()
        
        if screenshot_count > 0:
            # Delete files from storage
            storage = get_storage()
            deleted_files = 0
            
            for screenshot in old_screenshots:
                try:
                    # Delete original image
                    if screenshot.blob_key:
                        storage.delete(screenshot.blob_key)
                        deleted_files += 1
                    
                    # Delete thumbnail
                    if screenshot.thumb_key:
                        storage.delete(screenshot.thumb_key)
                        deleted_files += 1
                        
                except Exception as e:
                    logger.error(f"Failed to delete file for screenshot {screenshot.id}: {e}")
            
            # Delete database records
            deleted_count = old_screenshots.delete()[0]
            logger.info(f"Deleted {deleted_count} screenshot records and {deleted_files} files")
        
        # Clean up old heartbeats
        old_heartbeats = Heartbeat.objects.filter(created_at__lt=cutoff_date)
        heartbeat_count = old_heartbeats.count()
        
        if heartbeat_count > 0:
            deleted_count = old_heartbeats.delete()[0]
            logger.info(f"Deleted {deleted_count} heartbeat records")
        
        logger.info("Monitoring data cleanup completed successfully")
        return {
            'screenshots_deleted': screenshot_count,
            'heartbeats_deleted': heartbeat_count,
            'cutoff_date': cutoff_date.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in cleanup_old_monitoring_data task: {e}")
        raise


@shared_task
def generate_missing_thumbnails():
    """
    Generate missing thumbnails for existing screenshots
    """
    try:
        logger.info("Starting thumbnail generation for missing thumbnails")
        
        # Get screenshots without thumbnails
        screenshots_without_thumbnails = Screenshot.objects.filter(
            thumb_key__isnull=True
        ).exclude(blob_key__isnull=True)
        
        count = screenshots_without_thumbnails.count()
        
        if count == 0:
            logger.info("No screenshots need thumbnail generation")
            return {'generated': 0}
        
        logger.info(f"Found {count} screenshots needing thumbnails")
        
        storage = get_storage()
        generated_count = 0
        
        for screenshot in screenshots_without_thumbnails:
            try:
                # Get original image
                image_data = storage.get(screenshot.blob_key)
                if not image_data:
                    logger.warning(f"Could not retrieve image data for screenshot {screenshot.id}")
                    continue
                
                # Generate thumbnail
                from PIL import Image
                import io
                
                # Create thumbnail from original image
                img = Image.open(io.BytesIO(image_data))
                img.thumbnail((300, 200), Image.Resampling.LANCZOS)
                
                # Save thumbnail
                thumb_buffer = io.BytesIO()
                img.save(thumb_buffer, format='JPEG', quality=80)
                thumb_data = thumb_buffer.getvalue()
                
                # Generate thumbnail key
                thumb_key = f"thumbs/{screenshot.id}_thumb.jpg"
                
                # Store thumbnail
                storage.put(thumb_key, thumb_data, 'image/jpeg')
                
                # Update screenshot record
                screenshot.thumb_key = thumb_key
                screenshot.save()
                
                generated_count += 1
                
            except Exception as e:
                logger.error(f"Failed to generate thumbnail for screenshot {screenshot.id}: {e}")
        
        logger.info(f"Generated {generated_count} thumbnails successfully")
        return {'generated': generated_count}
        
    except Exception as e:
        logger.error(f"Error in generate_missing_thumbnails task: {e}")
        raise


@shared_task
def update_device_status():
    """
    Update device status based on last heartbeat
    """
    try:
        logger.info("Starting device status update")
        
        # Get devices that haven't sent a heartbeat in the last 5 minutes
        offline_threshold = timezone.now() - timedelta(minutes=5)
        
        # Mark devices as offline if no recent heartbeat
        offline_devices = Device.objects.filter(
            last_heartbeat__lt=offline_threshold,
            status__in=['ONLINE', 'IDLE']
        )
        
        updated_count = offline_devices.update(status='OFFLINE')
        
        logger.info(f"Updated {updated_count} devices to offline status")
        return {'updated': updated_count}
        
    except Exception as e:
        logger.error(f"Error in update_device_status task: {e}")
        raise


@shared_task
def calculate_productivity_metrics():
    """
    Calculate and update productivity metrics for devices
    """
    try:
        logger.info("Starting productivity metrics calculation")
        
        # Get devices with recent activity
        recent_threshold = timezone.now() - timedelta(hours=24)
        active_devices = Device.objects.filter(
            last_heartbeat__gte=recent_threshold
        )
        
        updated_count = 0
        
        for device in active_devices:
            try:
                # Get recent heartbeats
                recent_heartbeats = device.heartbeats.filter(
                    created_at__gte=recent_threshold
                )
                
                if recent_heartbeats.exists():
                    # Calculate average productivity score
                    total_score = sum(hb.productivity_score for hb in recent_heartbeats)
                    avg_score = total_score / recent_heartbeats.count()
                    
                    # Update device with average productivity
                    device.avg_productivity_score = avg_score
                    device.save()
                    updated_count += 1
                    
            except Exception as e:
                logger.error(f"Error calculating productivity for device {device.id}: {e}")
        
        logger.info(f"Updated productivity metrics for {updated_count} devices")
        return {'updated': updated_count}
        
    except Exception as e:
        logger.error(f"Error in calculate_productivity_metrics task: {e}")
        raise


@shared_task
def send_idle_alerts():
    """
    Send alerts for devices that have been idle for too long
    """
    try:
        logger.info("Starting idle alert check")
        
        # Get devices that are currently idle
        idle_devices = Device.objects.filter(status='IDLE')
        
        alert_count = 0
        
        for device in idle_devices:
            try:
                # Check if device has been idle for more than threshold
                if device.idle_threshold_minutes:
                    threshold_minutes = device.idle_threshold_minutes
                else:
                    threshold_minutes = 30  # Default threshold
                
                idle_threshold = timezone.now() - timedelta(minutes=threshold_minutes)
                
                # Check last heartbeat
                if device.last_heartbeat and device.last_heartbeat < idle_threshold:
                    # Send alert (implement notification logic here)
                    logger.info(f"Device {device.id} has been idle for {threshold_minutes} minutes")
                    alert_count += 1
                    
            except Exception as e:
                logger.error(f"Error checking idle status for device {device.id}: {e}")
        
        logger.info(f"Found {alert_count} devices that need idle alerts")
        return {'alerts': alert_count}
        
    except Exception as e:
        logger.error(f"Error in send_idle_alerts task: {e}")
        raise

