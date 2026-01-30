import { AgentRuntime } from '../src/agent/runtime.js';

/**
 * Test suite for AgentRuntime (R1 Reasoning Loop)
 */
async function testAgentRuntime() {
  console.log('🧪 Testing AgentRuntime (R1 Loop)...\n');

  // Test 1: Initialize AgentRuntime
  console.log('Test 1: Initialize AgentRuntime');
  try {
    const runtime = new AgentRuntime({ verbose: true });
    console.log('✅ AgentRuntime initialized successfully\n');
  } catch (error: any) {
    console.error('❌ Failed to initialize AgentRuntime:', error.message);
    return;
  }

  // Test 2: Run R1 Reasoning Loop
  console.log('Test 2: Run R1 Reasoning Loop');
  try {
    const events: string[] = [];
    const runtime = new AgentRuntime({
      verbose: true,
      onEvent: (e) => {
        console.log(`[Event] ${e.type}`);
        events.push(e.type);
      }
    });

    const result = await runtime.runLoop('Explain the importance of sovereign context in AI.');

    console.log('Result length:', result.length);

    // Verify R1 Stages
    const hasThoughts = events.includes('thought');
    const hasAnswer = events.includes('answer');

    if (hasThoughts && hasAnswer) {
      console.log('✅ R1 Reasoning stages verified (Thoughts + Answer)\n');
    } else {
      console.error('❌ R1 Reasoning stages missing! Events received:', events);
    }

  } catch (error: any) {
    console.error('❌ R1 Reasoning loop failed:', error.message);
    return;
  }

  console.log('🎉 All tests passed! AgentRuntime is delivering R1 reasoning.');
}

// Run the tests
testAgentRuntime().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});