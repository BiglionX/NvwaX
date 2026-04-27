import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

async function registerUser() {
  try {
    console.log('Registering user with email: 1055603323@qq.com\n');
    
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      email: '1055603323@qq.com',
      password: 'Admin@123456',
      name: '管理员'
    });
    
    console.log('✅ Registration successful!');
    console.log('\nUser Info:');
    console.log(JSON.stringify(response.data.data.user, null, 2));
    console.log('\nToken:', response.data.data.token);
    console.log('\n--- Login Credentials ---');
    console.log('Email: 1055603323@qq.com');
    console.log('Password: Admin@123456');
    console.log('\nYou can now login with these credentials.');
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Registration failed with status:', error.response.status);
      console.log('Error:', error.response.data);
      
      if (error.response.status === 409) {
        console.log('\nThis email is already registered. Please try logging in instead.');
      }
    } else {
      console.log('Error:', error.message);
    }
  }
}

registerUser();
