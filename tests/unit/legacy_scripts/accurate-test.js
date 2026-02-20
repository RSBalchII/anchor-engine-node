/**
 * Accurate Engine Startup Test
 * Replicates the exact startup sequence from the original engine
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './dist/core/db.js';
import { config } from './dist/config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function accurateEngineTest() {
    console.log('🔧 Starting accurate engine startup test...');
    console.log(`🔧 Config - Port: ${config.PORT}, Host: ${config.HOST}`);
    
    try {
        console.log('📡 Creating Express app with all middleware...');
        const app = express();
        
        // Add all the middleware from the original engine
        app.use(cors());
        app.use(express.json({ limit: "50mb" }));
        app.use(express.urlencoded({ extended: true }));
        
        // Add a simple health route (the original engine has this via setupHealthRoutes)
        app.get('/health', (req, res) => {
            res.status(200).json({ 
                status: 'accurate-test', 
                timestamp: new Date().toISOString(),
                message: 'Accurate engine test server is running'
            });
        });
        
        console.log('🔌 Initializing database...');
        await db.init();
        console.log('✅ Database initialized successfully');
        
        console.log('📡 Starting server with app.listen()...');
        // Start the server - this should be non-blocking
        const server = app.listen(config.PORT, config.HOST, () => {
            console.log(`✅ Server running on ${config.HOST}:${config.PORT}`);
            console.log(`🏥 Health check available at http://localhost:${config.PORT}/health`);
        });
        
        server.on('error', (err) => {
            console.error('❌ Server error:', err);
            process.exit(1);
        });
        
        console.log('🔄 Simulating post-server-start operations...');
        
        // Simulate the operations that happen after server starts in the original engine
        // These should be non-blocking
        try {
            console.log('🎬 Starting watchdog service simulation...');
            // In the original, this imports and calls startWatchdog
            // Let's simulate it with a simple async operation
            setTimeout(() => {
                console.log('🎬 Watchdog service would start here');
            }, 100);
            
            console.log('🌙 Running dream cycle simulation...');
            // In the original, this calls dream() which might be blocking
            setTimeout(() => {
                console.log('🌙 Dream cycle would run here');
            }, 200);
            
            // Set interval for dream cycles (from original engine)
            setInterval(() => {
                console.log('🌙 Scheduled dream cycle would run');
            }, 1000); // Reduced for testing
            
        } catch (postStartError) {
            console.error('❌ Error in post-start operations:', postStartError);
        }
        
        console.log('🔧 Engine startup sequence completed. Server should be responsive.');
        
    } catch (error) {
        console.error('💥 Error in engine startup:', error);
        console.error('💥 Stack:', error.stack);
        process.exit(1);
    }
}

accurateEngineTest();

// Handle shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    process.exit(0);
});