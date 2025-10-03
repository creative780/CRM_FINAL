"""
Django signals for automatic order status updates and workflow transitions.
"""

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from django.db import transaction
from .models import Order, ProductMachineAssignment, DesignApproval
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=ProductMachineAssignment)
def update_order_status_on_assignment_completion(sender, instance, created, **kwargs):
    """
    Automatically update order status when all machine assignments are completed.
    """
    if not created and instance.completed_at is not None:
        order = instance.order
        
        # Check if all assignments for this order are completed
        all_completed = all(
            assignment.completed_at is not None 
            for assignment in order.machine_assignments.all()
        )
        
        if all_completed and order.status == 'getting_ready':
            with transaction.atomic():
                order.status = 'sent_for_delivery'
                order.save(update_fields=['status'])
                logger.info(f'Order {order.order_code} automatically transitioned to sent_for_delivery')


@receiver(post_save, sender=DesignApproval)
def update_order_status_on_approval(sender, instance, created, **kwargs):
    """
    Automatically update order status when design is approved.
    """
    if not created and instance.approval_status == 'approved':
        order = instance.order
        
        if order.status == 'sent_for_approval':
            with transaction.atomic():
                order.status = 'sent_to_production'
                order.save(update_fields=['status'])
                logger.info(f'Order {order.order_code} automatically transitioned to sent_to_production')


@receiver(pre_save, sender=Order)
def update_order_timestamps(sender, instance, **kwargs):
    """
    Update timestamps when order status changes.
    """
    if instance.pk:
        try:
            old_instance = Order.objects.get(pk=instance.pk)
            
            # Update delivered_at when status changes to 'delivered'
            if (old_instance.status != 'delivered' and 
                instance.status == 'delivered' and 
                not instance.delivered_at):
                instance.delivered_at = timezone.now()
                
        except Order.DoesNotExist:
            pass  # New instance, no old instance to compare


@receiver(post_save, sender=Order)
def log_order_status_changes(sender, instance, created, **kwargs):
    """
    Log order status changes for audit trail.
    """
    if not created and instance.pk:
        try:
            old_instance = Order.objects.get(pk=instance.pk)
            
            if old_instance.status != instance.status:
                logger.info(
                    f'Order {instance.order_code} status changed from '
                    f'{old_instance.status} to {instance.status}'
                )
                
        except Order.DoesNotExist:
            pass
