# Order Lifecycle Backend API

A production-ready Django REST Framework backend that powers the Order Lifecycle workflow for a Next.js admin application.

## 🚀 Features

- **Complete Order Management**: Full CRUD operations for orders with items
- **Stage Transitions**: Seamless workflow from Order Intake → Quotation → Design → Printing → Approval → Delivery
- **Pricing Calculations**: Automatic VAT (3%), discounts, and totals computation
- **File Uploads**: Support for design files, rider photos, and approval documents
- **SMS Integration**: Delivery code notifications (Twilio ready)
- **Role-Based Access**: Granular permissions for different user roles
- **OpenAPI Documentation**: Auto-generated API docs with drf-spectacular

## 📋 API Endpoints

### Orders
- `POST /api/orders/` - Create new order
- `GET /api/orders/` - List orders (with filtering)
- `GET /api/orders/{id}/` - Get order details
- `PATCH /api/orders/{id}/` - Update order or transition stage
- `POST /api/orders/{id}/mark_printed/` - Mark items as printed

### Delivery
- `POST /api/send-delivery-code` - Send delivery code via SMS
- `POST /api/delivery/rider-photo` - Upload delivery proof photo

### Documentation
- `GET /api/schema/` - OpenAPI schema
- `GET /api/docs/` - Swagger UI

## 🏗️ Data Models

### Order
- UUID primary key
- Human-readable order codes (ORD-ABC123)
- Client information (name, company, contact details)
- Stage tracking (order_intake → quotation → design → printing → approval → delivery)
- Status management (new → active → completed)

### OrderItem
- Product details with attributes (JSON)
- Quantity and pricing
- Automatic line total calculation

### Stage Models
- **Quotation**: Cost breakdown with VAT calculation
- **DesignStage**: Designer assignment and file manifests
- **PrintingStage**: Operator details and QA checklist
- **ApprovalStage**: Client approval files and timestamps
- **DeliveryStage**: Rider photos and delivery confirmation

## 🔧 Setup

### Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Seed sample data
python manage.py seed_orders

# Start development server
python manage.py runserver
```

### Docker
```bash
# Build and start all services
docker-compose up --build

# Access the application
# API: http://localhost:8000
# Docs: http://localhost:8000/api/docs/
```

## 📊 Sample Data

The seed command creates 6 sample orders across all stages:
- **ORD-INT001**: Order Intake (Business Cards)
- **ORD-QUO001**: Quotation (Marketing Materials)
- **ORD-DES001**: Design (Logo Design)
- **ORD-PRT001**: Printing (Event Banners)
- **ORD-APP001**: Approval (Restaurant Menu)
- **ORD-DEL001**: Delivery (Store Signage)

## 🔐 Authentication

- JWT-based authentication
- Role-based permissions (admin, sales, designer, production, delivery, finance)
- Optional authentication for local development

## 💰 Pricing Logic

The quotation system automatically calculates:
- Products subtotal (from order items)
- Other costs (labour, finishing, paper, etc.)
- VAT 3% on (subtotal - discount)
- Grand total = subtotal - discount + VAT
- Remaining = grand total - advance paid

## 📱 SMS Integration

- Development: Console logging
- Production: Twilio integration ready
- 6-digit delivery codes with 15-minute expiry

## 🧪 Testing

```bash
# Run the test script
python test_api.py

# Or use Django's test framework
python manage.py test orders
```

## 🌐 Frontend Integration

This backend is designed to work seamlessly with the existing Next.js frontend without any UI changes. All endpoints match the frontend's expected contracts:

- Order creation with items array
- Stage transitions with payload data
- File uploads with URL responses
- Consistent JSON response format: `{ok: true, data: {...}}`

## 📈 Production Considerations

- PostgreSQL database with proper indexing
- Redis for caching and Celery tasks
- File storage with absolute URLs
- Environment-based configuration
- Health check endpoints
- Comprehensive error handling

## 🔄 Stage Transitions

The system supports seamless stage transitions via PATCH requests:

```json
{
  "stage": "quotation",
  "payload": {
    "labour_cost": "100.00",
    "finishing_cost": "50.00",
    "paper_cost": "75.00",
    "design_cost": "200.00",
    "delivery_cost": "25.00",
    "discount": "50.00",
    "advance_paid": "300.00"
  }
}
```

This automatically:
- Updates the order stage and status
- Creates/updates stage-specific models
- Calculates pricing totals
- Maintains data consistency

## 📝 Environment Variables

Copy `env.example` to `.env` and configure:
- Database connection
- Redis settings
- JWT secrets
- SMS provider credentials
- CORS origins
- Media paths

## 🚀 Deployment

The Docker configuration includes:
- PostgreSQL database
- Redis cache
- Django application
- Celery workers
- Nginx for static files
- Health checks and dependencies

Ready for production deployment with proper environment configuration.
