/**
 * Full Engine Startup Sequence Test
 * Mimics the exact sequence from the original engine index.ts
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './dist/core/db.js';
import { config } from './dist/config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fullSequenceTest() {
    console.log('🔧 Starting full engine sequence test...');
    console.log(`🔧 Config - Port: ${config.PORT}, Host: ${config.HOST}`);
    
    try {
        console.log('📡 Creating Express app...');
        const app = express();
        
        // Add the same middleware as the original engine
        app.use(cors());
        app.use(express.json({ limit: "50mb" }));
        app.use(express.urlencoded({ extended: true }));
        
        // Add the same routes setup as the original engine
        // Instead of importing the actual route setup functions, let's add a simple health route
        app.get('/health', (req, res) => {
            res.status(200).json({ 
                status: 'full-sequence-test', 
                timestamp: new Date().toISOString(),
                message: 'Full sequence test server is running'
            });
        });
        
        console.log('🔌 Initializing database...');
        await db.init();
        console.log('✅ Database initialized successfully');
        
        console.log('📡 Starting server with app.listen()...');
        // This is the critical step - mimic the exact server start from the original
        const server = app.listen(config.PORT, config.HOST, () => {
            console.log(`✅ Server running on port ${config.PORT}`);
            console.log(`🏥 Health check available at http://localhost:${config.PORT}/health`);
        });
        
        console.log('🔄 Server started, now testing post-listen operations...');
        
        // Instead of importing and running the actual services, let's just add a simple timeout
        // to see if the server remains responsive
        setTimeout(() => {
            console.log('⏰ Post-listen operations completed (simulated)');
        }, 1000);
        
        server.on('error', (err) => {
            console.error('❌ Server error:', err);
            process.exit(1);
        });
        
        console.log('🔧 Full sequence test completed. Server should be running.');
        
    } catch (error) {
        console.error('💥 Error in full sequence:', error);
        console.error('💥 Stack:', error.stack);
        process.exit(1);
    }
}

fullSequenceTest();