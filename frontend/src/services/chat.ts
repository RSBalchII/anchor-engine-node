import type { Message } from '../types/chat';

export class ChatService {
    private abortController: AbortController | null = null;

    async sendMessage(
        content: string,
        onMessage: (message: Partial<Message>) => void,
        onError: (error: string) => void,
        onComplete: () => void,
        model?: string
    ) {
        if (this.abortController) {
            this.abortController.abort();
        }

        this.abortController = new AbortController();

        try {
            // First, get context for the user's query using molecule search
            // Split the query into sentence-like chunks and search each separately
            const moleculeResponse = await fetch('/v1/memory/molecule-search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: content,
                    max_chars: 2400, // 2400 tokens as specified
                    provenance: 'all'
                })
            });

            let context = '';
            if (moleculeResponse.ok) {
                const moleculeData = await moleculeResponse.json();
                context = moleculeData.context || '';
            }

            // Prepare messages with context
            const messages = [
                { role: 'system', content: `You are a helpful AI assistant. Use the following context to inform your responses:\n\n${context}` },
                { role: 'user', content }
            ];

            const requestBody: any = {
                messages
            };

            // Include model if provided
            if (model) {
                requestBody.model = model;
            }

            const response = await fetch('/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: this.abortController.signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error('No response body');

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = line.slice(6);
                            if (data.trim() === '[DONE]') continue;

                            const parsed = JSON.parse(data);

                            // Handle different response formats
                            let messageUpdate: Partial<Message>;

                            // Check if it's an OpenAI-compatible format (with choices array)
                            if (parsed.choices && parsed.choices[0]) {
                                const choice = parsed.choices[0];

                                // Only process if there's actual content to display
                                const content = choice.delta?.content || choice.message?.content || '';
                                if (content) {
                                    messageUpdate = {
                                        role: choice.delta?.role || choice.message?.role || 'assistant',
                                        content: content
                                    };

                                    onMessage(messageUpdate);
                                }
                            }
                            // Handle the custom event format (thought, tool_call, tool_result, etc.)
                            else if (parsed.type) {
                                if (['thought', 'tool_call', 'tool_result', 'answer'].includes(parsed.type)) {
                                    onMessage({
                                        role: parsed.type as any,
                                        content: typeof parsed.content === 'string'
                                            ? parsed.content
                                            : JSON.stringify(parsed.content || parsed.params || parsed.result || parsed),
                                        id: parsed.id
                                    });
                                } else {
                                    // Fallback for other types
                                    onMessage({
                                        role: 'assistant',
                                        content: parsed.content || JSON.stringify(parsed)
                                    });
                                }
                            }
                            // Handle the [DONE] signal
                            else if (parsed === '[DONE]' || (typeof parsed === 'object' && parsed.choices && parsed.choices[0]?.finish_reason === 'stop')) {
                                // This is a completion signal, don't send as a message
                                continue;
                            }
                            // Fallback for any other format
                            else {
                                messageUpdate = {
                                    role: 'assistant',
                                    content: parsed.content || JSON.stringify(parsed)
                                };
                                onMessage(messageUpdate);
                            }

                        } catch (e) {
                            console.error('Error parsing SSE:', e);
                        }
                    }
                }
            }

            onComplete();

        } catch (error: any) {
            if (error.name === 'AbortError') return;
            onError(error.message);
        } finally {
            this.abortController = null;
        }
    }

    abort() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }
}

export const chatService = new ChatService();
