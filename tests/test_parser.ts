
import { AgentRuntime } from './src/agent/runtime.js';

class TestRuntime extends AgentRuntime {
    public testParse(input: string) {
        return (this as any).parseToolCall(input);
    }
}

function runTests() {
    const runtime = new TestRuntime();

    const cases = [
        {
            name: "Standard Format",
            input: '{"tool": "search_memory", "params": {"query": "foo"}}',
            expected: { tool: "search_memory", params: { query: "foo" } }
        },
        {
            name: "OpenAI Array Format",
            input: '[{"name": "search_memory", "arguments": {"query": "foo"}}]',
            expected: { tool: "search_memory", params: { query: "foo" } }
        },
        {
            name: "OpenAI Array with Markdown",
            input: '```json\n[{"name": "read_file", "arguments": {"path": "test.txt"}}]\n```',
            expected: { tool: "read_file", params: { path: "test.txt" } }
        },
        {
            name: "Mixed/Hallucinated Format (repair attempt)",
            input: '{"name": "list_dir", "arguments": {"path": "."}}',
            expected: { tool: "list_dir", params: { path: "." } }
        }
    ];

    let passed = 0;
    for (const c of cases) {
        try {
            const result = runtime.testParse(c.input);
            if (result.tool === c.expected.tool && JSON.stringify(result.params) === JSON.stringify(c.expected.params)) {
                console.log(`✅ ${c.name}: Passed`);
                passed++;
            } else {
                console.error(`❌ ${c.name}: Failed. Got`, result);
            }
        } catch (e: any) {
            console.error(`❌ ${c.name}: Exception`, e.message);
        }
    }

    if (passed === cases.length) {
        console.log("ALL TESTS PASSED");
    } else {
        console.log(`${passed}/${cases.length} PASSED`);
        process.exit(1);
    }
}

runTests();
