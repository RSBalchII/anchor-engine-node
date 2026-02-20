/**
 * Database Init with Close Test
 * Tests database initialization and closing
 */

import { db } from './dist/core/db.js';

async function dbInitCloseTest() {
    console.log('🔧 Database init with close test...');
    
    try {
        console.log('🔌 Starting database initialization...');
        await db.init();
        console.log('✅ Database initialized successfully');
        
        console.log('🔒 Closing database connection...');
        await db.close();
        console.log('✅ Database closed successfully');
        console.log('✅ Test completed');
    } catch (error) {
        console.error('❌ Error:', error);
        console.error('❌ Error stack:', error.stack);
    }
}

dbInitCloseTest();