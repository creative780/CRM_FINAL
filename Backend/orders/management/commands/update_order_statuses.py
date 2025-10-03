"""
Django management command to automatically update order statuses based on various conditions.
This command should be run periodically (e.g., via cron job) to check for status transitions.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from orders.models import Order, ProductMachineAssignment, DesignApproval
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Automatically update order statuses based on various conditions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed output',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        verbose = options['verbose']
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No changes will be made')
            )
        
        updated_count = 0
        
        # 1. Check for orders that should transition from "getting_ready" to "sent_for_delivery"
        updated_count += self.update_ready_to_delivery_orders(dry_run, verbose)
        
        # 2. Check for orders that should transition from "sent_for_delivery" to "delivered"
        updated_count += self.update_delivery_to_delivered_orders(dry_run, verbose)
        
        # 3. Check for orders with overdue production assignments
        updated_count += self.update_overdue_production_orders(dry_run, verbose)
        
        # 4. Check for orders with pending approvals that are overdue
        updated_count += self.update_overdue_approvals(dry_run, verbose)
        
        # 5. Check for orders that should auto-advance based on time
        updated_count += self.update_time_based_transitions(dry_run, verbose)
        
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(f'DRY RUN: Would update {updated_count} orders')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'Successfully updated {updated_count} orders')
            )

    def update_ready_to_delivery_orders(self, dry_run, verbose):
        """Update orders from 'getting_ready' to 'sent_for_delivery' when all products are completed"""
        updated_count = 0
        
        # Find orders in 'getting_ready' status
        ready_orders = Order.objects.filter(status='getting_ready')
        
        for order in ready_orders:
            # Check if all machine assignments are completed
            assignments = order.machine_assignments.all()
            
            if not assignments.exists():
                continue  # No assignments yet
            
            all_completed = all(
                assignment.completed_at is not None 
                for assignment in assignments
            )
            
            if all_completed:
                if verbose:
                    self.stdout.write(
                        f'Order {order.order_code}: All products completed, transitioning to sent_for_delivery'
                    )
                
                if not dry_run:
                    with transaction.atomic():
                        order.status = 'sent_for_delivery'
                        order.save(update_fields=['status'])
                
                updated_count += 1
        
        return updated_count

    def update_delivery_to_delivered_orders(self, dry_run, verbose):
        """Update orders from 'sent_for_delivery' to 'delivered' after a certain time"""
        updated_count = 0
        
        # Find orders that have been in 'sent_for_delivery' for more than 24 hours
        cutoff_time = timezone.now() - timedelta(hours=24)
        
        delivery_orders = Order.objects.filter(
            status='sent_for_delivery',
            updated_at__lt=cutoff_time
        )
        
        for order in delivery_orders:
            if verbose:
                self.stdout.write(
                    f'Order {order.order_code}: In delivery for >24h, transitioning to delivered'
                )
            
            if not dry_run:
                with transaction.atomic():
                    order.status = 'delivered'
                    order.delivered_at = timezone.now()
                    order.save(update_fields=['status', 'delivered_at'])
            
            updated_count += 1
        
        return updated_count

    def update_overdue_production_orders(self, dry_run, verbose):
        """Update orders with overdue production assignments"""
        updated_count = 0
        
        # Find assignments that are overdue (expected completion time passed but still not completed)
        # Note: Using the actual database column names
        overdue_assignments = ProductMachineAssignment.objects.filter(
            status__in=['queued', 'in_progress']
        ).exclude(completed_at__isnull=False)
        
        for assignment in overdue_assignments:
            if verbose:
                self.stdout.write(
                    f'Order {assignment.order.order_code}: Assignment {assignment.product_name} is overdue'
                )
            
            if not dry_run:
                with transaction.atomic():
                    # Mark as on_hold if it's been assigned for more than 2 hours without completion
                    if assignment.started_at and assignment.started_at < timezone.now() - timedelta(hours=2):
                        assignment.status = 'on_hold'
                        assignment.save(update_fields=['status'])
                        updated_count += 1
        
        return updated_count

    def update_overdue_approvals(self, dry_run, verbose):
        """Update orders with overdue approval requests"""
        updated_count = 0
        
        # Find approval requests that are pending for more than 48 hours
        cutoff_time = timezone.now() - timedelta(hours=48)
        
        overdue_approvals = DesignApproval.objects.filter(
            approval_status='pending',
            submitted_at__lt=cutoff_time
        )
        
        for approval in overdue_approvals:
            if verbose:
                self.stdout.write(
                    f'Order {approval.order.order_code}: Approval request is overdue'
                )
            
            if not dry_run:
                with transaction.atomic():
                    # Auto-approve overdue requests (admin can override later)
                    approval.approval_status = 'approved'
                    approval.reviewed_at = timezone.now()
                    approval.approval_notes = 'Auto-approved due to overdue status'
                    approval.save(update_fields=['approval_status', 'reviewed_at', 'approval_notes'])
                    
                    # Update order status
                    approval.order.status = 'sent_to_production'
                    approval.order.save(update_fields=['status'])
                    
                    updated_count += 1
        
        return updated_count

    def update_time_based_transitions(self, dry_run, verbose):
        """Update orders based on time-based rules"""
        updated_count = 0
        
        # Find orders that have been in 'draft' status for more than 7 days
        cutoff_time = timezone.now() - timedelta(days=7)
        
        stale_drafts = Order.objects.filter(
            status='draft',
            created_at__lt=cutoff_time
        )
        
        for order in stale_drafts:
            if verbose:
                self.stdout.write(
                    f'Order {order.order_code}: Draft for >7 days, transitioning to sent_to_sales'
                )
            
            if not dry_run:
                with transaction.atomic():
                    order.status = 'sent_to_sales'
                    order.save(update_fields=['status'])
                    updated_count += 1
        
        return updated_count
