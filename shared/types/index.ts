/**
 * Core Data Structures for Sovereign Context Engine
 * Source of Truth for both Engine and Desktop Overlay
 */

// ------------------------------------------------------------------
// CONFIGURATION TYPES
// ------------------------------------------------------------------

export interface ILLMConfig {
    active: boolean;
    path: string;
    context_size: number;
    gpu_layers: number;
    temperature?: number;
    projector_path?: string;
}

export interface IAppConfig {
    system_name: string;
    ui: {
        theme: 'dark' | 'light' | 'system';
        transparency: boolean;
        always_on_top: boolean;
        shortcuts: {
            toggle_overlay: string;
        };
    };
    models: {
        orchestrator: ILLMConfig;
        main: ILLMConfig;
        vision: ILLMConfig;
    };
    storage: {
        db_path: string;
        backup_path: string;
    };
    network: {
        api_port: number;
        websocket_port: number;
    };
}

// ------------------------------------------------------------------
// DATA TYPES
// ------------------------------------------------------------------

export type ContextSource = 'file' | 'clipboard' | 'vision' | 'audio' | 'web';

export interface IContextItem {
    id: string;            // UUID
    content: string;       // The raw text/content
    source: ContextSource; // Where did it come from?
    timestamp: number;     // Unix Epoch
    metadata: {
        filePath?: string;
        windowTitle?: string;
        url?: string;
        tags?: string[];
    };
    embedding?: number[];  // Vector representation (optional on client)
}

export interface IChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    thoughts?: string;     // Chain of thought (reasoning)
}
