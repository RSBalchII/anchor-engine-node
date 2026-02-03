/**
 * Atomic Architecture Taxonomy
 * 
 * Hierarchy of Meaning:
 * 1. Atom (formerly Tag/Entity): The fundamental unit of semantic meaning (e.g., "#python", "UserAuthentication").
 * 2. Molecule (formerly Sentence/Thought): A coherent chain of atoms expressing a specific intent or fact.
 * 3. Compound (formerly Chunk/Memory): A stable aggregate of molecules (e.g., a file, a function, a document).
 */

export interface Atom {
    id: string;          // Unique Ref (hash of label)
    label: string;       // Human readable (e.g. "#python")
    type: 'concept' | 'entity' | 'keyword' | 'system';
    weight: number;      // Importance (0-1)
    embedding?: number[]; // Semantic Vector
}

export interface Molecule {
    id: string;
    content: string;     // The actual text (e.g. "Python is great.")
    atoms: string[];     // Pointers to Atom IDs present in this molecule
    sequence: number;    // Order within the Compound
    compoundId: string;  // Parent Compound

    // Universal Coordinates (Pointer-Based)
    start_byte: number;
    end_byte: number;

    // Type Distinction
    type: 'prose' | 'code' | 'data';

    // Quantitative Data (Optional)
    numeric_value?: number; // e.g. 1500.0
    numeric_unit?: string;  // e.g. "PSI"

    // Deduplication (SimHash)
    molecular_signature?: string;

    // Temporal Context
    timestamp: number;
}

export interface Compound {
    id: string;          // memory_id
    compound_body: string;     // Full text content (formerly content)
    molecules: string[]; // Pointers to Molecule IDs
    atoms: string[];     // Aggregate set of Atom IDs (formerly tags)

    // Metadata
    path: string;
    timestamp: number;
    provenance: 'internal' | 'external' | 'quarantine';
    molecular_signature: string; // 64-bit Hamming SimHash
}
