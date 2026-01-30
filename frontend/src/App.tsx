
import { useState, useEffect, useCallback } from 'react';
import './index.css';
import PerformanceMonitor from './components/PerformanceMonitor';
import { api } from './services/api';
import { GlassPanel } from './components/ui/GlassPanel';
import { Button } from './components/ui/Button';
import { SearchColumn } from './components/features/SearchColumn';
import { ResearchModal } from './components/features/ResearchModal';
import { QuarantinePage } from './components/features/QuarantinePage';
import { ChatInterface } from './components/Chat/ChatInterface';
import { ModelSelector } from './components/Chat/ModelSelector';

// ...



// ... (existing imports)

// ... (existing imports)

// Simple Router
const Dashboard = () => (
  <div className="flex-col-center" style={{ height: '100%', justifyContent: 'center', alignItems: 'center', gap: '2rem' }}>
    <h1 style={{ fontSize: '3rem', background: 'linear-gradient(to right, #fff, #646cff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
      Sovereign Context Engine
    </h1>
    <div style={{ display: 'flex', gap: '1rem' }}>
      <Button onClick={() => window.location.hash = '#search'}>
        Search Memories
      </Button>
      <Button onClick={() => window.location.hash = '#chat'}>
        Launch Chat
      </Button>
      <Button onClick={() => window.location.hash = '#quarantine'}>
        Infection Center
      </Button>
    </div>
  </div>
);

// --- SEARCH PAGE CONTAINER ---
const SearchPage = () => {
  const [columns, setColumns] = useState<{ id: number; query?: string }[]>([{ id: 1 }]);
  // Context/FullText states tracked for Copy functionality,
  // but individual columns manage their own data now.
  const [columnContexts, setColumnContexts] = useState<Record<number, string>>({});
  const [columnFullTexts, setColumnFullTexts] = useState<Record<number, string>>({});

  // Global State
  const [backupStatus, setBackupStatus] = useState('');
  const [showResearch, setShowResearch] = useState(false);
  const [availableBuckets, setAvailableBuckets] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      api.getBuckets().catch(() => []),
      api.getTags().catch(() => [])
    ]).then(([buckets, tags]) => {
      setAvailableBuckets(Array.isArray(buckets) ? buckets : []);
      setAvailableTags(Array.isArray(tags) ? tags : []);
    });
  }, []);

  const addColumn = useCallback((initialQuery?: string) => {
    setColumns(prev => {
      if (prev.length >= 8) return prev;
      const newId = (prev.length > 0 ? Math.max(...prev.map(c => c.id)) : 0) + 1;
      return [...prev, { id: newId, query: initialQuery }];
    });
  }, []);

  const removeColumn = useCallback((id: number) => {
    console.log('[SearchPage] removeColumn called for ID:', id);
    setColumns(prev => prev.filter(c => c.id !== id));
    setColumnContexts(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setColumnFullTexts(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleContextUpdate = useCallback((id: number, ctx: string) => {
    setColumnContexts(prev => ({ ...prev, [id]: ctx }));
  }, []);

  const handleFullUpdate = useCallback((id: number, full: string) => {
    setColumnFullTexts(prev => ({ ...prev, [id]: full }));
  }, []);

  const copyContextWindow = async () => {
    const all = Object.values(columnContexts).filter(c => c && c.trim()).join('\n\n' + '='.repeat(40) + '\n\n');
    if (!all) return alert("No context to copy.");
    try {
      await navigator.clipboard.writeText(all);
      alert("Context Window (Limited) Copied!");
    } catch (e) {
      alert("Failed to copy. Ensure window is focused.");
    }
  };

  const copyFullResults = async () => {
    const all = Object.values(columnFullTexts).filter(c => c && c.trim()).join('\n\n' + '='.repeat(40) + '\n\n');
    if (!all) return alert("No results to copy.");
    try {
      await navigator.clipboard.writeText(all);
      alert("ALL Results (Unlimited) Copied!");
    } catch (e) {
      alert("Failed to copy. Ensure window is focused.");
    }
  };

  const handleBackup = async () => {
    setBackupStatus('Saving...');
    try {
      const data = await api.backup();
      setBackupStatus(`Saved: ${data.filename}`);
      setTimeout(() => setBackupStatus(''), 3000);
    } catch { setBackupStatus('Failed'); }
  };

  return (
    <GlassPanel className="search-page-container" style={{ margin: '1rem', padding: '1rem', height: 'calc(100% - 2rem)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* GLOBAL HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Memory Command</h2>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button onClick={() => window.location.hash = '#dashboard'} style={{ fontSize: '0.8rem', padding: '0.4rem', border: '1px solid var(--border-subtle)' }}>
            🏠 Home
          </Button>
          <Button onClick={() => window.location.hash = '#quarantine'} style={{ fontSize: '0.8rem', padding: '0.4rem', border: '1px solid var(--border-subtle)' }}>
            ☣️ Infection
          </Button>

          <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 0.5rem' }} />

          <Button onClick={handleBackup} style={{ fontSize: '0.8rem', padding: '0.4rem' }}>
            💾 {backupStatus || 'Backup'}
          </Button>
          <Button onClick={() => setShowResearch(true)} style={{ fontSize: '0.8rem', padding: '0.4rem' }}>
            🕵️ Research
          </Button>
          <Button onClick={async () => {
            const d = await api.dream();
            alert(`Dream Analyzed: ${d.analyzed}`);
          }} style={{ background: 'rgba(100, 108, 255, 0.1)', fontSize: '0.8rem', padding: '0.4rem' }}>
            🌙 Dream
          </Button>

          <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 0.5rem' }} />

          <Button onClick={copyContextWindow} style={{ fontSize: '0.8rem', padding: '0.4rem', border: '1px solid var(--accent-primary)' }}>
            📄 Copy Limit ({columns.length})
          </Button>
          <Button onClick={copyFullResults} style={{ fontSize: '0.8rem', padding: '0.4rem', border: '1px solid var(--accent-primary)' }}>
            📚 Copy All (∞)
          </Button>
          <Button onClick={() => addColumn()} disabled={columns.length >= 8} style={{ fontSize: '1rem', padding: '0.2rem 0.8rem', background: 'var(--accent-primary)', color: 'white' }}>
            +
          </Button>
        </div>
      </div>

      {/* COLUMNS CONTAINER */}
      <div className="search-grid">
        {columns.map(col => (
          <SearchColumn
            key={col.id}
            id={col.id}
            availableBuckets={availableBuckets}
            availableTags={availableTags}
            onContextUpdate={handleContextUpdate}
            onFullUpdate={handleFullUpdate}
            onRemove={removeColumn}
            onAddColumn={addColumn}
            isOnly={columns.length === 1}
            initialQuery={col.query}
          />
        ))}
      </div>

      {/* Research Modal */}
      {showResearch && <ResearchModal onClose={() => setShowResearch(false)} />}
    </GlassPanel>
  );
};



function App() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const [selectedModel, setSelectedModel] = useState<string>('glm-edge-1.5b-chat.Q5_K_M.gguf');

  if (!hash || hash === '#dashboard') return <Dashboard />;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#050507] overflow-hidden text-gray-300">
      <PerformanceMonitor />

      <div style={{ position: 'fixed', top: '1rem', left: '1rem', zIndex: 1000 }}>
        <Button onClick={() => window.location.hash = '#dashboard'} style={{ fontSize: '1.2rem', padding: '0.4rem 0.8rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
          ←
        </Button>
      </div>

      {hash === '#chat' ? (
        <GlassPanel className="chat-page-container" style={{ margin: '1rem', padding: '1rem', height: 'calc(100% - 2rem)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>Sovereign Agent Chat</h2>
            <div style={{ width: '300px' }}>
              <ModelSelector
                onModelChange={setSelectedModel}
                currentModel={selectedModel}
              />
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ChatInterface model={selectedModel} />
          </div>
        </GlassPanel>
      ) : (
        <>
          {hash === '#search' ? <SearchPage /> :
            hash === '#quarantine' ? <QuarantinePage /> :
              <div style={{ padding: '4rem 2rem' }}>🚧 Module "{hash}" Under Construction</div>}
        </>
      )}
    </div>
  );
}

export default App;
