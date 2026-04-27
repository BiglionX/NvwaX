import axios from 'axios';

const BASE_URL = 'https://skillhub.proclaw.cc';

async function debugAPI() {
  console.log('🔍 Debugging SkillHub API responses...\n');

  // Test 1: Search with different queries
  const queries = ['drawio', 'AI', 'python', 'test'];
  
  for (const query of queries) {
    try {
      console.log(`\n--- Testing search with query: "${query}" ---`);
      const response = await axios.get(`${BASE_URL}/api/search`, {
        params: {
          q: query,
          pageSize: 3
        }
      });
      
      console.log('Status:', response.status);
      console.log('Response keys:', Object.keys(response.data));
      console.log('Full response:', JSON.stringify(response.data, null, 2).substring(0, 500));
      
      if (response.data.results) {
        console.log('Results count:', response.data.results.length);
        if (response.data.results.length > 0) {
          console.log('First result keys:', Object.keys(response.data.results[0]));
        }
      }
    } catch (error) {
      console.log('Error:', error.message);
      if (error.response) {
        console.log('Response status:', error.response.status);
        console.log('Response data:', error.response.data);
      }
    }
  }

  // Test 2: Skill detail
  try {
    console.log('\n\n--- Testing skill detail ---');
    
    // First get a list of skills to find a valid slug
    const listResponse = await axios.get(`${BASE_URL}/api/skills`, {
      params: {
        page: 1,
        limit: 1
      }
    });
    
    console.log('Skills list response keys:', Object.keys(listResponse.data));
    console.log('Skills list:', JSON.stringify(listResponse.data, null, 2).substring(0, 500));
    
    if (listResponse.data.skills && listResponse.data.skills.length > 0) {
      const skillSlug = listResponse.data.skills[0].slug;
      console.log('\nTrying to get detail for slug:', skillSlug);
      
      const detailResponse = await axios.get(`${BASE_URL}/api/skills/${skillSlug}`);
      console.log('Detail response keys:', Object.keys(detailResponse.data));
      console.log('Detail response:', JSON.stringify(detailResponse.data, null, 2).substring(0, 800));
    }
  } catch (error) {
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', JSON.stringify(error.response.data, null, 2).substring(0, 500));
    }
  }

  // Test 3: Semantic search
  try {
    console.log('\n\n--- Testing semantic search ---');
    const response = await axios.get(`${BASE_URL}/api/search/semantic`, {
      params: {
        q: '流程图'
      }
    });
    
    console.log('Status:', response.status);
    console.log('Response keys:', Object.keys(response.data));
    console.log('Response:', JSON.stringify(response.data, null, 2).substring(0, 500));
  } catch (error) {
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', JSON.stringify(error.response.data, null, 2).substring(0, 500));
    }
  }
}

debugAPI();
