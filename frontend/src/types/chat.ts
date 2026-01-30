export type MessageRole = 'user' | 'assistant' | 'system' | 'thought' | 'tool_call' | 'tool_result';

export interface Message {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: number;
    metadata?: any;
}

export interface ChatState {
    messages: Message[];
    isLoading: boolean;
    error: string | null;
}

export interface ToolCallParams {
    tool: string;
    params: any;
}
