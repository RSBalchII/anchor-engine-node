
import { AtomizerService } from './src/services/ingest/atomizer-service';

const atomizer = new AtomizerService();

// Mock the native module if needed or just test the public method if accessible.
// Since splitIntoMolecules is private, we'll verify via 'atomize' or we can temporarily make it public/export it?
// TypeScript private is soft, but for a clean test we'll use 'atomize' which calls it.

const longContent = "A".repeat(2500); // 2500 chars, should be split into 3 chunks (1024, 1024, 452)
const sourcePath = "test_large_file.txt";

async function run() {
    console.log("Testing Atomizer with 2500 char content...");
    try {
        const result = await atomizer.atomize(longContent, sourcePath, 'internal');
        console.log(`Molecules created: ${result.molecules.length}`);

        result.molecules.forEach((m, i) => {
            console.log(`Molecule ${i}: Length ${m.content.length}`);
        });

        if (result.molecules.length === 1 && result.molecules[0].content.length === 2500) {
            console.log("FAIL: Content was not split.");
        } else {
            const allUnderLimit = result.molecules.every(m => m.content.length <= 1024);
            if (allUnderLimit) {
                console.log("PASS: All molecules under 1024 chars.");
            } else {
                console.log("FAIL: Some molecules exceed limit.");
            }
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

run();
