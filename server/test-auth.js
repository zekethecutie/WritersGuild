
const fetch = require('node-fetch');

async function testAuth() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('🧪 Testing authentication endpoints...\n');
  
  // Test 1: Create test user
  console.log('1. Creating test user...');
  try {
    const createRes = await fetch(`${baseUrl}/api/create-test-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const createData = await createRes.json();
    console.log('✅ Create user response:', createData.message);
  } catch (error) {
    console.log('❌ Create user failed:', error.message);
  }
  
  // Test 2: Login with test user
  console.log('\n2. Testing login...');
  try {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testuser',
        password: 'test123'
      })
    });
    const loginData = await loginRes.json();
    
    if (loginRes.ok) {
      console.log('✅ Login successful:', loginData.user?.username);
    } else {
      console.log('❌ Login failed:', loginData.message);
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
  }
  
  // Test 3: Register new user
  console.log('\n3. Testing registration...');
  try {
    const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `testuser${Date.now()}`,
        password: 'password123',
        displayName: 'Test User New',
        email: `test${Date.now()}@example.com`
      })
    });
    const registerData = await registerRes.json();
    
    if (registerRes.ok) {
      console.log('✅ Registration successful:', registerData.user?.username);
    } else {
      console.log('❌ Registration failed:', registerData.message);
    }
  } catch (error) {
    console.log('❌ Registration error:', error.message);
  }
}

testAuth();
