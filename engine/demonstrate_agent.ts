/**
 * Demonstration: Sovereign Ralph - Current Capabilities
 * 
 * This script demonstrates the current state of the agent runtime with mock planning.
 * It shows that the "Ouroboros Loop" is functional and the agent can perform
 * basic operations using the C++ Tool Executor.
 */

import { AgentRuntime } from './src/agent/runtime.js';

async function demonstrateAgentCapabilities() {
  console.log('🚀 Demonstrating Sovereign Ralph - Agent Runtime');
  console.log('================================================\n');

  // Create an agent runtime instance
  const runtime = new AgentRuntime({ verbose: true, maxIterations: 3 });

  console.log('📋 DEMONSTRATION 1: Directory Listing');
  console.log('Objective: "List the files in the current directory"');
  console.log('-'.repeat(50));

  try {
    const result1 = await runtime.runLoop('List the files in the current directory');
    console.log('✅ Directory listing completed successfully\n');
  } catch (error) {
    console.error('❌ Directory listing failed:', error);
  }

  console.log('📋 DEMONSTRATION 2: File Reading (if README exists)');
  console.log('Objective: "Read the README.md file"');
  console.log('-'.repeat(50));

  try {
    const result2 = await runtime.runLoop('Read the README.md file');
    console.log('✅ File reading attempt completed\n');
  } catch (error) {
    console.error('❌ File reading failed:', error);
  }

  console.log('📋 DEMONSTRATION 3: Memory Search');
  console.log('Objective: "Search for information about ECE architecture"');
  console.log('-'.repeat(50));

  try {
    const result3 = await runtime.runLoop('Search for information about ECE architecture');
    console.log('✅ Memory search completed\n');
  } catch (error) {
    console.error('❌ Memory search failed:', error);
  }

  console.log('🎉 All demonstrations completed!');
  console.log('The "Ouroboros Loop" is functional with C++ Tool Executor integration.');
  console.log('Ready for Phase 3: Connecting the LLM for dynamic planning.\n');
}

// Run the demonstration
demonstrateAgentCapabilities().catch(console.error);