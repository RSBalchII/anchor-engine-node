import React, { useState } from 'react';

interface SourceViewerProps {
  fileName?: string;
  content?: string;
  language?: string;
}

export const SourceViewer: React.FC<SourceViewerProps> = ({ 
  fileName = 'Selected File Preview', 
  content = 'No file selected. When the agent accesses files, they will appear here for review.', 
  language = 'text'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Simple syntax highlighting based on language
  const getSyntaxHighlighting = (text: string, lang: string) => {
    if (lang === 'json') {
      try {
        return JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        return text;
      }
    }
    return text;
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0a0c] border border-gray-800/50 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-gray-800/50 flex justify-between items-center bg-gray-900/20">
        <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 truncate max-w-[200px]">
          {fileName}
        </span>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[8px] font-mono text-gray-500 hover:text-gray-300 px-2 py-1 border border-gray-700 rounded"
          >
            {isExpanded ? 'COLLAPSE' : 'EXPAND'}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className={`flex-1 overflow-auto font-mono text-xs p-3 ${isExpanded ? 'h-[600px]' : ''}`}>
        <pre className="whitespace-pre-wrap break-words text-gray-300">
          {getSyntaxHighlighting(content, language)}
        </pre>
      </div>

      {/* Footer with stats */}
      <div className="p-2 border-t border-gray-800/50 bg-gray-900/10 text-[8px] font-mono text-gray-500 flex justify-between">
        <span>PREVIEW MODE</span>
        <span>{content.length} chars</span>
      </div>
    </div>
  );
};