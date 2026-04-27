import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

async function testLoginWithCredentials() {
  console.log('Testing login with super admin credentials...\n');
  
  const testCases = [
    {
      name: 'Super Admin Account',
      email: '1055603323@qq.com',
      password: '123456'
    },
    {
      name: 'Test Account',
      email: 'test@example.com',
      password: 'password123'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n--- Testing: ${testCase.name} ---`);
    console.log(`Email: ${testCase.email}`);
    console.log(`Password: ${testCase.password}`);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: testCase.email,
        password: testCase.password
      });
      
      console.log('✅ Login successful!');
      console.log('User:', response.data.data.user.name || response.data.data.user.email);
      console.log('Token:', response.data.data.token.substring(0, 50) + '...');
    } catch (error) {
      if (error.response) {
        console.log('❌ Login failed!');
        console.log('Status:', error.response.status);
        console.log('Error:', error.response.data.error);
      } else {
        console.log('❌ Connection error:', error.message);
      }
    }
  }
}

testLoginWithCredentials();
