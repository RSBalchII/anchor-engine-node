/**
 * Inference Service for Sovereign Context Engine
 * 
 * Handles all LLM inference operations including model loading,
 * chat sessions, and token streaming using the unified Worker Provider.
 */

import config from '../../config/index.js';
import { loadModel, runSideChannel, initAutoLoad } from '../llm/provider.js';

// Define interfaces
export interface InferenceOptions {
  model?: string;
  contextSize?: number;
  gpuLayers?: number;
  temperature?: number;
  maxTokens?: number;
  grammar?: string;
  onToken?: (token: string) => void;
}



export interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  options?: InferenceOptions;
}

/**
 * Initialize the inference engine with the specified model
 * Uses the Provider's initAutoLoad or specific loadModel mechanism.
 */
export async function initializeInference(modelPath?: string, options: InferenceOptions = {}): Promise<{ success: boolean; message: string; model?: any }> {
  try {
    console.log('[InferenceService] Initializing via Provider...');

    // If a specific path is requested, try to load it
    if (modelPath) {
      await loadModel(modelPath, {
        ctxSize: options.contextSize,
        gpuLayers: options.gpuLayers
      }, 'chat');
    } else {
      // Otherwise use the auto-loader (which reads user_settings.json)
      await initAutoLoad();
    }

    return {
      success: true,
      message: 'Inference engine initialized successfully (Worker Backend)',
      model: 'Worker'
    };
  } catch (error: any) {
    console.error(`[InferenceService] Initialization failed: ${error.message}`);
    return {
      success: false,
      message: `Failed to initialize inference engine: ${error.message}`
    };
  }
}

/**
 * Run a chat completion using the Provider's SideChannel (or StreamingChat)
 * We use runSideChannel for non-streaming agentic thoughts to avoid clogging the main chat worker if possible,
 * OR we reuse the main chat worker if that's the only one loaded.
 */
export async function runChatCompletion(request: ChatRequest): Promise<{ success: boolean; response?: any; error?: string }> {
  try {
    // Construct the prompt for the side channel
    // runSideChannel expects a string prompt, but also supports raw chat if the worker handles it.
    // However, provider.ts runSideChannel signature is (prompt, systemInstruction, options)

    // We need to extract the last user message and the system prompt
    const messages = request.messages;
    const systemMsg = messages.find(m => m.role === 'system');
    const systemPrompt = systemMsg ? systemMsg.content : "You are a helpful assistant.";

    // Combine the non-system messages into a history-aware prompt or pass them if the provider supports it.
    // The current provider implementation takes a prompt string.

    let prompt = "";
    const lastMsg = messages[messages.length - 1];

    // If there is history, we should try to include it, but the provider.ts side channel is stateless.
    // For the Agent Ouroboros loop, it typically passes "Objective + Context" as the system prompt + "Action" as user prompt.
    // So simple prompt passing is likely sufficient for Phase 2/3.

    if (lastMsg.role === 'user') {
      prompt = lastMsg.content;
    } else {
      // Fallback for non-standard calls
      prompt = JSON.stringify(messages);
    }

    const responseText = await runSideChannel(
      prompt,
      systemPrompt,
      {
        temperature: request.options?.temperature ?? 0.7,
        maxTokens: request.options?.maxTokens ?? 1024,
        grammar: request.options?.grammar,
        onToken: request.options?.onToken
      },
      request.model
    );

    if (!responseText) {
      throw new Error("Empty response from Provider");
    }

    return {
      success: true,
      response: {
        role: 'assistant',
        content: responseText
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Run a simple text completion
 */
export async function runCompletion(prompt: string, options: InferenceOptions = {}): Promise<{ success: boolean; response?: string; error?: string }> {
  try {
    const result = await runSideChannel(prompt, "You are a completion engine.", options);

    if (result) {
      return {
        success: true,
        response: result as string
      };
    } else {
      return {
        success: false,
        error: 'Unknown error occurred'
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get the current status of the inference engine
 */
export function getInferenceStatus(): { loaded: boolean; model?: string; error?: string } {
  // We need to check if provider has loaded models.
  // provider.ts doesn't export a simple status check, but we can verify if workers are init.
  // For now, we'll assume if initAutoLoad finished, we are good.
  return {
    loaded: true,
    model: 'Worker-managed',
    error: undefined
  };
}