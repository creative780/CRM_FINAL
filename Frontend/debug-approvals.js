/**
 * Debug script to check approval system
 * Copy and paste this into browser console to diagnose approval issues
 */

console.log('🔍 DEBUGGING APPROVAL SYSTEM');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Check authentication state
const token = localStorage.getItem('admin_token');
const username = localStorage.getItem('admin_username');
const role = localStorage.getItem('admin_role');

console.log('🔑 Authentication State:');
console.log('Token:', token ? 'EXISTS' : 'MISSING');
console.log('Username:', username || 'NOT SET');
console.log('Role:', role || 'NOT SET');

// Test the approvals API endpoint
async function testApprovalsEndpoint() {
  const API_BASE = 'http://127.0.0.1:8000';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  console.log('📡 Testing approvals endpoint...');
  
  try {
    const response = await fetch(`${API_BASE}/api/approvals/pending/`, {
      method: 'GET',
      headers: headers
    });
    
    console.log('📊 Response:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Approval data:', data);
      console.log(`Found ${data.length} pending approvals`);
      
      if (data.length === 0) {
        console.log('❓ No approvals found. Possible causes:');
        console.log('  1. User role not "admin" or "sales"');
        console.log('  2. Sales person name mismatch');
        console.log('  3. No approvals exist in database');
        console.log('  4. Approvals are not "pending" status');
      }
      
      return data;
    } else {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      
      if (response.status === 401) {
        console.log('🔒 Authentication issue - token might be invalid or expired');
      } else if (response.status === 403) {
        console.log('🚫 Permission issue - user might not have sales/admin role');
      }
      
      return null;
    }
  } catch (error) {
    console.error('💥 Network error:', error.message);
    console.log('🔧 Possible causes:');
    console.log('  1. Backend server not running on port 8000');
    console.log('  2. CORS configuration issue');
    console.log('  3. Network connectivity problem');
    return null;
  }
}

// Test authentication endpoint
async function testAuthEndpoint() {
  const API_BASE = 'http://127.0.0.1:8000';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  console.log('🔍 Testing authentication...');
  
  try {
    const response = await fetch(`${API_BASE}/api/auth/me/`, {
      method: 'GET',
      headers: headers
    });
    
    if (response.ok) {
      const userData = await response.json();
      console.log('👤 User data:', userData);
      return userData;
    } else {
      console.log('❌ Auth test failed:', response.status, response.statusText);
      return null;
    }
  } catch (error) {
    console.log('💥 Auth test error:', error.message);
    return null;
  }
}

// Check database for approvals
async function checkDatabaseApprovals() {
  const API_BASE = 'http://127.0.0.1:8000';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  console.log('🔍 Checking all design approvals in database...');
  
  try {
    // Try to access all orders and check their design_approvals
    const response = await fetch(`${API_BASE}/api/orders/?limit=5`, {
      method: 'GET',
      headers: headers
    });
    
    if (response.ok) {
      const orders = await response.json();
      console.log(`📦 Found ${orders.length} orders`);
      
      for (const order of orders) {
        if (order.id === 46) { // ORD-HNF8DM
          console.log('🎯 Found target order:', order.id, order.order_code);
          console.log('Approvals associated with this order:', order.design_approvals || 'NONE');
          break;
        }
      }
    } else {
      console.log('❌ Failed to fetch orders:', response.status);
    }
  } catch (error) {
    console.log('💥 Database check error:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive approval debugging...');
  
  await testAuthEndpoint();
  await testApprovalsEndpoint();
  await checkDatabaseApprovals();
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Debugging complete!');
  
  console.log('\n💡 NEXT STEPS:');
  console.log('1. Check if backend server is running: http://127.0.0.1:8000/api/');
  console.log('2. Verify user has "admin" or "sales" role in localStorage');
  console.log('3. Check if DesignApproval record exists with correct sales_person');
  console.log('4. Ensure approval_status is "pending"');
}

// Export function for console
window.debugApprovals = runAllTests;

console.log('\n🔧 To run all tests, execute: debugApprovals()');
console.log('🎯 Or run individual tests: testApprovalsEndpoint(), testAuthEndpoint(), checkDatabaseApprovals()');

