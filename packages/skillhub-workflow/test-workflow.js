import axios from 'axios';

const API_BASE = 'http://localhost:3001';

async function testWorkflow() {
  console.log('🧪 Testing Workflow Execution...\n');

  try {
    // Create a workflow
    console.log('1. Creating workflow...');
    const createResponse = await axios.post(`${API_BASE}/api/workflows`, {
      name: 'Test SkillHub Search',
      description: 'Test searching skills from SkillHub',
      nodes: [
        {
          id: 'node_1',
          type: 'skillhub_search',
          params: {
            query: 'AI',
            limit: 3
          }
        }
      ],
      edges: []
    });

    console.log('✅ Workflow created:', createResponse.data.id);
    console.log('Name:', createResponse.data.name);

    // Execute the workflow
    console.log('\n2. Executing workflow...');
    const executeResponse = await axios.post(`${API_BASE}/api/workflows/${createResponse.data.id}/execute`, {
      input: {}
    });

    console.log('✅ Workflow executed successfully');
    console.log('Results:', JSON.stringify(executeResponse.data.result.results, null, 2).substring(0, 500));

    if (executeResponse.data.result.results.node_1) {
      const searchResult = executeResponse.data.result.results.node_1;
      console.log('\nSearch Result:');
      console.log('  Success:', searchResult.success);
      console.log('  Skills count:', searchResult.skills?.length || 0);
      if (searchResult.skills && searchResult.skills.length > 0) {
        console.log('  First skill:', searchResult.skills[0].name);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testWorkflow();
