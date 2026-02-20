/**
 * Test server responsiveness
 */

import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/',
  method: 'GET',
  timeout: 5000
};

console.log('Testing server responsiveness at http://localhost:3000/');

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response length:', data.length);
    if (data.length > 0) {
      console.log('First 200 chars of response:', data.substring(0, 200));
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.on('timeout', () => {
  console.log('Request timed out');
  req.destroy();
});

req.end();