/**
 * Config Only Test
 * Tests just importing the config to see if that works
 */

import { config } from './dist/config/index.js';

console.log('🔧 Config only test...');
console.log(`🔧 Config - Port: ${config.PORT}, Host: ${config.HOST}`);
console.log('✅ Config loaded successfully');
console.log('✅ Test completed');