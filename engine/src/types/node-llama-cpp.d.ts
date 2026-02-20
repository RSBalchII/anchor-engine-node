declare module 'node-llama-cpp' {
    export interface LlamaOptions {
        gpu?: {
            type: 'auto' | 'cuda' | 'vulkan' | 'metal';
            exclude?: Array<'cuda' | 'vulkan' | 'metal'>;
        };
    }

    export interface LlamaModelOptions {
        modelPath: string;
        gpuLayers?: number;
    }

    export interface LlamaContextOptions {
        contextSize?: number;
        batchSize?: number;
        sequences?: number;
        threads?: number;
    }

    export interface LlamaChatSessionOptions {
        contextSequence: any;
        systemPrompt?: string;
    }

    export interface LlamaGrammarOptions {
        grammar: string;
    }

    export interface LlamaPromptOptions {
        temperature?: number;
        maxTokens?: number;
        grammar?: LlamaGrammar;
        onTextChunk?: (chunk: string) => void;
        onToken?: (token: number) => void;
    }

    export class Llama {
        constructor(options?: LlamaOptions);
    }

    export class LlamaModel {
        dispose(): Promise<void>;
        createContext(options?: LlamaContextOptions): Promise<LlamaContext>;
        createEmbeddingContext(options?: any): Promise<LlamaEmbeddingContext>;
    }

    export class LlamaContext {
        contextSize: number;
        dispose(): Promise<void>;
        getSequence(): any;
    }

    export class LlamaEmbeddingContext {
        dispose(): Promise<void>;
        getEmbeddingFor(text: string): Promise<{ vector: Float32Array }>;
    }

    export class LlamaChatSession {
        constructor(options: LlamaChatSessionOptions);
        prompt(promptText: string, options?: LlamaPromptOptions): Promise<string>;
        dispose(): void;
    }

    export class LlamaGrammar {
        constructor(llama: Llama | any, options: LlamaGrammarOptions);
    }

    export function getLlama(options?: LlamaOptions): Promise<Llama>;
}
