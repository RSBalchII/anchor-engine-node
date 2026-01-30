import {
  initializeInference,
  runChatCompletion,
  runCompletion,
  getInferenceStatus,
  ChatRequest
} from './inference.js';

interface InferenceServiceOptions {
  modelPath?: string;
  contextSize?: number;
  gpuLayers?: number;
  temperature?: number;
  maxTokens?: number;
}

export class InferenceService {
  private model: any;
  private options: InferenceServiceOptions;

  constructor(options: InferenceServiceOptions = {}) {
    this.options = {
      contextSize: options.contextSize || 4096,
      gpuLayers: options.gpuLayers || 20,
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1024,
      ...options
    };
  }

  async initialize(): Promise<boolean> {
    try {
      const result = await initializeInference(this.options.modelPath, {
        contextSize: this.options.contextSize,
        gpuLayers: this.options.gpuLayers,
        temperature: this.options.temperature,
        maxTokens: this.options.maxTokens
      });

      if (result.success) {
        this.model = result.model;
        return true;
      } else {
        console.error('Failed to initialize inference service:', result.message);
        return false;
      }
    } catch (error) {
      console.error('Error initializing inference service:', error);
      return false;
    }
  }

  async generateResponse(prompt: string): Promise<string | null> {
    try {
      const result = await runCompletion(prompt, {
        contextSize: this.options.contextSize,
        gpuLayers: this.options.gpuLayers,
        temperature: this.options.temperature,
        maxTokens: this.options.maxTokens
      });

      if (result.success && result.response) {
        return result.response;
      } else {
        console.error('Failed to generate response:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error generating response:', error);
      return null;
    }
  }

  async chat(messages: Array<{ role: string; content: string }>, options: Partial<InferenceServiceOptions> & { grammar?: string } = {}): Promise<string | null> {
    try {
      const request: ChatRequest = {
        messages,
        model: this.options.modelPath,
        options: {
          contextSize: this.options.contextSize,
          gpuLayers: this.options.gpuLayers,
          temperature: options.temperature ?? this.options.temperature,
          maxTokens: this.options.maxTokens,
          ...options
        }
      };

      console.log(`\x1b[34m[Inference]\x1b[0m Processing chat request (${messages.length} messages)...`);
      const result = await runChatCompletion(request);

      if (result.success && result.response) {
        return result.response.content as string;
      } else {
        console.error('Failed to get chat response:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error in chat:', error);
      return null;
    }
  }

  getStatus(): { loaded: boolean; model?: string; error?: string } {
    return getInferenceStatus();
  }
}