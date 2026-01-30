import axios from 'axios';

async function testSaveToGraph() {
  try {
    console.log('Testing save_to_graph functionality...');
    
    const response = await axios.post('http://localhost:3000/v1/chat/completions', {
      model: 'test-model',
      save_to_graph: true,
      messages: [
        { role: 'user', content: 'Hello, how are you?' }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Response received:', response.status);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSaveToGraph();