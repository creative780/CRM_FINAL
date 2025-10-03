#!/usr/bin/env python3
"""
Test order creation and designer flow
"""

import requests
import json
import sys

# API Configuration
BASE_URL = "http://localhost:8000/api"
API_URL = f"{BASE_URL}/orders/"

def test_order_creation():
    """Test creating an order with design requirements"""
    
    # Test order data
    order_data = {
        "clientName": "Test Client for Designer",
        "companyName": "Test Company",
        "phone": "1234567890", 
        "trn": "TEST123",
        "email": "test@example.com",
        "address": "Test Address", 
        "specs": "Test specifications - need custom design for business cards",
        "urgency": "Normal",
        "salesPerson": "Admin User",
        "items": [
            {
                "product_id": "TEST001",
                "name": "Business Cards",
                "sku": "TEST-BUSINESS-CARDS",
                "attributes": {"size": "A4", "color": "Blue"},
                "quantity": 5,
                "unit_price": 10.00,
                "design_ready": False,
                "design_need_custom": True,
                "design_files_manifest": [
                    {
                        "name": "test_design.pdf",
                        "size": 102400,
                        "type": "application/pdf",
                        "data": "data:application/pdf;base64,JVBERi0xLjQK"
                    }
                ]
            }
        ]
    }
    
    try:
        print("Creating test order...")
        print(f"Order Data: {json.dumps(order_data, indent=2)}")
        
        response = requests.post(API_URL, json=order_data)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 201:
            order_data_response = response.json()
            order_id = order_data_response.get('id')
            print(f"Order created successfully! Order ID: {order_id}")
            
            # Test getting the order details
            print("\n" + "="*50)
            print("Testing order retrieval...")
            
            get_response = requests.get(f"{API_URL}{order_id}/")
            if get_response.status_code == 200:
                order_details = get_response.json()
                print(f"Order retrieved successfully!")
                print(f"Order: {order_details.get('order_code', 'No code')}")
                print(f"Client: {order_details.get('client_name', 'No client')}")
                print(f"Stage: {order_details.get('stage', 'No stage')}")
                print(f"Items: {len(order_details.get('items', []))}")
                
                # Check design stage
                design_stage = order_details.get('design_stage')
                if design_stage:
                    print(f"Design Status: {design_stage.get('design_status', 'No status')}")
                    print(f"Requirements Files: {len(design_stage.get('requirements_files_manifest', []))}")
                    print(f"Internal Comments: {design_stage.get('internal_comments', 'No comments')}")
                else:
                        print("No design stage data found")
                    
            else:
                print(f"Failed to retrieve order: {get_response.status_code}")
                
            return order_id
        else:
            print(f"Order creation failed: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    print("Testing Order Creation and Designer Flow")
    print("=" * 60)
    
    # Check if backend is running
    try:
        health_response = requests.get("http://localhost:8000/api/")
        if health_response.status_code != 404:
            print("Backend API may not be fully started (got non-404 response)")
        else:
            print("Backend API is reachable")
    except:
        print("Backend API is not accessible. Make sure Django server is running on port 8000")
        sys.exit(1)
    
    # Create test order
    order_id = test_order_creation()
    
    if order_id:
        print("\n" + "="*60)
        print("NEXT STEPS FOR TESTING:")
        print("1. Open Frontend: http://localhost:3000/admin/order-lifecycle/table/designer")
        print("2. Look for the test order")
        print("3. Click on it to open Order Details modal")
        print("4. Verify 'Design Assignment Details' section shows:")
        print("   - Design Status")
        print("   - Requirements Files")
        print("   - Internal Comments")
        print("5. Test design file preview functionality")
    else:
        print("\nOrder creation failed - check backend setup")
