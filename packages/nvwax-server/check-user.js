/**
 * 检查并创建测试用户
 */

const API_BASE = 'http://localhost:3001/api';

async function checkAndCreateUser() {
  console.log('🔍 Checking if user exists...\n');
  
  const email = '1055603323@qq.com';
  const password = 'admin123';
  
  // Try to login first
  console.log('1. Trying to login...');
  try {
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (loginResponse.ok) {
      const data = await loginResponse.json();
      console.log('✅ User exists and login successful!');
      console.log('   Token:', data.data?.token?.substring(0, 20) + '...');
      return data.data;
    } else {
      console.log('   Login failed - user may not exist or wrong password');
    }
  } catch (error) {
    console.log('   Login error:', error.message);
  }
  
  // Try to register
  console.log('\n2. Trying to register new user...');
  try {
    const registerResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name: 'Admin User'
      })
    });
    
    if (registerResponse.ok) {
      const data = await registerResponse.json();
      console.log('✅ User registered successfully!');
      console.log('   Token:', data.data?.token?.substring(0, 20) + '...');
      return data.data;
    } else {
      const errorText = await registerResponse.text();
      console.log('   Registration failed:', registerResponse.statusText);
      console.log('   Error:', errorText);
      
      // If already registered, try login again with different approach
      if (registerResponse.status === 409) {
        console.log('\n3. User already exists, trying admin login...');
        const adminLoginResponse = await fetch(`${API_BASE}/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'admin',
            password: 'admin123'
          })
        });
        
        if (adminLoginResponse.ok) {
          const data = await adminLoginResponse.json();
          console.log('✅ Admin login successful!');
          console.log('   Token:', data.data?.token?.substring(0, 20) + '...');
          return data.data;
        } else {
          console.log('   Admin login also failed');
        }
      }
    }
  } catch (error) {
    console.log('   Registration error:', error.message);
  }
  
  console.log('\n❌ Could not authenticate user');
  return null;
}

checkAndCreateUser().then(result => {
  if (result) {
    console.log('\n✅ Authentication successful!');
    console.log('You can now use the token for API calls');
  } else {
    console.log('\n⚠️ Please check:');
    console.log('1. Is the backend server running on port 3001?');
    console.log('2. Are the credentials correct?');
    console.log('3. Check backend logs for more details');
  }
  process.exit(result ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
