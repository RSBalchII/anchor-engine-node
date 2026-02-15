/**
 * Database Initialization Test
 * Tests just the database initialization
 */

import { db } from './dist/core/db.js';

async function dbInitTest() {
    console.log('🔧 Database initialization test...');
    
    try {
        console.log('🔌 Starting database initialization...');
        await db.init();
        console.log('✅ Database initialized successfully');
        console.log('✅ DB init test completed');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        console.error('❌ Error stack:', error.stack);
    }
}

dbInitTest();