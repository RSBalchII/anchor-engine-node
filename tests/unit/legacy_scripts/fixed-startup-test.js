/**
 * Fixed Engine Startup Order Test
 * Starts server first, then initializes database (fixes the hanging issue)
 */

import express from 'express';
import { config } from './dist/config/index.js';

async function fixedStartupTest() {
    console.log('🔧 Fixed startup order test...');
    console.log(`🔧 Config - Port: ${config.PORT}, Host: ${config.HOST}`);
    
    const app = express();
    
    // Add a simple health route
    app.get('/health', (req, res) => {
        res.status(200).json({ 
            status: 'server-ready', 
            timestamp: new Date().toISOString(),
            message: 'Server is running and ready'
        });
    });
    
    // Start the server FIRST
    console.log(`📡 Starting server on localhost:${config.PORT}...`);
    const server = app.listen(config.PORT, 'localhost', () => {
        console.log(`✅ Server running on localhost:${config.PORT}`);
        console.log(`🏥 Health check: http://localhost:${config.PORT}/health`);
    });
    
    server.on('error', (err) => {
        console.error('❌ Server error:', err);
        process.exit(1);
    });
    
    // Now initialize the database in the background
    console.log('🔌 Initializing database in the background...');
    try {
        const { db } = await import('./dist/core/db.js');
        await db.init();
        console.log('✅ Database initialized in background');
        
        // Test a simple query to make sure it's working
        const result = await db.run('SELECT 1 as test');
        console.log('✅ Database query test passed:', result.rows);
    } catch (error) {
        console.error('❌ Background database init failed:', error);
    }
    
    console.log('🔧 Startup sequence completed. Server should be responsive.');
    
    // Handle shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down server...');
        server.close(() => {
            console.log('🔒 Server closed');
            process.exit(0);
        });
    });
}

fixedStartupTest().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});