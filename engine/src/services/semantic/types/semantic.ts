/**
 * Semantic Types for ECE Semantic Shift Architecture
 * 
 * Defines the interfaces for semantic molecules and atoms
 */

import { SemanticCategory } from '../../../types/taxonomy.js';

export interface SemanticMolecule {
  id: string;
  content: string;
  source: string;
  timestamp: number;
  semanticTags: SemanticCategory[]; // High-level semantic categories only
  containedEntities: string[];      // The atomic entities within this molecule
  provenance: string;
  score?: number;
  [key: string]: any;
}

export interface SemanticAtom {
  id: string;
  entityValue: string;      // The actual entity value (e.g., "Rob", "Jade", "Albuquerque")
  entityType: 'person' | 'place' | 'concept' | 'date' | 'technical' | 'other';
  confidence: number;
  sourceMoleculeId: string;
  [key: string]: any;
}