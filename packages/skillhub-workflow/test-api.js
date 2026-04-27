import axios from 'axios';

const BASE_URL = 'https://skillhub.proclaw.cc';

async function testAPI() {
  console.log('🧪 Testing SkillHub API...\n');

  // Test 1: Tool Discovery
  try {
    console.log('1. Testing /api/tools/discovery...');
    const response = await axios.get(`${BASE_URL}/api/tools/discovery`);
    console.log('✅ Success:', response.data.tools?.length || 0, 'tools found\n');
    console.log('Platform:', response.data.platform);
    console.log('Version:', response.data.version);
    if (response.data.tools && response.data.tools.length > 0) {
      console.log('First tool:', response.data.tools[0].name);
    }
  } catch (error) {
    console.log('❌ Failed:', error.message, '\n');
  }

  // Test 2: Search
  try {
    console.log('\n2. Testing /api/search...');
    const response = await axios.get(`${BASE_URL}/api/search`, {
      params: { q: 'drawio', pageSize: 3 }
    });
    console.log('✅ Success:', response.data.skills?.length || 0, 'results found\n');
    if (response.data.skills && response.data.skills.length > 0) {
      console.log('First result:', response.data.skills[0].name);
      console.log('Slug:', response.data.skills[0].slug);
    }
  } catch (error) {
    console.log('❌ Failed:', error.message, '\n');
  }

  // Test 3: Skill Detail
  try {
    console.log('\n3. Testing /api/skills/:slug...');
    // First get a valid slug from search
    const searchResponse = await axios.get(`${BASE_URL}/api/search`, {
      params: { q: 'drawio', pageSize: 1 }
    });
    
    if (searchResponse.data.skills && searchResponse.data.skills.length > 0) {
      const slug = searchResponse.data.skills[0].slug;
      console.log('Using slug:', slug);
      
      const response = await axios.get(`${BASE_URL}/api/skills/${slug}`);
      console.log('✅ Success: Skill found -', response.data.skill?.name || response.data.name || 'N/A', '\n');
      console.log('Description:', (response.data.skill?.description || response.data.description || '').substring(0, 100) + '...');
    } else {
      console.log('⚠️ No skills found for detail test\n');
    }
  } catch (error) {
    console.log('❌ Failed:', error.message, '\n');
  }

  // Test 4: Semantic Search
  try {
    console.log('\n4. Testing /api/search/semantic...');
    const response = await axios.get(`${BASE_URL}/api/search/semantic?q=生成流程图`);
    console.log('✅ Success:', response.data.results?.length || 0, 'results found\n');
  } catch (error) {
    console.log('❌ Failed:', error.message, '\n');
  }

  console.log('🎉 API tests completed');
}

testAPI();
