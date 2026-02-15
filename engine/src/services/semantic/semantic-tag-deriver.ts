/**
 * Semantic Tag Derivation System for ECE (Semantic Shift Refactor)
 *
 * Implements the "Tag Emergence" logic where high-level semantic tags
 * emerge from the interaction of entities within semantic molecules.
 * Replaces the old granular entity tagging system.
 */

import { SemanticCategory } from '../../types/taxonomy.js';
import { SemanticMolecule, SemanticAtom } from './types/semantic.js';
import { NlpService } from '../nlp/nlp-service.js';
import { TaxonomyManager } from '../taxonomy/taxonomy-manager.js';

export class SemanticTagDeriver {
  private nlpService: NlpService;
  private taxonomyManager: TaxonomyManager;

  constructor() {
    this.nlpService = new NlpService();
    this.taxonomyManager = new TaxonomyManager();
  }

  /**
   * Derive semantic tags for a molecule based on entity interactions
   * following the "Tag Emergence" protocol where high-level tags emerge
   * from the interaction of entities within the molecule.
   */
  public deriveSemanticTags(content: string, entities: string[]): SemanticCategory[] {
    const tags = new Set<SemanticCategory>();

    // Process each semantic rule to see if it applies
    for (const rule of this.taxonomyManager.getRules()) {
      if (this.ruleApplies(rule, content, entities)) {
        tags.add(rule.category);
      }
    }

    // Special relationship logic: if multiple person entities exist, add relationship tag
    const people = entities.filter(entity => this.isPersonEntity(entity));
    if (people.length >= 2) {
      tags.add(SemanticCategory.RELATIONSHIP);
    }

    // Special narrative logic: if person and time reference exist, add narrative tag
    if (people.length > 0 && this.hasTimeReference(content)) {
      tags.add(SemanticCategory.NARRATIVE);
    }

    // Special technical logic: if technical terms exist, add technical tag
    const techTerms = entities.filter(entity => this.isTechnicalTerm(entity));
    if (techTerms.length > 0) {
      tags.add(SemanticCategory.TECHNICAL);
    }

    // Explicit Code Detection
    if (this.containsCodeBlock(content)) {
      tags.add(SemanticCategory.CODE);
    }

    // Conversation/Chat Detection
    if (this.isConversation(content)) {
      tags.add(SemanticCategory.NARRATIVE);
    }

    return Array.from(tags);
  }

  /**
   * Check if a semantic rule applies to the given content and entities
   */
  private ruleApplies(rule: any, content: string, entities: string[]): boolean {
    // Check if required entities are present
    if (rule.requiredEntities) {
      const hasRequiredEntities = rule.requiredEntities.some((reqType: string) =>
        entities.some(entity => this.entityMatchesType(entity, reqType))
      );
      if (!hasRequiredEntities) return false;
    }

    // Check if any exclusion keywords are present
    if (rule.exclusions) {
      const hasExclusion = rule.exclusions.some((excl: string) =>
        content.toLowerCase().includes(excl.toLowerCase())
      );
      if (hasExclusion) return false;
    }

    // Check if any trigger keywords are present
    const hasTrigger = rule.triggers.some((trigger: string) =>
      content.toLowerCase().includes(trigger.toLowerCase())
    );

    return hasTrigger;
  }

  /**
   * Check if an entity matches a specific type
   */
  private entityMatchesType(entity: string, entityType: string): boolean {
    switch (entityType) {
      case 'person':
        return this.isPersonEntity(entity);
      case 'place':
        return this.isPlaceEntity(entity);
      case 'concept':
        return this.isConceptEntity(entity);
      case 'date':
        return this.isDateEntity(entity);
      case 'technical':
        return this.isTechnicalTerm(entity);
      default:
        return false;
    }
  }

  /**
   * Check if an entity is a person
   */
  private isPersonEntity(entity: string): boolean {
    // Simple heuristic - could be enhanced with NER
    const commonTitles = ['mr.', 'mrs.', 'ms.', 'dr.', 'prof.', 'jr.', 'sr.'];
    const lowerEntity = entity.toLowerCase();

    // Check if it's a capitalized name pattern
    if (/^[A-Z][a-z]+/.test(entity) && !this.isCommonWord(entity)) {
      return true;
    }

    // Check for person titles
    return commonTitles.some(title => lowerEntity.includes(title));
  }

  /**
   * Check if an entity is a place
   */
  private isPlaceEntity(entity: string): boolean {
    const placeIndicators = ['city', 'town', 'state', 'country', 'street', 'avenue', 'road', 'building', 'avenue', 'boulevard', 'lane', 'drive', 'court', 'place', 'nm', 'tx', 'ca', 'ny', 'fl'];
    return placeIndicators.some(indicator => entity.toLowerCase().includes(indicator));
  }

  /**
   * Check if an entity is a concept
   */
  private isConceptEntity(entity: string): boolean {
    // Generic concept check - could be enhanced
    return entity.length > 2 && !this.isPersonEntity(entity) && !this.isDateEntity(entity);
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
   * Check if an entity is a technical term
   */
  private isTechnicalTerm(entity: string): boolean {
    const techTerms = [
      'node.js', 'typescript', 'javascript', 'api', 'database', 'function', 'class',
      'method', 'variable', 'algorithm', 'cozodb', 'electron', 'react', 'vite',
      'graphql', 'rest', 'json', 'xml', 'html', 'css', 'sql', 'nosql', 'mongodb',
      'postgresql', 'mysql', 'redis', 'docker', 'kubernetes', 'aws', 'azure', 'gcp',
      'rag', 'vector', 'embedding', 'simhash', 'cozo', 'rocksdb', 'glm', 'qwen'
    ];
    return techTerms.includes(entity.toLowerCase());
  }

  /**
   * Check if content contains time references
   */
  private hasTimeReference(content: string): boolean {
    const timePatterns = [
      /\b\d{4}\b/, // Year patterns
      /yesterday|today|tomorrow/,
      /morning|afternoon|evening|night/,
      /january|february|march|april|may|june|july|august|september|october|november|december/i,
      /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i
    ];

    return timePatterns.some(pattern => pattern.test(content.toLowerCase()));
  }

  /**
   * Check if content contains code blocks
   */
  private containsCodeBlock(content: string): boolean {
    return /```[\s\S]*?```|`[^`]*`/.test(content) ||
      /function\s+\w+\s*\(|class\s+\w+|import\s+\w+|const\s+\w+\s*=/.test(content);
  }

  /**
   * Check if content looks like a conversation/chat log
   */
  private isConversation(content: string): boolean {
    const chatPatterns = [
      /(^|\n)(User|Human|Assistant|AI|System|Me|You):/i,
      /(^|\n)\[\d{2}:\d{2}\]/, // [14:30]
      /^(> )?User:/m,
      /^(> )?Assistant:/m
    ];
    return chatPatterns.some(p => p.test(content));
  }

  /**
   * Check if a word is common (not likely an entity)
   */
  private isCommonWord(word: string): boolean {
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'shall', 'this', 'that', 'these', 'those'];
    return commonWords.includes(word.toLowerCase());
  }
}