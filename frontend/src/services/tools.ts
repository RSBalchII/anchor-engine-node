/**
 * Standard Tool Definitions for ECE
 * Implements OpenAI-compatible function calling interface
 */

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

export interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string; // JSON string
  };
  type: 'function';
}

export interface ToolResult {
  tool_call_id: string;
  type: 'function';
  function: {
    name: string;
    output: string;
  };
}

// Available tools that are compatible with OpenAI specification
export const AVAILABLE_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_memory',
      description: 'Search the ECE knowledge base for relevant memories',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query'
          },
          max_results: {
            type: 'number',
            description: 'Maximum number of results to return (default: 10)',
            default: 10
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file from the filesystem',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The path to the file to read'
          }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'List files in a directory',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The path to the directory to list'
          }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_current_time',
      description: 'Get the current time and date',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  }
];

/**
 * Execute a tool call based on its name and parameters
 */
export async function executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
  const { name, arguments: argsStr } = toolCall.function;
  
  try {
    const args = JSON.parse(argsStr);
    
    switch (name) {
      case 'search_memory':
        return {
          tool_call_id: toolCall.id,
          type: 'function',
          function: {
            name,
            output: await executeSearchMemory(args.query, args.max_results || 10)
          }
        };
        
      case 'read_file':
        return {
          tool_call_id: toolCall.id,
          type: 'function',
          function: {
            name,
            output: await executeReadFile(args.path)
          }
        };
        
      case 'list_directory':
        return {
          tool_call_id: toolCall.id,
          type: 'function',
          function: {
            name,
            output: await executeListDirectory(args.path)
          }
        };
        
      case 'get_current_time':
        return {
          tool_call_id: toolCall.id,
          type: 'function',
          function: {
            name,
            output: new Date().toISOString()
          }
        };
        
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      tool_call_id: toolCall.id,
      type: 'function',
      function: {
        name,
        output: `Error executing tool ${name}: ${(error as Error).message}`
      }
    };
  }
}

/**
 * Execute search in memory
 */
async function executeSearchMemory(query: string, maxResults: number): Promise<string> {
  try {
    const response = await fetch('/v1/memory/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: maxResults,
        provenance: 'all'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return JSON.stringify(data.results || []);
  } catch (error) {
    return `Search error: ${(error as Error).message}`;
  }
}

/**
 * Execute file read operation
 */
async function executeReadFile(filePath: string): Promise<string> {
  try {
    // This would need a backend endpoint to securely read files
    const response = await fetch('/v1/files/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: filePath })
    });
    
    if (!response.ok) {
      throw new Error(`File read failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.content || 'File content not available';
  } catch (error) {
    return `File read error: ${(error as Error).message}`;
  }
}

/**
 * Execute directory listing
 */
async function executeListDirectory(dirPath: string): Promise<string> {
  try {
    // This would need a backend endpoint to securely list directories
    const response = await fetch('/v1/files/list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: dirPath })
    });
    
    if (!response.ok) {
      throw new Error(`Directory listing failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return JSON.stringify(data.files || []);
  } catch (error) {
    return `Directory listing error: ${(error as Error).message}`;
  }
}