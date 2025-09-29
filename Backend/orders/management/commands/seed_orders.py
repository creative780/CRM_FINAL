from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal
from orders.models import (
    Order, OrderItem, Quotation, DesignStage, PrintingStage, 
    ApprovalStage, DeliveryStage
)


class Command(BaseCommand):
    help = 'Seed the database with sample orders across all stages'

    def handle(self, *args, **options):
        self.stdout.write('Creating sample orders...')
        
        # Create sample orders for each stage
        self.create_order_intake_order()
        self.create_quotation_order()
        self.create_design_order()
        self.create_printing_order()
        self.create_approval_order()
        self.create_delivery_order()
        
        self.stdout.write(
            self.style.SUCCESS('Successfully created sample orders!')
        )

    def create_order_intake_order(self):
        """Create an order in intake stage"""
        order = Order.objects.create(
            order_code='ORD-INT001',
            client_name='ABC Company',
            company_name='ABC Corporation',
            phone='+971501234567',
            email='contact@abc.com',
            address='Dubai, UAE',
            specs='Business cards with company logo',
            urgency='Normal',
            status='new',
            stage='order_intake'
        )
        
        # Add items
        OrderItem.objects.create(
            order=order,
            product_id='BC-001',
            name='Business Cards',
            sku='BC-001',
            attributes={'finish': 'matte', 'size': 'standard'},
            quantity=500,
            unit_price=Decimal('0.50'),
            line_total=Decimal('250.00')
        )
        
        self.stdout.write(f'Created order intake order: {order.order_code}')

    def create_quotation_order(self):
        """Create an order in quotation stage"""
        order = Order.objects.create(
            order_code='ORD-QUO001',
            client_name='XYZ Ltd',
            company_name='XYZ Limited',
            phone='+971507654321',
            email='info@xyz.com',
            address='Abu Dhabi, UAE',
            specs='Brochures and flyers for marketing campaign',
            urgency='High',
            status='active',
            stage='quotation'
        )
        
        # Add items
        OrderItem.objects.create(
            order=order,
            product_id='BR-001',
            name='Marketing Brochures',
            sku='BR-001',
            attributes={'size': 'A4', 'pages': 8, 'finish': 'glossy'},
            quantity=1000,
            unit_price=Decimal('2.50'),
            line_total=Decimal('2500.00')
        )
        
        OrderItem.objects.create(
            order=order,
            product_id='FL-001',
            name='Promotional Flyers',
            sku='FL-001',
            attributes={'size': 'A5', 'finish': 'matte'},
            quantity=2000,
            unit_price=Decimal('0.75'),
            line_total=Decimal('1500.00')
        )
        
        # Create quotation
        quotation = Quotation.objects.create(
            order=order,
            labour_cost=Decimal('150.00'),
            finishing_cost=Decimal('200.00'),
            paper_cost=Decimal('300.00'),
            machine_cost=Decimal('100.00'),
            design_cost=Decimal('250.00'),
            delivery_cost=Decimal('50.00'),
            other_charges=Decimal('0.00'),
            discount=Decimal('100.00'),
            advance_paid=Decimal('1000.00')
        )
        
        self.stdout.write(f'Created quotation order: {order.order_code}')

    def create_design_order(self):
        """Create an order in design stage"""
        order = Order.objects.create(
            order_code='ORD-DES001',
            client_name='Tech Solutions',
            company_name='Tech Solutions Inc',
            phone='+971509876543',
            email='design@techsolutions.com',
            address='Sharjah, UAE',
            specs='Custom logo design and brand identity',
            urgency='Urgent',
            status='active',
            stage='design'
        )
        
        # Add items
        OrderItem.objects.create(
            order=order,
            product_id='LG-001',
            name='Logo Design',
            sku='LG-001',
            attributes={'format': 'vector', 'variations': 3},
            quantity=1,
            unit_price=Decimal('500.00'),
            line_total=Decimal('500.00')
        )
        
        # Create design stage
        DesignStage.objects.create(
            order=order,
            assigned_designer='John Smith',
            requirements_files_manifest=[
                {'name': 'brand_guidelines.pdf', 'size': 1024000, 'type': 'application/pdf'},
                {'name': 'reference_images.zip', 'size': 5120000, 'type': 'application/zip'}
            ],
            design_status='In Progress'
        )
        
        self.stdout.write(f'Created design order: {order.order_code}')

    def create_printing_order(self):
        """Create an order in printing stage"""
        order = Order.objects.create(
            order_code='ORD-PRT001',
            client_name='Event Management Co',
            company_name='Event Management Company',
            phone='+971501112223',
            email='events@eventmgmt.com',
            address='Ajman, UAE',
            specs='Event banners and signage',
            urgency='High',
            status='active',
            stage='printing'
        )
        
        # Add items
        OrderItem.objects.create(
            order=order,
            product_id='BN-001',
            name='Event Banners',
            sku='BN-001',
            attributes={'size': '3x6ft', 'material': 'vinyl'},
            quantity=10,
            unit_price=Decimal('45.00'),
            line_total=Decimal('450.00')
        )
        
        # Create printing stage
        PrintingStage.objects.create(
            order=order,
            print_operator='Mike Johnson',
            print_time=timezone.now(),
            batch_info='Batch #2024-001',
            print_status='Printing',
            qa_checklist='Color accuracy, Size verification, Material quality'
        )
        
        self.stdout.write(f'Created printing order: {order.order_code}')

    def create_approval_order(self):
        """Create an order in approval stage"""
        order = Order.objects.create(
            order_code='ORD-APP001',
            client_name='Restaurant Chain',
            company_name='Food & Beverage Group',
            phone='+971504445556',
            email='marketing@restaurant.com',
            address='Ras Al Khaimah, UAE',
            specs='Menu design and printing',
            urgency='Normal',
            status='active',
            stage='approval'
        )
        
        # Add items
        OrderItem.objects.create(
            order=order,
            product_id='MN-001',
            name='Restaurant Menu',
            sku='MN-001',
            attributes={'size': 'A4', 'pages': 12, 'binding': 'spiral'},
            quantity=200,
            unit_price=Decimal('8.50'),
            line_total=Decimal('1700.00')
        )
        
        # Create approval stage
        ApprovalStage.objects.create(
            order=order,
            client_approval_files=[
                {'name': 'approved_design_v2.pdf', 'size': 2048000, 'type': 'application/pdf'},
                {'name': 'color_approval.jpg', 'size': 512000, 'type': 'image/jpeg'}
            ],
            approved_at=timezone.now()
        )
        
        self.stdout.write(f'Created approval order: {order.order_code}')

    def create_delivery_order(self):
        """Create an order in delivery stage"""
        order = Order.objects.create(
            order_code='ORD-DEL001',
            client_name='Retail Store',
            company_name='Fashion Retail Ltd',
            phone='+971507778889',
            email='store@fashionretail.com',
            address='Fujairah, UAE',
            specs='Store signage and promotional materials',
            urgency='Low',
            status='completed',
            stage='delivery',
            delivery_code='123456',
            delivered_at=timezone.now()
        )
        
        # Add items
        OrderItem.objects.create(
            order=order,
            product_id='SG-001',
            name='Store Signage',
            sku='SG-001',
            attributes={'size': '2x4ft', 'material': 'acrylic'},
            quantity=5,
            unit_price=Decimal('120.00'),
            line_total=Decimal('600.00')
        )
        
        # Create delivery stage
        DeliveryStage.objects.create(
            order=order,
            rider_photo_path='uploads/rider_photos/delivery_proof_001.jpg',
            delivered_at=timezone.now()
        )
        
        self.stdout.write(f'Created delivery order: {order.order_code}')
