import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface TerminalLine {
  id: string;
  content: string;
  type: 'input' | 'output' | 'error' | 'info';
  timestamp: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
}

export interface GraphLink {
  source: string;
  target: string;
  strength?: number;
}

interface ThreeColumnContextType {
  // Terminal state
  terminalHistory: TerminalLine[];
  addTerminalLine: (content: string, type: TerminalLine['type']) => void;
  clearTerminal: () => void;
  
  // Graph state
  graphNodes: GraphNode[];
  graphLinks: GraphLink[];
  updateGraphData: (nodes: GraphNode[], links: GraphLink[]) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  
  // File viewer state
  currentFile: { name: string; content: string; language: string } | null;
  setCurrentFile: (file: { name: string; content: string; language: string } | null) => void;
}

const ThreeColumnContext = createContext<ThreeColumnContextType | undefined>(undefined);

export const ThreeColumnProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Terminal state
  const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>([
    { id: '1', content: 'Welcome to the Neural Shell v3.0', type: 'info', timestamp: Date.now() },
    { id: '2', content: 'Protocol: /v1/terminal/exec | Status: Ready', type: 'info', timestamp: Date.now() },
    { id: '3', content: '----------------------------------------', type: 'output', timestamp: Date.now() },
  ]);

  const addTerminalLine = (content: string, type: TerminalLine['type']) => {
    const newLine: TerminalLine = {
      id: Date.now().toString(),
      content,
      type,
      timestamp: Date.now()
    };
    setTerminalHistory(prev => [...prev, newLine]);
  };

  const clearTerminal = () => {
    setTerminalHistory([
      { id: '1', content: 'Welcome to the Neural Shell v3.0', type: 'info', timestamp: Date.now() },
      { id: '2', content: 'Protocol: /v1/terminal/exec | Status: Ready', type: 'info', timestamp: Date.now() },
      { id: '3', content: '----------------------------------------', type: 'output', timestamp: Date.now() },
    ]);
  };

  // Graph state
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([
    { id: 'search', label: 'context', type: 'search', x: 400, y: 300, size: 20, color: '#646cff' },
    { id: 'atom1', label: 'Project Notes', type: 'document', x: 200, y: 150, size: 15, color: '#22d3ee' },
    { id: 'atom2', label: 'Code Snippet', type: 'code', x: 600, y: 150, size: 15, color: '#8b5cf6' },
    { id: 'atom3', label: 'Research Paper', type: 'document', x: 200, y: 450, size: 15, color: '#22d3ee' },
    { id: 'atom4', label: 'Configuration', type: 'config', x: 600, y: 450, size: 15, color: '#10b981' },
    { id: 'tag1', label: '#typescript', type: 'tag', x: 300, y: 100, size: 12, color: '#f59e0b' },
    { id: 'tag2', label: '#ai', type: 'tag', x: 500, y: 100, size: 12, color: '#f59e0b' },
    { id: 'tag3', label: '#graph', type: 'tag', x: 300, y: 500, size: 12, color: '#f59e0b' },
    { id: 'tag4', label: '#memory', type: 'tag', x: 500, y: 500, size: 12, color: '#f59e0b' },
  ]);
  const [graphLinks, setGraphLinks] = useState<GraphLink[]>([
    { source: 'search', target: 'atom1', strength: 0.8 },
    { source: 'search', target: 'atom2', strength: 0.7 },
    { source: 'search', target: 'atom3', strength: 0.6 },
    { source: 'search', target: 'atom4', strength: 0.5 },
    { source: 'atom1', target: 'tag1', strength: 0.9 },
    { source: 'atom1', target: 'tag2', strength: 0.6 },
    { source: 'atom2', target: 'tag1', strength: 0.7 },
    { source: 'atom2', target: 'tag2', strength: 0.8 },
    { source: 'atom3', target: 'tag3', strength: 0.9 },
    { source: 'atom3', target: 'tag4', strength: 0.6 },
    { source: 'atom4', target: 'tag3', strength: 0.7 },
    { source: 'atom4', target: 'tag4', strength: 0.8 },
  ]);
  const [searchTerm, setSearchTerm] = useState<string>('context');

  const updateGraphData = (nodes: GraphNode[], links: GraphLink[]) => {
    setGraphNodes(nodes);
    setGraphLinks(links);
  };

  // File viewer state
  const [currentFile, setCurrentFile] = useState<{ name: string; content: string; language: string } | null>(null);

  const contextValue: ThreeColumnContextType = {
    terminalHistory,
    addTerminalLine,
    clearTerminal,
    graphNodes,
    graphLinks,
    updateGraphData,
    searchTerm,
    setSearchTerm,
    currentFile,
    setCurrentFile
  };

  return (
    <ThreeColumnContext.Provider value={contextValue}>
      {children}
    </ThreeColumnContext.Provider>
  );
};

export const useThreeColumnContext = () => {
  const context = useContext(ThreeColumnContext);
  if (context === undefined) {
    throw new Error('useThreeColumnContext must be used within a ThreeColumnProvider');
  }
  return context;
};