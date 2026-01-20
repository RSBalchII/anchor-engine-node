
/**
 * NER Teacher Service (BERT-based)
 *
 * Uses an ONNX-optimized BERT model to perform Named Entity Recognition.
 * Switched from GLiNER (unsupported architecture) to standard BERT NER.
 */

let nerPipeline: any = null;

export async function extractEntitiesWithGLiNER(text: string, _entities: string[] = []): Promise<string[]> {
    try {
        if (!nerPipeline) {
            console.log('[NER] Dynamically loading Transformers.js...');
            const { pipeline, env } = await import('@xenova/transformers');

            // Disable native dependencies that might cause crashes on Windows
            env.allowLocalModels = true;
            // Disable ONNX native backend that requires sharp
            env.backends.onnx['native'] = false;
            env.backends.onnx.wasm.proxy = false;
            env.backends.onnx.wasm.numThreads = 1;

            // Additional settings to avoid sharp
            env.useFS = false;
            env.useBrowserCache = false;

            console.log('[NER] Loading BERT NER model (Xenova/bert-base-NER)...');
            try {
                nerPipeline = await pipeline('token-classification', 'Xenova/bert-base-NER', {
                    quantized: true
                });
            } catch (e) {
                console.warn('[NER] Primary model failed. Trying fallback (Xenova/bert-base-multilingual-cased-ner-hrl)...');
                nerPipeline = await pipeline('token-classification', 'Xenova/bert-base-multilingual-cased-ner-hrl', {
                    quantized: true
                });
            }
            console.log('[NER] Model loaded successfully.');
        }

        // BERT NER returns entities with labels like B-PER, I-ORG, B-LOC, B-MISC
        // We extract the actual text (word) from each recognized entity
        const results = await nerPipeline(text);
        const discovered = new Set<string>();

        for (const res of results) {
            // Filter by confidence score and entity type
            // B- prefix means "Beginning of entity", I- means "Inside entity"
            if (res.score > 0.7 && res.entity && res.word) {
                // Clean up subword tokens (BERT uses ## prefix for subwords)
                const word = res.word.replace(/^##/, '').trim();
                if (word.length > 1) {
                    discovered.add(word);
                }
            }
        }

        console.log(`[NER] Discovered ${discovered.size} entities.`);
        return Array.from(discovered);
    } catch (e: any) {
        console.warn('[NER] Service Initialization Failed:', e.message);
        console.log('[NER] Falling back gracefully to LLM...');
        return [];
    }
}
