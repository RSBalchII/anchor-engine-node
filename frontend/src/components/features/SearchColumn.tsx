import { useState, useEffect, memo, useCallback } from 'react';
import { api } from '../../services/api';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';

interface SearchColumnProps {
    id: number;
    availableBuckets: string[];
    availableTags: string[];
    onContextUpdate: (id: number, context: string) => void;
    onFullUpdate?: (id: number, fullText: string) => void;
    onRemove: (id: number) => void;
    onAddColumn: (query?: string) => void;
    initialQuery?: string;
    isOnly: boolean;
}

export const SearchColumn = memo(({
    id,
    availableBuckets,
    availableTags,
    onContextUpdate,
    onFullUpdate,
    onRemove,
    onAddColumn,
    isOnly,
    initialQuery
}: SearchColumnProps) => {
    const [query, setQuery] = useState(initialQuery || '');
    const [results, setResults] = useState<any[]>([]);
    const [context, setContext] = useState('');
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'cards' | 'raw'>('cards');

    // Feature State
    const [tokenBudget, setTokenBudget] = useState(2048);
    const [activeMode, setActiveMode] = useState(false);
    const [sovereignBias, setSovereignBias] = useState(true);
    const [metadata, setMetadata] = useState<any>(null);
    const [activeBuckets, setActiveBuckets] = useState<string[]>([]);
    const [activeTags, setActiveTags] = useState<string[]>([]);
    const [autoSplit, setAutoSplit] = useState(false);

    // Local Faceted Tags State
    const [localTags, setLocalTags] = useState<string[]>(availableTags);

    // Fetch tags when activeBuckets changes
    useEffect(() => {
        const fetchFacetedTags = async () => {
            try {
                // If no buckets selected, fall back to global availableTags (or fetch all)
                if (activeBuckets.length === 0) {
                    setLocalTags(availableTags);
                    return;
                }
                const tags = await api.getTags(activeBuckets);
                setLocalTags(Array.isArray(tags) ? tags : []);
            } catch (e) {
                console.error("Failed to fetch faceted tags", e);
            }
        };
        fetchFacetedTags();
    }, [activeBuckets, availableTags]);

    // Cleanup: Filter out Hex Codes
    const displayTags = localTags.filter(t => !/^#[0-9A-Fa-f]{6}$/.test(t) && !/^[0-9A-Fa-f]{6}$/.test(t));

    // Sync context to parent
    useEffect(() => {
        onContextUpdate(id, context);
    }, [context, id, onContextUpdate]);

    // Live Mode Debounce
    useEffect(() => {
        if (!activeMode) return;
        const timer = setTimeout(() => {
            if (query.trim()) {
                // Create a new array reference to force update
                setResults([]);
                handleSearch();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [query, activeMode, tokenBudget, sovereignBias, activeBuckets, activeTags]);

    const handleQuarantine = async (atomId: string) => {
        if (!confirm('Quarantine this atom? It will be tagged #manually_quarantined.')) return;

        // Create a new array to force re-render
        setResults(prev => prev.filter(r => r.id !== atomId));
        setMetadata((prev: any) => prev ? ({ ...prev, atomCount: prev.atomCount - 1 }) : null);

        try {
            await api.quarantineAtom(atomId);
        } catch (e) {
            console.error('Quarantine failed', e);
            alert('Failed to quarantine atom server-side.');
        }
    };

    const handleSearch = useCallback(async () => {
        if (!query.trim()) return;

        setLoading(true);
        // Force clear results with a new array reference to ensure UI update
        setResults([]);
        console.log(`[SearchColumn-${id}] Searching: "${query}" | Budget: ${tokenBudget}`);

        try {
            const data = await api.search({
                query: query,
                max_chars: tokenBudget * 4,
                token_budget: tokenBudget,
                provenance: sovereignBias ? 'internal' : 'all',
                buckets: activeBuckets,
                tags: activeTags
            });

            if (data.results) {
                // [Consistency] Sort by Date (Oldest to Newest) to match Agent RAG logic
                const sortedResults = data.results.sort((a: any, b: any) => {
                    return (a.timestamp || 0) - (b.timestamp || 0);
                });

                // [Consistency] Re-generate Context String to match Agent's view (~500 chars/item, ~8000 chars total)
                let currentLength = 0;
                const MAX_CONTEXT_CHARS = 8000;
                const formattedContextEntries = sortedResults.map((r: any) => {
                    if (currentLength >= MAX_CONTEXT_CHARS) return null;
                    const contentSnippet = r.content.substring(0, 500);
                    const dateStr = r.timestamp ? new Date(r.timestamp).toISOString() : 'unknown';
                    const entry = `- [${dateStr}] ${contentSnippet}...`;
                    if (currentLength + entry.length > MAX_CONTEXT_CHARS) return null;
                    currentLength += entry.length;
                    return entry;
                }).filter(Boolean);

                const newContextString = formattedContextEntries.join('\n');

                // Create a new array with unique identifiers to force re-render
                const updatedResults = sortedResults.map((result: any, index: number) => ({
                    ...result,
                    // Add a unique key that changes with each search to force re-render
                    _searchId: `${result.id || index}_${Date.now()}_${Math.random()}`
                }));

                setResults(updatedResults);
                setContext(newContextString); // Use our consistent context string
                setMetadata(data.metadata);

                // Explicitly sync to parent to ensure global Copy button works immediately
                onContextUpdate(id, newContextString);

                if (onFullUpdate) {
                    const fullText = (updatedResults || []).map((r: any) => `[${r.provenance}] ${r.source}:\n${r.content}`).join('\n\n');
                    onFullUpdate(id, fullText);
                }

                if (autoSplit && data.split_queries && data.split_queries.length > 0) {
                    data.split_queries.forEach((q: string) => {
                        setTimeout(() => onAddColumn(q), 100);
                    });
                }
            } else {
                // Create a new empty array to force update
                setResults([]);
                setContext('No results found.');
                setMetadata(null);
            }
        } catch (e) {
            console.error(e);
            setResults([]);
            setContext('Error searching memories.');
            setMetadata(null);
        } finally {
            setLoading(false);
        }
    }, [query, tokenBudget, sovereignBias, activeBuckets, activeTags, autoSplit, onAddColumn, onFullUpdate, id]);

    const copyContext = async () => {
        try {
            await navigator.clipboard.writeText(context);
            alert(`Context copied! (${context.length} chars)`);
        } catch (err) {
            console.error('Failed to copy keys: ', err);
            alert('Failed to copy to clipboard. Ensure window is focused.');
        }
    };

    return (
        <GlassPanel key={`search-column-${id}`} style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-secondary)', minWidth: '300px', overflow: 'hidden' }}>

            {/* Header: Filters & Buckets */}
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', maxWidth: '85%' }}>
                    {/* Dynamic Buckets (All available buckets) */}
                    {availableBuckets.filter(b => !/^\d{4}$/.test(b)).map(bucket => {
                        const isActive = activeBuckets.includes(bucket);
                        return (
                            <Button
                                key={`bucket-${id}-${bucket}`}
                                variant="primary"
                                style={{
                                    fontSize: '0.7rem', padding: '0.2rem 0.5rem',
                                    background: isActive ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                                    border: isActive ? 'none' : '1px solid var(--border-subtle)',
                                    opacity: isActive ? 1 : 0.6
                                }}
                                onClick={() => {
                                    setActiveBuckets(prev =>
                                        prev.includes(bucket)
                                            ? prev.filter(b => b !== bucket)
                                            : [...prev, bucket]
                                    );
                                }}
                            >
                                {(bucket || '').toUpperCase()}
                            </Button>
                        );
                    })}
                </div>

                {!isOnly && (
                    <Button key={`remove-btn-${id}`} variant="icon" onClick={() => onRemove(id)}>✕</Button>
                )}
            </div>

            {/* Advanced Toggles */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <Input
                    key={`live-toggle-${id}`}
                    variant="checkbox"
                    checked={activeMode}
                    onChange={(e) => setActiveMode(e.target.checked)}
                    label="Live"
                    style={{}}
                />
                <Input
                    key={`sov-toggle-${id}`}
                    variant="checkbox"
                    checked={sovereignBias}
                    onChange={(e) => setSovereignBias(e.target.checked)}
                    label="Sov"
                />
                <Input
                    key={`split-toggle-${id}`}
                    variant="checkbox"
                    checked={autoSplit}
                    onChange={(e) => setAutoSplit(e.target.checked)}
                    label="Split"
                    title="Automatically split complex queries into multiple columns"
                />

                <div style={{ flex: 1, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{tokenBudget} tks</span>
                    <Input
                        key={`budget-slider-${id}`}
                        variant="range"
                        min="512" max="131072" step="512"
                        value={tokenBudget}
                        onChange={(e) => setTokenBudget(parseInt(e.target.value))}
                    />
                </div>
            </div>

            {/* Usage Bar */}
            <div style={{ width: '100%', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                    width: `${metadata?.filledPercent || 0}%`, height: '100%',
                    background: 'linear-gradient(90deg, var(--accent-primary), #a855f7)',
                    transition: 'width 0.3s ease'
                }} />
            </div>
            {metadata && (
                <div key={`metadata-${id}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                    <span>Context: {metadata.tokenCount || 0} / {tokenBudget} tokens</span>
                    <span>{metadata.atomCount || 0} atoms included</span>
                </div>
            )}

            {/* Semantic Tags (Toggleable) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxHeight: '60px', overflowY: 'auto' }}>
                {displayTags.filter(t => !/^\d{4}$/.test(t) && t !== 'semantic_tag_placeholder').map(t => {
                    const isActive = activeTags.includes(t);
                    return (
                        <Button
                            key={`tag-${id}-${t}`}
                            variant="primary"
                            style={{
                                fontSize: '0.7rem', padding: '0.1rem 0.4rem',
                                borderRadius: '12px', // Pill shape for tags
                                background: isActive ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.03)',
                                border: isActive ? 'none' : '1px solid var(--border-subtle)',
                                color: isActive ? '#fff' : 'var(--text-dim)',
                                opacity: isActive ? 1 : 0.7
                            }}
                            onClick={() => {
                                setActiveTags(prev =>
                                    prev.includes(t)
                                        ? prev.filter(tag => tag !== t)
                                        : [...prev, t]
                                );
                            }}
                        >
                            #{t}
                        </Button>
                    );
                })}
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Input
                    key={`query-input-${id}`}
                    placeholder="Query..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                    style={{ fontSize: '0.9rem' }}
                />
                <Button key={`search-btn-${id}`} onClick={handleSearch} disabled={loading} style={{ padding: '0.4rem' }}>
                    🔍
                </Button>
                <Button
                    key={`viewmode-btn-${id}`}
                    onClick={() => setViewMode(viewMode === 'cards' ? 'raw' : 'cards')}
                    style={{ padding: '0.4rem', fontSize: '0.8rem', background: viewMode === 'raw' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)' }}
                    title="Toggle Raw/Cards View"
                >
                    {viewMode === 'cards' ? '📄' : '🃏'}
                </Button>
            </div>

            {/* Results */}
            <div key={`results-container-${id}`} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingRight: '0.3rem' }}>
                {viewMode === 'raw' ? (
                    <div style={{ position: 'relative', height: '100%' }}>
                        <Button
                            key={`copy-btn-${id}`}
                            onClick={copyContext}
                            style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', fontSize: '0.7rem', padding: '0.2rem 0.5rem', zIndex: 10 }}
                        >
                            Copy
                        </Button>
                        <textarea
                            key={`context-area-${id}`}
                            className="input-glass"
                            style={{ width: '100%', height: '100%', resize: 'none', fontFamily: 'monospace', fontSize: '0.95rem' }}
                            value={context} readOnly placeholder="Raw context..."
                        />
                    </div>
                ) : (
                    results.map((r, idx) => {
                        const isIncluded = metadata?.atomCount ? idx < metadata.atomCount : true;
                        return (
                            <div key={`${r._searchId || r.id || idx}-${id}`} className="card-result" style={{
                                padding: '0.8rem', fontSize: '0.9rem',
                                opacity: isIncluded ? 1 : 0.5,
                                borderLeft: isIncluded ? '2px solid var(--accent-primary)' : '2px solid transparent'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Badge variant={r.provenance === 'sovereign' ? 'sovereign' : 'external'} label={r.provenance || 'EXT'} />
                                        {!isIncluded && <span style={{ fontSize: '0.65rem', color: 'orange' }}>[Context Limit Reached]</span>}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{(r.score || 0).toFixed(1)}</span>
                                        <button onClick={() => handleQuarantine(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '0 0.2rem', minWidth: '24px' }}>🚫</button>
                                    </div>
                                </div>
                                <div style={{ maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>{r.content}</div>
                            </div>
                        );
                    })
                )}
                {results.length === 0 && !loading && (
                    <div key={`no-results-${id}`} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>No results</div>
                )}
                {loading && (
                    <div key={`loading-${id}`} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>Searching...</div>
                )}
            </div>
        </GlassPanel>
    );
});

// Add a display name for better debugging
SearchColumn.displayName = 'SearchColumn';