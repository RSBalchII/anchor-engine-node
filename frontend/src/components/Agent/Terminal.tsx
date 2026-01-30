import React, { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import { useThreeColumnContext } from '../../contexts/ThreeColumnContext';

export const Terminal: React.FC = () => {
  const { terminalHistory, addTerminalLine, clearTerminal } = useThreeColumnContext();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Focus input on mount and when clicked
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll to bottom when history changes
  useEffect(() => {
    outputRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalHistory]);

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;

    // Handle special commands locally first
    if (command.trim().toLowerCase() === 'clear') {
      // Clear the terminal history using the context function
      clearTerminal();
      return;
    }

    // Add user command to history
    addTerminalLine(`$ ${command}`, 'input');

    setIsLoading(true);

    try {
      // Call the backend API to execute the command
      const response = await fetch('/v1/terminal/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.stdout) {
        addTerminalLine(data.stdout, 'output');
      }
      if (data.stderr) {
        addTerminalLine(data.stderr, 'error');
      }
      if (data.error) {
        addTerminalLine(`Terminal Error: ${data.error}`, 'error');
      }
    } catch (error) {
      console.error('Terminal execution error:', error);
      addTerminalLine(`Network Error: ${(error as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
      // Maintain focus on the input after command execution
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      executeCommand(inputValue.trim());
      setInputValue('');
    }
    // Keep focus on the input after submitting
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e as any);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/40 text-white rounded-lg overflow-hidden border border-cyan-500/20 shadow-[0_0_20px_rgba(0,0,0,0.5)] font-sans">
      {/* Header / Status Bar */}
      <div className="p-3 bg-cyan-500/5 border-b border-cyan-500/30 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="px-2 py-0.5 border border-cyan-400/50 rounded text-[9px] font-mono text-cyan-400 uppercase tracking-widest bg-cyan-400/10">
            Neural Shell // Active Terminal
          </div>
        </div>
        <div className="flex gap-1">
          <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}
               title={isLoading ? "Executing..." : "Ready"} />
        </div>
      </div>

      {/* Terminal Output Area */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-black/20 font-mono text-sm"
        onClick={() => inputRef.current?.focus()}
      >
        {terminalHistory.map((line) => (
          <div
            key={line.id}
            className={`whitespace-pre-wrap ${
              line.type === 'input' ? 'text-white font-bold' :
              line.type === 'error' ? 'text-red-400' :
              line.type === 'info' ? 'text-cyan-400' :
              'text-gray-300'
            }`}
          >
            {line.content}
          </div>
        ))}
        <div ref={outputRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 bg-gray-900/80 border-t border-gray-800 backdrop-blur-md">
        <div className="flex gap-2">
          <div className="text-cyan-400 font-mono text-sm">$</div>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e as any)}
            placeholder="Enter shell command (e.g. 'ls', 'cat file.txt')..."
            className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 font-mono text-sm text-cyan-100 placeholder-gray-600"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className={`px-4 font-mono uppercase tracking-wider text-xs transition-all ${
              !inputValue.trim() || isLoading
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] text-cyan-400'
            }`}
          >
            {isLoading ? 'RUNNING...' : 'EXEC'}
          </button>
        </div>
      </form>
    </div>
  );
};