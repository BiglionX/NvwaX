import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

async function testLogin() {
  try {
    console.log('Testing login endpoint...');
    
    // 尝试使用一个测试账户登录
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    
    console.log('Login successful:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('Login failed with status:', error.response.status);
      console.log('Error data:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }
}

testLogin();