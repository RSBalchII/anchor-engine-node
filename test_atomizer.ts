
import { AtomizerService } from './engine/src/services/ingest/atomizer-service.js';

const atomizer = new AtomizerService();

async function runTest() {
    console.log("--- Testing Time-Ladder ---");
    const historyPath = "c:/Users/rob/history/old_project/readme.md";
    // Mocking correct behavior for atomize
    // We expect #Archive atom
    const resHistory = await atomizer.atomize("Reference content.", historyPath, 'internal');
    const archiveAtom = resHistory.atoms.find(a => a.label === '#Archive');
    console.log(`Path: ${historyPath}`);
    console.log(`Has #Archive: ${!!archiveAtom}`);
    console.log(`Archive Weight: ${archiveAtom?.weight}`);

    const currentPath = "c:/Users/rob/Current/active_project/main.ts";
    const resCurrent = await atomizer.atomize("Active content.", currentPath, 'internal');
    const archiveAtomCurrent = resCurrent.atoms.find(a => a.label === '#Archive');
    console.log(`Path: ${currentPath}`);
    console.log(`Has #Archive (Should be false): ${!!archiveAtomCurrent}`);

    console.log("\n--- Testing Code Splitting ---");
    const code = `
function hello() {
  console.log("world");
  return true;
}

class Test {
   run() {
     console.log("running");
   }
}
    `;
    // We expect blocks, not just lines
    const resCode = await atomizer.atomize(code, "test.ts", 'internal');
    resCode.molecules.forEach(m => {
        console.log(`[${m.type}] Content: ${JSON.stringify(m.content.trim().substring(0, 30))}`);
    });

    // Check if we got at least 2 molecules (Function + Class)
    if (resCode.molecules.length >= 2) {
        console.log("✅ Code Splitting: Detected multiple blocks.");
    } else {
        console.log("❌ Code Splitting: Failed to split blocks properly.");
    }
}

runTest().catch(console.error);
