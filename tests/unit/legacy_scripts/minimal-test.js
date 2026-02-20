/**
 * Ultra Minimal Server Test
 */

import express from 'express';
import { config } from './dist/config/index.js';

async function ultraMinimalTest() {
    console.log('🔧 Starting ultra-minimal server test...');
    console.log(`🔧 Config - Port: ${config.PORT}, Host: ${config.HOST}`);
    
    try {
        console.log('📡 Creating ultra-minimal Express app...');
        const app = express();
        
        // Add only the health route
        app.get('/health', (req, res) => {
            res.status(200).json({ 
                status: 'minimal', 
                timestamp: new Date().toISOString(),
                message: 'Ultra minimal server is running'
            });
        });
        
        console.log(`📡 Attempting to listen on localhost:${config.PORT}...`);
        
        const server = app.listen(config.PORT, 'localhost', () => {
            console.log(`✅ Ultra-minimal server running on localhost:${config.PORT}`);
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

ultraMinimalTest();