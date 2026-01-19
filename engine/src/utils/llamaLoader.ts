
import { getLlama, LlamaChatSession, LlamaContext, LlamaModel } from 'node-llama-cpp';

let llama: any = null;

export async function getLlamaInstance() {
    if (!llama) {
        llama = await getLlama();
    }
    return llama;
}

export async function getLlamaComponents() {
    return {
        LlamaChatSession,
        LlamaContext,
        LlamaModel
    };
}
