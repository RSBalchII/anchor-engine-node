import React, { useState, useRef, useEffect } from 'react';
import { chatService } from '../../services/chat';
import type { Message, ChatState } from '../../types/chat';
import { Button } from '../ui/Button';
import { ThoughtLog } from '../Agent/ThoughtLog';

interface ChatInterfaceProps {
    model?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ model }) => {
    const [state, setState] = useState<ChatState>({
        messages: [],
        isLoading: false,
        error: null
    });
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [state.messages]);

    const handleSend = async () => {
        if (!input.trim() || state.isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: Date.now()
        };

        setState(prev => ({
            ...prev,
            messages: [...prev.messages, userMsg],
            isLoading: true,
            error: null
        }));
        setInput('');

        await chatService.sendMessage(
            input,
            (update) => {
                setState(prev => {
                    const lastMsg = prev.messages[prev.messages.length - 1];
                    const isNewMessage = !lastMsg || lastMsg.role !== update.role || (update.id && lastMsg.id !== update.id);

                    // Content streams into the last message if it's the same role/id
                    if (!isNewMessage && update.content) {
                        const updatedMsgs = [...prev.messages];
                        updatedMsgs[updatedMsgs.length - 1] = {
                            ...lastMsg,
                            content: lastMsg.content + update.content
                        };
                        return { ...prev, messages: updatedMsgs };
                    }

                    const newMsg: Message = {
                        id: update.id || (Date.now().toString() + Math.random()),
                        role: (update.role as any) || 'assistant',
                        content: update.content || '',
                        timestamp: Date.now()
                    };

                    return { ...prev, messages: [...prev.messages, newMsg] };
                });
            },
            (error) => setState(prev => ({ ...prev, isLoading: false, error })),
            () => setState(prev => ({ ...prev, isLoading: false })),
            model
        );
    };


    return (
        <div className="flex flex-col h-full">
            {/* Messages Area - Matching Search UI aesthetic */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/20">
                {state.messages.reduce((acc: React.ReactNode[], msg, idx, array) => {
                    const isAssistant = msg.role === 'assistant';
                    const isThought = msg.role === 'thought' || msg.role === 'tool_call' || msg.role === 'tool_result';

                    // Group consecutive thoughts/tools
                    if (isThought) {
                        const previousWasThought = idx > 0 &&
                            (array[idx - 1].role === 'thought' || array[idx - 1].role === 'tool_call' || array[idx - 1].role === 'tool_result');

                        if (previousWasThought) return acc; // Skip, will be handled by the first thought in the cluster

                        const thoughtCluster = [msg];
                        for (let i = idx + 1; i < array.length; i++) {
                            if (array[i].role === 'thought' || array[i].role === 'tool_call' || array[i].role === 'tool_result') {
                                thoughtCluster.push(array[i]);
                            } else {
                                break;
                            }
                        }

                        acc.push(
                            <ThoughtLog
                                key={`thought-${idx}`}
                                thoughts={thoughtCluster}
                                isActive={state.isLoading && idx === array.length - thoughtCluster.length}
                            />
                        );
                        return acc;
                    }

                    if (isAssistant || msg.role === 'user') {
                        acc.push(
                            <div key={msg.id} className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
                                <div className={`relative max-w-[85%] p-4 rounded-2xl text-sm ${isAssistant
                                    ? 'bg-[#15151a] border border-cyan-500/30 text-cyan-50 font-mono shadow-[0_0_15px_rgba(6,182,212,0.05)]'
                                    : 'bg-gradient-to-br from-cyan-600 to-cyan-700 text-white shadow-lg'
                                    }`}>
                                    {/* Tail for assistant */}
                                    {isAssistant && (
                                        <div className="absolute -left-2 top-4 w-4 h-4 bg-[#15151a] border-l border-t border-cyan-500/30 rotate-[-45deg]" />
                                    )}

                                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-40 mb-2 flex justify-between">
                                        <span>{isAssistant ? 'Sovereign' : 'Operator'}</span>
                                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                                </div>
                            </div>
                        );
                    }

                    return acc;
                }, [])}

                {state.error && (
                    <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-200 text-[10px] font-mono">
                        [CRITICAL_ERROR] {state.error}
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Matching Search UI aesthetic */}
            <div className="p-3 bg-gray-900/50 border-t border-gray-800/50">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Ask a question or assign a task..."
                        className="flex-1 bg-black/50 border border-gray-700/50 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 font-mono text-sm text-cyan-100 placeholder-gray-600"
                        disabled={state.isLoading}
                    />
                    <Button
                        onClick={handleSend}
                        disabled={state.isLoading || !input.trim()}
                        className={`px-4 py-2 font-mono text-xs uppercase tracking-wider border ${!input.trim() || state.isLoading
                            ? 'opacity-50 cursor-not-allowed border-gray-700/50'
                            : 'border-cyan-500/50 hover:shadow-[0_0_10px_rgba(6,182,212,0.2)] text-cyan-400'
                            }`}
                    >
                        {state.isLoading ? 'THINK...' : 'SEND'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
