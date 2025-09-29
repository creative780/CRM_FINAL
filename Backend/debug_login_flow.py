#!/usr/bin/env python3
"""
Debug script to test the complete login flow
"""
import requests
import json
import os
import sys

# Add the Backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
import django
django.setup()

from monitoring.models import Device, Heartbeat
from accounts.models import User
from monitoring.auth_utils import check_device_heartbeat_by_id

def debug_login_flow():
    print("=== LOGIN FLOW DEBUG ===")
    
    # Check user
    try:
        user = User.objects.get(username='abdullah')
        print(f"✅ User found: {user.username} (ID: {user.id})")
        print(f"   Roles: {user.roles}")
        print(f"   Is Admin: {user.is_admin()}")
    except User.DoesNotExist:
        print("❌ User 'abdullah' not found")
        return
    
    # Check device
    device = Device.objects.filter(user=user).first()
    if not device:
        print("❌ No device found for user")
        return
    
    print(f"✅ Device found: {device.id}")
    print(f"   Hostname: {device.hostname}")
    print(f"   Status: {device.status}")
    print(f"   Last Heartbeat: {device.last_heartbeat}")
    
    # Check heartbeat
    has_recent_heartbeat, device_obj = check_device_heartbeat_by_id(device.id, max_age_minutes=2)
    print(f"✅ Recent Heartbeat: {'YES' if has_recent_heartbeat else 'NO'}")
    
    # Test login request
    print("\n=== TESTING LOGIN REQUEST ===")
    
    # Test 1: Without device ID header
    print("Test 1: Login without X-Device-ID header")
    response = requests.post(
        'http://localhost:8000/api/auth/login',
        json={
            'username': 'abdullah',
            'password': 'abdullah',
            'role': 'sales'
        },
        headers={'Content-Type': 'application/json'}
    )
    print(f"   Status: {response.status_code}")
    if response.status_code == 412:
        data = response.json()
        print(f"   Response: {data.get('error', 'Unknown error')}")
        print(f"   Enrollment Token: {'Present' if data.get('enrollment_token') else 'Missing'}")
    else:
        print(f"   Response: {response.text}")
    
    # Test 2: With device ID header
    print("\nTest 2: Login with X-Device-ID header")
    response = requests.post(
        'http://localhost:8000/api/auth/login',
        json={
            'username': 'abdullah',
            'password': 'abdullah',
            'role': 'sales'
        },
        headers={
            'Content-Type': 'application/json',
            'X-Device-ID': device.id
        }
    )
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Login successful!")
        print(f"   Token: {'Present' if data.get('token') else 'Missing'}")
        print(f"   Username: {data.get('username')}")
        print(f"   Role: {data.get('role')}")
    else:
        data = response.json()
        print(f"   ❌ Login failed: {data.get('error', 'Unknown error')}")
        if response.status_code == 412:
            print(f"   Enrollment Token: {'Present' if data.get('enrollment_token') else 'Missing'}")
    
    # Test 3: Check what the frontend is actually sending
    print("\n=== FRONTEND SIMULATION ===")
    print("Simulating what the frontend should send:")
    
    # This is what the frontend should send based on the code
    frontend_headers = {
        'Content-Type': 'application/json',
        'X-Device-ID': device.id  # This should come from localStorage.getItem('device_id')
    }
    
    frontend_body = {
        'username': 'abdullah',
        'password': 'abdullah',
        'role': 'sales',
        'device_id': device.id,  # This should come from localStorage.getItem('device_id')
        'device_name': 'CCADPAK-SAIMWEBDEVE',
        'ip': '127.0.0.1'
    }
    
    print(f"   Headers: {frontend_headers}")
    print(f"   Body: {frontend_body}")
    
    response = requests.post(
        'http://localhost:8000/api/auth/login',
        json=frontend_body,
        headers=frontend_headers
    )
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Login successful!")
        print(f"   Token: {'Present' if data.get('token') else 'Missing'}")
    else:
        data = response.json()
        print(f"   ❌ Login failed: {data.get('error', 'Unknown error')}")

if __name__ == "__main__":
    debug_login_flow()
