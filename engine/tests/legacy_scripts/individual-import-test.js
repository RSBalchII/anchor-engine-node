/**
 * Individual Route Import Test
 * Tests importing each route file individually to identify the problematic one
 */

import { db } from './dist/core/db.js';
import { config } from './dist/config/index.js';

async function individualImportTest() {
    console.log('🔧 Starting individual route import test...');
    console.log(`🔧 Config - Port: ${config.PORT}, Host: ${config.HOST}`);
    
    try {
        console.log('🔌 Initializing database...');
        await db.init();
        console.log('✅ Database initialized successfully');
        
        // Test importing each route file individually
        console.log('📚 Testing import of API routes...');
        try {
            const apiRoutes = await import('./dist/routes/api.js');
            console.log('✅ Successfully imported API routes');
            console.log('   - setupRoutes function exists:', typeof apiRoutes.setupRoutes === 'function');
        } catch (apiError) {
            console.error('❌ Error importing API routes:', apiError.message);
            console.error('   - Error stack:', apiError.stack);
        }
        
        console.log('\n🏥 Testing import of health routes...');
        try {
            const healthRoutes = await import('./dist/routes/health.js');
            console.log('✅ Successfully imported health routes');
            console.log('   - setupHealthRoutes function exists:', typeof healthRoutes.setupHealthRoutes === 'function');
        } catch (healthError) {
            console.error('❌ Error importing health routes:', healthError.message);
            console.error('   - Error stack:', healthError.stack);
        }
        
        console.log('\n📊 Testing import of monitoring routes...');
        try {
            const monitoringRoutes = await import('./dist/routes/monitoring.js');
            console.log('✅ Successfully imported monitoring routes');
            console.log('   - monitoringRouter exists:', !!monitoringRoutes.monitoringRouter);
        } catch (monitoringError) {
            console.error('❌ Error importing monitoring routes:', monitoringError.message);
            console.error('   - Error stack:', monitoringError.stack);
        }
        
        console.log('\n✅ Individual import test completed');
        
    } catch (error) {
        console.error('💥 Error in import test:', error);
        console.error('💥 Stack:', error.stack);
        process.exit(1);
    }
}

individualImportTest();