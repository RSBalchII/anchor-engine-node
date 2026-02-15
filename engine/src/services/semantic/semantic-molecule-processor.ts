/**
 * Semantic Molecule Processor for ECE (Semantic Shift Refactor)
 * 
 * Processes text chunks into semantic molecules with high-level semantic tags
 * and extracts atomic entities from within them.
 */

import { SemanticCategory } from '../../types/taxonomy.js';
import { SemanticMolecule, SemanticAtom } from './types/semantic.js';
import { SemanticTagDeriver } from './semantic-tag-deriver.js';
import { NlpService } from '../../services/nlp/nlp-service.js';

export class SemanticMoleculeProcessor {
  private tagDeriver: SemanticTagDeriver;
  private nlpService: NlpService;

  constructor() {
    this.tagDeriver = new SemanticTagDeriver();
    this.nlpService = new NlpService();
  }

  /**
   * Process a text chunk into a semantic molecule with atomic entities
   */
  public async processTextChunk(
    content: string,
    source: string,
    timestamp: number,
    provenance: string = 'internal'
  ): Promise<SemanticMolecule> {
    // Create a unique ID for this molecule
    const id = `mol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Extract entities from the content using NLP
    const entities = await this.nlpService.extractEntities(content);
    
    // Create atomic entities from the extracted entities
    const atoms = this.createAtomsFromEntities(entities, id);
    
    // Derive semantic tags based on entity interactions
    const semanticTags = await this.tagDeriver.deriveSemanticTags(content, entities);
    
    // Create the semantic molecule
    const molecule: SemanticMolecule = {
      id,
      content,
      source,
      timestamp,
      semanticTags,
      containedEntities: entities,
      provenance,
      score: 0 // Will be calculated during search
    };
    
    return molecule;
  }

  /**
   * Create atomic entities from extracted entities
   */
  private createAtomsFromEntities(entities: string[], moleculeId: string): SemanticAtom[] {
    return entities.map((entity, index) => {
      const atomId = `atom_${moleculeId}_${index}`;
      const entityType = this.classifyEntityType(entity);
      
      return {
        id: atomId,
        entityValue: entity,
        entityType,
        confidence: 1.0, // For now, assume high confidence
        sourceMoleculeId: moleculeId
      };
    });
  }

  /**
   * Classify the type of an entity
   */
  private classifyEntityType(entity: string): SemanticAtom['entityType'] {
    // Check if it's a person
    if (this.isPersonEntity(entity)) {
      return 'person';
    }
    
    // Check if it's a place
    if (this.isPlaceEntity(entity)) {
      return 'place';
    }
    
    // Check if it's a technical term
    if (this.isTechnicalTerm(entity)) {
      return 'technical';
    }
    
    // Check if it's a date
    if (this.isDateEntity(entity)) {
      return 'date';
    }
    
    // Default to concept
    return 'concept';
  }

  /**
   * Check if an entity is a person
   */
  private isPersonEntity(entity: string): boolean {
    // Use capitalization as a heuristic for person names
    // Could be enhanced with more sophisticated NER
    const personIndicators = ['mr.', 'mrs.', 'ms.', 'dr.', 'prof.', 'jr.', 'sr.'];
    const lowerEntity = entity.toLowerCase();
    
    // Check if it's a capitalized name pattern
    if (/^[A-Z][a-z]+/.test(entity) && !this.isCommonWord(entity)) {
      return true;
    }
    
    // Check for person indicators
    return personIndicators.some(indicator => lowerEntity.includes(indicator));
  }

  /**
   * Check if an entity is a place
   */
  private isPlaceEntity(entity: string): boolean {
    // Could be enhanced with geographic NER
    const placeIndicators = ['city', 'town', 'state', 'country', 'street', 'avenue', 'road', 'building', 'avenue', 'boulevard', 'lane', 'drive', 'court', 'place'];
    return placeIndicators.some(indicator => entity.toLowerCase().includes(indicator));
  }

  /**
   * Check if an entity is a technical term
   */
  private isTechnicalTerm(entity: string): boolean {
    const techTerms = [
      'node.js', 'typescript', 'javascript', 'api', 'database', 'function', 'class', 
      'method', 'variable', 'algorithm', 'cozodb', 'electron', 'react', 'vite',
      'graphql', 'rest', 'json', 'xml', 'html', 'css', 'sql', 'nosql', 'mongodb',
      'postgresql', 'mysql', 'redis', 'docker', 'kubernetes', 'aws', 'azure', 'gcp'
    ];
    return techTerms.includes(entity.toLowerCase());
  }

  /**
   * Check if an entity is a date
   */
  private isDateEntity(entity: string): boolean {
    // Check for date patterns
    const dateRegex = /^(19|20)\d{2}$|^(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])|^(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|1[0-2])/;
    if (dateRegex.test(entity)) return true;
    
    // Check if it's a month name
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                   'july', 'august', 'september', 'october', 'november', 'december'];
    return months.includes(entity.toLowerCase());
  }

  /**
   * Check if a word is a common non-entity word
   */
  private isCommonWord(word: string): boolean {
    const commonWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'shall', 'this', 'that', 'these', 'those'
    ];
    return commonWords.includes(word.toLowerCase());
  }

  /**
   * Process multiple text chunks into semantic molecules
   * OPTIMIZED: Process chunks in parallel to improve performance
   */
  public async processTextChunks(
    chunks: Array<{ content: string; source: string; timestamp: number; provenance?: string }>
  ): Promise<SemanticMolecule[]> {
    // Process all chunks in parallel instead of sequentially
    const moleculePromises = chunks.map(chunk => 
      this.processTextChunk(
        chunk.content,
        chunk.source,
        chunk.timestamp,
        chunk.provenance || 'internal'
      )
    );

    return await Promise.all(moleculePromises);
  }

  /**
   * Filter molecules by semantic category
   */
  public filterBySemanticCategory(molecules: SemanticMolecule[], category: SemanticCategory): SemanticMolecule[] {
    return molecules.filter(mol => mol.semanticTags.includes(category));
  }

  /**
   * Find molecules containing specific entities
   */
  public findMoleculesWithEntities(molecules: SemanticMolecule[], entities: string[]): SemanticMolecule[] {
    return molecules.filter(mol => 
      entities.some(entity => 
        mol.containedEntities.some(containedEntity => 
          containedEntity.toLowerCase() === entity.toLowerCase()
        )
      )
    );
  }

  /**
   * Find molecules with relationship between specific entities
   */
  public findRelationshipMolecules(molecules: SemanticMolecule[], entities: string[]): SemanticMolecule[] {
    return molecules.filter(mol => {
      // Check if this molecule has the relationship tag
      if (!mol.semanticTags.includes(SemanticCategory.RELATIONSHIP)) {
        return false;
      }
      
      // Check if all specified entities are present in this molecule
      return entities.every(entity => 
        mol.containedEntities.some(containedEntity => 
          containedEntity.toLowerCase() === entity.toLowerCase()
        )
      );
    });
  }
}