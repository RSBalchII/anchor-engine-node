import { nativeModuleManager } from '../utils/native-module-manager.js';
import { InferenceService } from '../services/inference/inference-service.js';

export type AgentEvent =
  | { type: 'thought'; content: string; id?: string }
  | { type: 'token'; content: string }
  | { type: 'answer'; content: string }
  | { type: 'error'; content: string };

interface AgentRuntimeOptions {
  model?: string;
  verbose?: boolean;
  maxIterations?: number;
  onEvent?: (event: AgentEvent) => void;
  messages?: Array<{role: string, content: string}>;
}

export class AgentRuntime {
  private native: any;
  private inferenceService: InferenceService;
  private verbose: boolean;
  private maxIterations: number;
  private onEvent?: (event: AgentEvent) => void;
  private messages?: Array<{role: string, content: string}>;

  constructor(options: AgentRuntimeOptions = {}) {
    this.verbose = options.verbose ?? false;
    this.maxIterations = options.maxIterations ?? 4;
    this.onEvent = options.onEvent;
    this.messages = options.messages;

    // Load the native module (kept for legacy/potential future needs)
    this.native = nativeModuleManager.loadNativeModule('ece_native', 'ece_native.node');

    // Initialize inference service
    this.inferenceService = new InferenceService({
      modelPath: options.model
    });
  }

  private emit(event: AgentEvent) {
    if (this.onEvent) {
      this.onEvent(event);
    }

    if (this.verbose) {
      switch (event.type) {
        case 'thought':
          process.stdout.write(`\x1b[36m[Thought ${event.id || ''}]\x1b[0m ${event.content}`);
          break;
        case 'token':
          process.stdout.write(event.content);
          break;
        case 'answer':
          console.log(`\n\x1b[35m[Answer]\x1b[0m ${event.content}`);
          break;
        case 'error':
          console.log(`\x1b[31m[Error]\x1b[0m ${event.content}`);
          break;
      }
    }
  }

  /**
   * Basic Chat Flow (User Requested Validation Mode)
   * Context -> User Prompt -> Model -> Stream Output
   * Uses provided context instead of chat session history.
   */
  async runLoop(objective: string): Promise<string> {
    if (this.verbose) {
      console.log(`[AgentRuntime] Starting Basic Chat for: "${objective}"`);
    }

    let fullAnswer = "";

    // Use provided contextual messages if available, otherwise use default
    const chatMessages = this.messages && this.messages.length > 0
      ? this.messages
      : [
          { role: 'system', content: "You are a helpful AI assistant." },
          { role: 'user', content: objective }
        ];

    // Direct Chat Call with contextual messages
    await this.inferenceService.chat(chatMessages, {
      temperature: 0.7,
      onToken: (token: string) => {
        fullAnswer += token;
        // Stream directly to frontend as 'token'
        this.emit({ type: 'token', content: token });
      }
    } as any);

    this.emit({ type: 'answer', content: fullAnswer });
    return fullAnswer;
  }
}