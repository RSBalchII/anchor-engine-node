/**
 * Test the fixed engine startup by making a simple HTTP request
 */

import { setTimeout } from 'timers/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testFixedEngine() {
    console.log('🔧 Testing fixed engine startup...');
    
    // Start the engine in the background
    const { spawn } = await import('child_process');
    const engineProc = spawn('node', ['dist/index.js'], {
        cwd: process.cwd(),
        stdio: 'pipe'
    });
    
    // Listen for the server ready message
    let serverReady = false;
    const stdoutData = [];
    
    engineProc.stdout.on('data', (data) => {
        const str = data.toString();
        stdoutData.push(str);
        console.log('Engine output:', str);
        
        if (str.includes('Sovereign Context Engine running on port')) {
            serverReady = true;
            console.log('✅ Server is ready! Testing health endpoint...');
        }
    });
    
    engineProc.stderr.on('data', (data) => {
        console.error('Engine error:', data.toString());
    });
    
    // Wait for server to be ready or timeout after 10 seconds
    const timeout = 10000; // 10 seconds
    const startTime = Date.now();
    
    while (!serverReady && Date.now() - startTime < timeout) {
        await setTimeout(500); // Wait 500ms before checking again
    }
    
    if (serverReady) {
        console.log('✅ Server started successfully, testing health endpoint...');
        
        // Wait a little more for the server to be fully ready
        await setTimeout(2000);
        
        try {
            // Use node's http module to test the endpoint
            const http = await import('http');
            
            await new Promise((resolve, reject) => {
                const request = http.get('http://localhost:3000/health', (res) => {
                    let data = '';
                    
                    res.on('data', (chunk) => {
                        data += chunk;
                    });
                    
                    res.on('end', () => {
                        console.log(`✅ Health check succeeded! Status: ${res.statusCode}`);
                        console.log(`Response: ${data}`);
                        resolve(null);
                    });
                });
                
                request.on('error', (err) => {
                    console.error('❌ Health check failed:', err.message);
                    reject(err);
                });
                
                // Set timeout for the request
                request.setTimeout(5000, () => {
                    request.destroy();
                    reject(new Error('Health check request timed out'));
                });
            });
        } catch (error) {
            console.error('❌ Health check error:', error.message);
        }
    } else {
        console.log('❌ Server did not start within timeout period');
    }
    
    // Clean up - kill the process
    engineProc.kill();
    console.log('🔧 Test completed');
}

testFixedEngine().catch(console.error);