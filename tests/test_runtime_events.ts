import { AgentRuntime } from './src/agent/runtime.js';

async function testEvents() {
    console.log("Starting R1 Event Test...");
    const events: any[] = [];

    const runtime = new AgentRuntime({
        verbose: true,
        onEvent: (e) => {
            console.log(`[Event Received] ${e.type}`);
            events.push(e);
        }
    });

    try {
        await runtime.runLoop("Analyze the importance of deterministic memory in AI agents.");
    } catch (e: any) {
        console.log("Runtime stopped:", e.message);
    }

    // Check results
    const thoughts = events.filter(e => e.type === 'thought');
    const answers = events.filter(e => e.type === 'answer');

    if (thoughts.length >= 3) {
        console.log(`✅ SUCCESS: Received ${thoughts.length} reasoning steps.`);
    } else {
        console.error(`❌ FAILURE: Expected at least 3 thoughts, got ${thoughts.length}`);
        process.exit(1);
    }

    if (answers.length === 1) {
        console.log(`✅ SUCCESS: Received final answer.`);
    } else {
        console.error(`❌ FAILURE: Expected 1 answer, got ${answers.length}`);
        process.exit(1);
    }

    console.log("🎉 R1 Event Test Completed Successfully.");
}

testEvents();
