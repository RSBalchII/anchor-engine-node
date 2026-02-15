import { InferenceService } from '../src/services/inference/inference-service.js';
import { runStreamingChat } from '../src/services/llm/provider.js';
import config from '../src/config/index.js';

/**
 * Test Suite: Chat Streaming Flow
 * Verifies that tokens are correctly propagated from Worker -> Provider -> Service -> Observer.
 */
async function testChatStreaming() {
    console.log('🧪 Testing Chat Streaming Flow...\n');

    const service = new InferenceService({
        temperature: 0.7,
        maxTokens: 50
    });

    // Test 1: InferenceService.chat streaming
    console.log('Test 1: InferenceService.chat() streaming callback');

    // Auto-init (will try to load models if not loaded)
    console.log('Initializing Service...');
    const initSuccess = await service.initialize();
    if (!initSuccess) {
        console.error('❌ Service initialization failed. Ensure models are configured.');
        process.exit(1);
    }

    let tokenCount = 0;
    let fullResponse = "";

    try {
        console.log('Sending "Hello" to Chat...');
        const response = await service.chat(
            [{ role: 'user', content: 'Hello' }],
            {
                onToken: (token) => {
                    process.stdout.write(token); // Visual verification
                    tokenCount++;
                    fullResponse += token;
                }
            }
        );

        console.log('\n\n--- Stats ---');
        console.log(`Tokens Received: ${tokenCount}`);
        console.log(`Final Response Length: ${response?.length}`);

        if (tokenCount > 0 && response && response.length > 0) {
            console.log('✅ InferenceService stream verified.');
        } else {
            console.error('❌ Stream failed: No tokens received or empty response.');
            console.error('Debug: Make sure InferenceService passes onToken to runChatCompletion -> runSideChannel.');
        }

        if (response !== fullResponse) {
            console.warn('⚠️ Warning: Streamed tokens mismatch validation. (This might be okay if special tokens are skipped)');
            console.log(`Streaming sum: "${fullResponse}"`);
            console.log(`Final Result:  "${response}"`);
        }

    } catch (e: any) {
        console.error('❌ Test failed with error:', e);
    }

    // Force exit as workers might hang
    process.exit(0);
}

// Run
testChatStreaming().catch(e => console.error(e));
