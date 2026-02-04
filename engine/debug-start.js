/**
 * Debug Engine Startup
 */

import express from 'express';
import cors from 'cors';
import { db } from './dist/core/db.js';
import { config } from './dist/config/index.js';

async function debugStart() {
    console.log('🔧 Starting engine debug...');
    console.log(`🔧 Config - Port: ${config.PORT}, Host: ${config.HOST}`);
    
    try {
        console.log('🔌 Initializing database...');
        await db.init();
        console.log('✅ Database initialized successfully');
        
        console.log('📡 Creating Express app...');
        const app = express();
        
        // Add basic middleware
        app.use(cors());
        app.use(express.json({ limit: "50mb" }));
        app.use(express.urlencoded({ extended: true }));
        
        // Add a simple health route first
        app.get('/health', (req, res) => {
            res.status(200).json({ status: 'debug', timestamp: new Date().toISOString() });
        });
        
        console.log(`📡 Attempting to listen on ${config.HOST}:${config.PORT}...`);
        
        // Try to start the server with error handling
        const server = app.listen(config.PORT, config.HOST, () => {
            console.log(`✅ Server running on ${config.HOST}:${config.PORT}`);
            console.log(`🏥 Health check: http://${config.HOST}:${config.PORT}/health`);
            console.log(`🏥 Health check: http://localhost:${config.PORT}/health`);
            
            // Keep the server running for manual testing
            console.log('🔧 Server is running for debugging. Press Ctrl+C to stop.');
        });
        
        server.on('error', (err) => {
            console.error('❌ Server error:', err);
            console.error('❌ Error code:', err.code);
            console.error('❌ Error address:', err.address);
            console.error('❌ Error port:', err.port);
            process.exit(1);
        });
        
        // Handle shutdown gracefully
        process.on('SIGINT', async () => {
            console.log('\n🛑 Shutting down server...');
            try {
                await db.close();
                server.close(() => {
                    console.log('🔒 Server closed');
                    process.exit(0);
                });
            } catch (e) {
                process.exit(1);
            }
        });
        
    } catch (error) {
        console.error('💥 Fatal error during startup:', error);
        console.error('💥 Error stack:', error.stack);
        process.exit(1);
    }
}

debugStart();