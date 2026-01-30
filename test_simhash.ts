
import { nativeModuleManager } from './engine/src/utils/native-module-manager.js';
import { AtomizerService } from './engine/src/services/ingest/atomizer-service.js';

async function test() {
    console.log("Testing SimHash...");

    // 1. Check Native Module Status
    const status = nativeModuleManager.getStatus('ece_native');
    console.log("Native Module Status:", JSON.stringify(status, null, 2));

    // 2. Test Fingerprint
    const text1 = "The quick brown fox jumps over the lazy dog";
    const text2 = "The quick brown fox jumped over the lazy dog"; // Slight change
    const text3 = "Something completely different";

    const atomizer = new AtomizerService();
    // @ts-ignore - Accessing private method via cast or just trusting it calls native
    // But wait, generateSimHash is private.
    // I can try to access the native fingerprint directly if exposed via manager?
    // No, manager returns the module.

    const native = nativeModuleManager.loadNativeModule('ece_native', 'ece_native.node');

    if (native && native.fingerprint) {
        try {
            const h1 = native.fingerprint(text1);
            const h2 = native.fingerprint(text2);
            const h3 = native.fingerprint(text3);

            console.log(`Hash 1: ${h1.toString(16)} (Type: ${typeof h1})`);
            console.log(`Hash 2: ${h2.toString(16)}`);
            console.log(`Hash 3: ${h3.toString(16)}`);

            // Check distance
            if (native.distance) {
                console.log(`Dist(1,2): ${native.distance(h1, h2)} (Should be small)`);
                console.log(`Dist(1,3): ${native.distance(h1, h3)} (Should be large)`);
            } else {
                console.log("Native distance function missing.");
            }
        } catch (e) {
            console.error("Error executing native fingerprint:", e);
        }
    } else {
        console.log("Native fingerprint function not available.");
    }
}

test();
