/**
 * Simple port availability test
 */

import { createConnection } from 'net';

function checkPort(port, host = 'localhost') {
    return new Promise((resolve) => {
        const socket = createConnection(port, host);

        socket.setTimeout(2000); // 2 second timeout

        socket.on('connect', () => {
            console.log(`✅ Port ${port} on ${host} is available (connection established)`);
            socket.destroy();
            resolve(true);
        });

        socket.on('timeout', () => {
            console.log(`⏰ Port ${port} on ${host} timed out (no response)`);
            socket.destroy();
            resolve(false);
        });

        socket.on('error', (err) => {
            if (err.code === 'ECONNREFUSED') {
                console.log(`❌ Port ${port} on ${host} - Connection refused (no service listening)`);
                resolve(false);
            } else if (err.code === 'EADDRNOTAVAIL') {
                console.log(`❌ Port ${port} on ${host} - Address not available (invalid host)`);
                resolve(false);
            } else {
                console.log(`❓ Port ${port} on ${host} - Error: ${err.code} - ${err.message}`);
                resolve(false);
            }
        });
    });
}

async function testPorts() {
    console.log('🔍 Testing port availability...\n');

    // Test different combinations
    console.log('Testing if port 3000 is available on different hosts:');
    await checkPort(3000, 'localhost');
    await checkPort(3000, '127.0.0.1');

    console.log('\n🔍 Done testing ports.');
}

testPorts().catch(console.error);