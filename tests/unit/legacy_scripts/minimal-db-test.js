/**
 * Minimal Server with DB Test
 */

import express from 'express';
import { db } from './dist/core/db.js';
import { config } from './dist/config/index.js';

async function minimalDbTest() {
    console.log('🔧 Starting minimal server with DB test...');
    console.log(`🔧 Config - Port: ${config.PORT}, Host: ${config.HOST}`);
    
    try {
        console.log('📡 Creating minimal Express app...');
        const app = express();
        
        // Add only the health route
        app.get('/health', (req, res) => {
            res.status(200).json({ 
                status: 'minimal-db', 
                timestamp: new Date().toISOString(),
                message: 'Minimal server with DB is running'
            });
        });
        
        console.log('🔌 Initializing database...');
        await db.init();
        console.log('✅ Database initialized successfully');
        
        console.log(`📡 Attempting to listen on localhost:${config.PORT}...`);
        
        const server = app.listen(config.PORT, 'localhost', () => {
            console.log(`✅ Minimal server with DB running on localhost:${config.PORT}`);
            console.log(`🏥 Health check: http://localhost:${config.PORT}/health`);
            console.log('🔧 Server is running. Press Ctrl+C to stop.');
        });
        
        server.on('error', (err) => {
            console.error('❌ Server error:', err);
            console.error('❌ Error code:', err.code);
            process.exit(1);
        });
        
    } catch (error) {
        console.error('💥 Error:', error);
        console.error('💥 Stack:', error.stack);
        process.exit(1);
    }
}

minimalDbTest();