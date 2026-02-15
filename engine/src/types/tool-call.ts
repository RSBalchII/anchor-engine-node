/**
 * ToolCall interface definition
 * Defines the structure for tool calls that can be executed by the agent
 */

export interface ToolCall {
  tool: string;
  params: {
    [key: string]: any;
  };
}

export interface ToolResponse {
  success: boolean;
  result: any;
  error?: string;
}