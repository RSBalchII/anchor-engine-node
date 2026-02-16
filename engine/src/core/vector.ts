import path from 'path';
import fs from 'fs';
import { pathManager } from '../utils/path-manager.js';

// Define interface locally to decouple from package presence
interface ISoulIndex {
    add(id: number, vector: number[] | Float32Array): void;
    search(vector: number[] | Float32Array, limit: number): { ids: number[], distances: number[] };
    save(path: string): void;
    view(path: string): void;
    size(): number;
    close(): void;
}

// Mock implementation for fallback when native module fails
class MockSoulIndex implements ISoulIndex {
    constructor(public dimensions: number) {
        console.warn('[Vector] Using Mock SoulIndex (Native module missing or failed). Vector search is disabled.');
    }
    add(id: number, vector: number[] | Float32Array): void { }
    search(vector: number[] | Float32Array, limit: number): { ids: number[], distances: number[] } {
        return { ids: [], distances: [] };
    }
    save(path: string): void { }
    view(path: string): void { }
    size(): number { return 0; }
    close(): void { }
}

export class VectorService {
    // Use 'any' or intersection to allow both real and mock types since they share the shape
    private index: ISoulIndex | null = null;
    private dimensions: number = 768; // Default embedding size
    private indexName: string = 'memory.index';
    private _isInitialized: boolean = false;

    constructor() {
        // Lazy init
    }

    get isInitialized(): boolean {
        return this._isInitialized;
    }

    /**
     * Initialize the vector index.
     * Tries to mmap existing index, or creates a new one.
     */
    public async init(): Promise<void> {
        if (this._isInitialized) return;

        try {
            console.log('[Vector] Initializing Native Vector Engine...');

            // Dynamic import to prevent crash if binding is missing
            // Dynamic import to prevent crash if binding is missing
            /*
            let SoulIndexClass: any;
            try {
                const module = await import('@rbalchii/native-vector');
                SoulIndexClass = module.SoulIndex;
                console.log('[Vector] Native module loaded successfully.');
            } catch (e) {
                console.warn('[Vector] Native module load failed. Falling back to Mock.', e);
                SoulIndexClass = MockSoulIndex;
            }
            */
            console.warn('[Vector] Native Vector disabled (removed). Using Mock.');
            const SoulIndexClass = MockSoulIndex;

            this.index = new SoulIndexClass(this.dimensions);

            // If we are using the mock, we don't need to do file operations
            if (this.index instanceof MockSoulIndex) {
                this._isInitialized = true;
                return;
            }

            const indexPath = this.getIndexPath();

            if (fs.existsSync(indexPath)) {
                console.log(`[Vector] Loading existing index from ${indexPath}`);
                // Use view for instant mmap loading
                try {
                    this.index!.view(indexPath);
                    console.log(`[Vector] Loaded index with ${this.index!.size()} vectors.`);
                } catch (e) {
                    console.warn(`[Vector] Failed to view index, it might be corrupt or empty. Creating new.`, e);
                    // If view fails, we might want to delete it and start fresh or just proceed with empty in-memory
                    // For now, proceeding with validation
                }
            } else {
                console.log(`[Vector] No existing index found at ${indexPath}. Starting fresh.`);
                // Ensure directory exists
                const dir = path.dirname(indexPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
            }

            this._isInitialized = true;
        } catch (e) {
            console.error('[Vector] Failed to initialize Vector Engine:', e);
            // Fallback to mock even if init logic fails elsewhere
            this.index = new MockSoulIndex(this.dimensions);
            this._isInitialized = true;
        }
    }

    /**
     * Add a vector to the index.
     * @param id Unique Integer ID (mapped from UUID via DB)
     * @param vector Float32Array
     */
    public add(id: number, vector: number[] | Float32Array): void {
        if (!this.index) throw new Error('Vector Engine not initialized');
        this.index.add(id, vector);
    }

    /**
     * Search for nearest neighbors.
     */
    public search(vector: number[] | Float32Array, limit: number = 10): { ids: number[], distances: number[] } {
        if (!this.index) throw new Error('Vector Engine not initialized');
        return this.index.search(vector, limit);
    }

    /**
     * Save the index to disk.
     */
    public save(): void {
        if (!this.index) return;
        // Don't save mock
        if (this.index instanceof MockSoulIndex) return;

        const indexPath = this.getIndexPath();
        console.log(`[Vector] Saving index to ${indexPath}...`);
        this.index.save(indexPath);
        console.log('[Vector] Saved.');
    }

    /**
     * Get the absolute path to the index file.
     */
    private getIndexPath(): string {
        // Use pathManager similar to DB
        const dbPath = process.env.PGLITE_DB_PATH || pathManager.getDatabasePath();
        // Store vector index alongside the database folder, or inside it?
        // Let's store it alongside for now: <project_root>/data/memory.index
        // But PGlite path is a directory. 
        // Let's put it IN the data directory root.
        const dataDir = path.dirname(dbPath);
        // Actually, pathManager.getDatabasePath() usually returns .../anchor-db
        // Let's use pathManager.getDataDirectory() if it exists, or derive from DB path.
        // Assuming dbPath is .../anchor-db
        return path.join(path.dirname(dbPath), this.indexName);
    }

    /**
     * Close the index and release resources.
     */
    public close(): void {
        if (this.index) {
            this.save(); // Auto-save on close?
            this.index.close();
            this.index = null;
            this._isInitialized = false;
        }
    }
}

export const vector = new VectorService();
