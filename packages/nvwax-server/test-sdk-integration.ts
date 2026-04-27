import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

// Test configuration
const TEST_USER = {
  email: 'sdk-test@example.com',
  password: 'Test@123456',
  name: 'SDK Test User'
};

async function testSdkIntegration() {
  console.log('🧪 Testing SDK Integration...\n');

  try {
    // Step 1: Register a test user
    console.log('📝 Step 1: Registering test user...');
    try {
      await axios.post(`${API_BASE_URL}/auth/register`, TEST_USER);
      console.log('✅ User registered\n');
    } catch (error: any) {
      if (error.response?.status === 409) {
        console.log('ℹ️  User already exists, proceeding to login\n');
      } else {
        throw error;
      }
    }

    // Step 2: Login to get JWT token
    console.log('🔐 Step 2: Logging in...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    const authToken = loginResponse.data.data.token;
    console.log('✅ Logged in successfully\n');

    // Step 3: Create a tenant (this would normally be done through a UI)
    console.log('🏢 Step 3: Creating tenant...');
    // Note: We need to add a tenant creation endpoint or do this manually
    // For now, we'll assume the user has a default tenant
    console.log('⚠️  Tenant creation endpoint not yet implemented');
    console.log('   Please create a tenant manually or use existing one\n');
    
    // For testing purposes, let's skip to API key creation
    // In production, you'd get tenantId from the tenant creation response
    
    console.log('💡 To test API key creation, you need to:');
    console.log('   1. Create a tenant first');
    console.log('   2. Use the tenant ID to create an API key');
    console.log('   3. Test the API key with various endpoints\n');

    console.log('✨ SDK infrastructure is ready! Next steps:');
    console.log('   - Implement tenant creation UI');
    console.log('   - Add API key management UI in user dashboard');
    console.log('   - Create documentation for developers\n');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

testSdkIntegration();
