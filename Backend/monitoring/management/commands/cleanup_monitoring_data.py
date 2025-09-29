"""
Django management command to clean up monitoring data
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from monitoring.models import Device, Screenshot, Heartbeat
from monitoring.storage import get_storage
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Clean up old monitoring data and generate missing thumbnails'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Number of days to retain data (default: 30)'
        )
        parser.add_argument(
            '--generate-thumbnails',
            action='store_true',
            help='Generate missing thumbnails for existing screenshots'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )

    def handle(self, *args, **options):
        days = options['days']
        generate_thumbnails = options['generate_thumbnails']
        dry_run = options['dry_run']
        
        cutoff_date = timezone.now() - timedelta(days=days)
        
        self.stdout.write(f"Cleaning up monitoring data older than {days} days...")
        self.stdout.write(f"Cutoff date: {cutoff_date}")
        
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE - No data will be deleted"))
        
        # Clean up old screenshots
        self.cleanup_screenshots(cutoff_date, dry_run)
        
        # Clean up old heartbeats
        self.cleanup_heartbeats(cutoff_date, dry_run)
        
        # Generate missing thumbnails
        if generate_thumbnails:
            self.generate_missing_thumbnails()
        
        self.stdout.write(self.style.SUCCESS("Cleanup completed successfully"))

    def cleanup_screenshots(self, cutoff_date, dry_run):
        """Clean up old screenshots"""
        self.stdout.write("Cleaning up old screenshots...")
        
        # Get old screenshots
        old_screenshots = Screenshot.objects.filter(taken_at__lt=cutoff_date)
        count = old_screenshots.count()
        
        if count == 0:
            self.stdout.write("No old screenshots to delete")
            return
        
        self.stdout.write(f"Found {count} old screenshots to delete")
        
        if not dry_run:
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
            self.stdout.write(f"Deleted {deleted_count} screenshot records and {deleted_files} files")
        else:
            self.stdout.write(f"Would delete {count} screenshot records")

    def cleanup_heartbeats(self, cutoff_date, dry_run):
        """Clean up old heartbeats"""
        self.stdout.write("Cleaning up old heartbeats...")
        
        # Get old heartbeats
        old_heartbeats = Heartbeat.objects.filter(created_at__lt=cutoff_date)
        count = old_heartbeats.count()
        
        if count == 0:
            self.stdout.write("No old heartbeats to delete")
            return
        
        self.stdout.write(f"Found {count} old heartbeats to delete")
        
        if not dry_run:
            deleted_count = old_heartbeats.delete()[0]
            self.stdout.write(f"Deleted {deleted_count} heartbeat records")
        else:
            self.stdout.write(f"Would delete {count} heartbeat records")

    def generate_missing_thumbnails(self):
        """Generate missing thumbnails for existing screenshots"""
        self.stdout.write("Generating missing thumbnails...")
        
        # Get screenshots without thumbnails
        screenshots_without_thumbnails = Screenshot.objects.filter(
            thumb_key__isnull=True
        ).exclude(blob_key__isnull=True)
        
        count = screenshots_without_thumbnails.count()
        
        if count == 0:
            self.stdout.write("No screenshots need thumbnail generation")
            return
        
        self.stdout.write(f"Found {count} screenshots needing thumbnails")
        
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
                
                if generated_count % 10 == 0:
                    self.stdout.write(f"Generated {generated_count} thumbnails...")
                
            except Exception as e:
                logger.error(f"Failed to generate thumbnail for screenshot {screenshot.id}: {e}")
        
        self.stdout.write(f"Generated {generated_count} thumbnails successfully")

