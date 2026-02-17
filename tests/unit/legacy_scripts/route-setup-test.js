/**
 * Route Setup Isolation Test
 * Tests the route setup functions that come before app.listen() in the original engine
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './dist/core/db.js';
import { config } from './dist/config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function routeSetupTest() {
    console.log('🔧 Starting route setup isolation test...');
    console.log(`🔧 Config - Port: ${config.PORT}, Host: ${config.HOST}`);
    
    try {
        console.log('📡 Creating Express app...');
        const app = express();
        
        // Add the same middleware as the original engine
        app.use(cors());
        app.use(express.json({ limit: "50mb" }));
        app.use(express.urlencoded({ extended: true }));
        
        console.log('🔌 Initializing database...');
        await db.init();
        console.log('✅ Database initialized successfully');
        
        console.log('🔄 Setting up routes (before app.listen)...');
        
        // Try to import and run the route setup functions
        try {
            console.log('📚 Importing setupRoutes...');
            const { setupRoutes } = await import('./dist/routes/api.js');
            console.log('✅ Imported setupRoutes');
            
            console.log('📚 Setting up API routes...');
            setupRoutes(app);
            console.log('✅ API routes set up');
        } catch (apiRouteError) {
            console.error('❌ Error setting up API routes:', apiRouteError);
            console.error('❌ Error stack:', apiRouteError.stack);
        }
        
        try {
            console.log('🏥 Importing setupHealthRoutes...');
            const { setupHealthRoutes } = await import('./dist/routes/health.js');
            console.log('✅ Imported setupHealthRoutes');
            
            console.log('🏥 Setting up health routes...');
            setupHealthRoutes(app);
            console.log('✅ Health routes set up');
        } catch (healthRouteError) {
            console.error('❌ Error setting up health routes:', healthRouteError);
            console.error('❌ Error stack:', healthRouteError.stack);
        }
        
        try {
            console.log('📊 Importing monitoring router...');
            const { monitoringRouter } = await import('./dist/routes/monitoring.js');
            console.log('✅ Imported monitoringRouter');
            
            app.use('/monitoring', monitoringRouter);
            console.log('✅ Monitoring routes set up');
        } catch (monitoringRouteError) {
            console.error('❌ Error setting up monitoring routes:', monitoringRouteError);
            console.error('❌ Error stack:', monitoringRouteError.stack);
        }
        
        console.log('📡 Attempting to listen on localhost:3000...');
        const server = app.listen(config.PORT, 'localhost', () => {
            console.log(`✅ Server running on localhost:${config.PORT}`);
            console.log('🔧 Server is running. Press Ctrl+C to stop.');
        });
        
        server.on('error', (err) => {
            console.error('❌ Server error:', err);
            process.exit(1);
        });
        
        console.log('✅ Route setup completed successfully, server should start...');
        
    } catch (error) {
        console.error('💥 Error in route setup test:', error);
        console.error('💥 Stack:', error.stack);
        process.exit(1);
    }
}

routeSetupTest();