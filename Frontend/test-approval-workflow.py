#!/usr/bin/env python3
"""
Test the complete approval workflow:
Designer submits → Sales reviews → Sales approves/rejects → Workflow continues
"""

import requests
import json
import sys
import time
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8000/api"
TEST_USERNAME = "admin"  # We'll use admin for testing since sales user doesn't exist
TEST_PASSWORD = "admin"

def get_auth_token():
    """Obtain authentication token"""
    login_url = f"{BASE_URL}/auth/login/"
    try:
        response = requests.post(login_url, json={
            'username': TEST_USERNAME, 
            'password': TEST_PASSWORD
        })
        response.raise_for_status()
        return response.json()['access']
    except Exception as e:
        print(f"Authentication failed: {e}")
        return None

def test_create_order_for_approval():
    """Create a test order that will be sent for approval"""
    token = get_auth_token()
    if not token:
        return None
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Create order
    order_data = {
        "clientName": "Test Approval Client",
        "companyName": "Test Approval Company",
        "phone": "1234567890",
        "trn": "TEST123",
        "email": "test@example.com",
        "address": "Test Address",
        "specs": "Test specifications requiring design approval",
        "urgency": "Normal",
        "salesPerson": "sales_person",
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
        response = requests.post(f"{BASE_URL}/orders/", json=order_data, headers=headers)
        response.raise_for_status()
        order_data_response = response.json()
        order_id = order_data_response.get('id')
        print(f"Order created successfully! Order ID: {order_id}")
        return order_id
    except Exception as e:
        print(f"Failed to create order: {e}")
        return None

def test_request_approval(order_id):
    """Simulate designer requesting approval"""
    token = get_auth_token()
    if not token:
        return None
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    approval_data = {
        "designer": "designer",
        "sales_person": "sales_person",
        "design_files_manifest": [
            {
                "name": "final_design.pdf",
                "size": 204800,
                "type": "application/pdf",
                "url": f"/media/test_design.pdf"
            }
        ],
        "approval_notes": "Please review the final design. All client requirements have been implemented."
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/orders/{order_id}/request-approval/", 
            json=approval_data, 
            headers=headers
        )
        response.raise_for_status()
        approval_response = response.json()
        print(f"Approval request submitted! Approval ID: {approval_response['id']}")
        return approval_response['id']
    except Exception as e:
        print(f"Failed to request approval: {e}")
        return None

def test_get_pending_approvals():
    """Get pending approvals for sales user"""
    token = get_auth_token()
    if not token:
        return []
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(f"{BASE_URL}/approvals/pending/", headers=headers)
        response.raise_for_status()
        approvals = response.json()
        print(f"Found {len(approvals)} pending approvals")
        return approvals
    except Exception as e:
        print(f"Failed to get pending approvals: {e}")
        return []

def test_approve_design(approval_id):
    """Approve a design"""
    token = get_auth_token()
    if not token:
        return False
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    action_data = {
        "action": "approve"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/approvals/{approval_id}/respond/", 
            json=action_data, 
            headers=headers
        )
        response.raise_for_status()
        result = response.json()
        print(f"Design approved successfully! Status: {result['approval_status']}")
        return True
    except Exception as e:
        print(f"Failed to approve design: {e}")
        return False

def test_reject_design(approval_id):
    """Reject a design with reason"""
    token = get_auth_token()
    if not token:
        return False
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    action_data = {
        "action": "reject",
        "rejection_reason": "Client requested changes to color scheme and font selection. Please revise and resubmit."
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/approvals/{approval_id}/respond/", 
            json=action_data, 
            headers=headers
        )
        response.raise_for_status()
        result = response.json()
        print(f"Design rejected successfully! Status: {result['approval_status']}")
        print(f"Rejection reason: {result['rejection_reason']}")
        return True
    except Exception as e:
        print(f"Failed to reject design: {e}")
        return False

def main():
    print("Testing Complete Approval Workflow")
    print("=" * 50)
    
    # Step 1: Create order
    print("\n1. Creating test order...")
    order_id = test_create_order_for_approval()
    if not order_id:
        print("Failed to create order. Exiting.")
        return
    
    # Step 2: Request approval
    print("\n2. Simulating designer requesting approval...")
    approval_id = test_request_approval(order_id)
    if not approval_id:
        print("Failed to request approval. Exiting.")
        return
    
    # Step 3: Get pending approvals (sales workflow)
    print("\n3. Getting pending approvals for sales review...")
    pending_approvals = test_get_pending_approvals()
    
    if not pending_approvals:
        print("No pending approvals found.")
        return
    
    print(f"Found approval for order: {pending_approvals[0]['order_code']}")
    
    # Step 4: Simulate sales user reviewing and making decision
    print("\n4. Testing approval decision...")
    
    # Choose first approval for testing
    test_approval = pending_approvals[0]
    
    print(f"- Order: {test_approval['order_code']}")
    print(f"- Designer: {test_approval['designer']}")
    print(f"- Client: {test_approval['client_name']}")
    print(f"- Files: {len(test_approval['design_files_manifest'])}")
    print(f"- Notes: {test_approval['approval_notes']}")
    
    # Test approve
    print("\n5. Testing APPROVE action...")
    success = test_approve_design(test_approval['id'])
    
    if success:
        print("✅ APPROVAL workflow test PASSED!")
    else:
        print("❌ APPROVAL workflow test FAILED!")
    
    # Additional tests could include:
    # - Testing reject workflow
    # - Testing file preview
    # - Testing notifications
    # - Testing deadline tracking
    
    print("\n" + "=" * 50)
    print("WORKFLOW TEST COMPLETE")
    print("\nNext Steps:")
    print("1. Open Frontend: http://localhost:3000/admin/orders/approvals")
    print("2. Login as sales user")
    print("3. Check pending approvals")
    print("4. Test approve/reject actions")
    print("5. Verify designer receives notification")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nTest interrupted by user.")
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        sys.exit(1)

