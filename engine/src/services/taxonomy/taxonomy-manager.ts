/**
 * Taxonomy Manager for ECE (Dynamic Cortex Architecture)
 * 
 * Manages the semantic categories dynamically, allowing for soft-configuration
 * instead of hardcoded enums. Enables context switching between different
 * domain taxonomies (Personal Relationships vs Oil Industry).
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { SemanticCategory } from '../../types/taxonomy.js';
import { db } from '../../core/db.js';

const TAXONOMY_DIR = path.join(process.cwd(), 'user_data', 'taxonomy');
const CURRENT_RULES_FILE = path.join(TAXONOMY_DIR, 'current_rules.json');
const BACKUP_DIR = path.join(TAXONOMY_DIR, 'backups');

export interface SemanticRule {
  category: SemanticCategory;
  triggers: string[];
  requiredEntities?: string[];
  exclusions?: string[];
  weight: number;
}

export class TaxonomyManager {
  private activeRules: SemanticRule[] = [];
  private entityCooccurrenceThreshold: number = 2; // Minimum entities in a molecule to trigger relationship tagging

  constructor() {
    this.init();
  }

  private async init() {
    await fs.mkdir(TAXONOMY_DIR, { recursive: true });
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    
    try {
      const data = await fs.readFile(CURRENT_RULES_FILE, 'utf-8');
      this.activeRules = JSON.parse(data);
    } catch (e) {
      console.log('[Taxonomy] No custom rules found. Loading defaults.');
      this.activeRules = this.getDefaultRules();
      await this.saveRules(this.activeRules);
    }
  }

  public getRules(): SemanticRule[] {
    return this.activeRules;
  }

  public async saveRules(rules: SemanticRule[]) {
    this.activeRules = rules;
    await fs.writeFile(CURRENT_RULES_FILE, JSON.stringify(rules, null, 2));
  }

  public getDefaultRules(): SemanticRule[] {
    return [
      {
        category: SemanticCategory.RELATIONSHIP,
        triggers: [
          'and', 'with', 'met', 'told', 'said to', 'spoke to', 'visited', 
          'called', 'texted', 'together', 'relationship', 'friend', 'partner',
          'love', 'missed', 'cared about', 'knows', 'introduced to', 'about'
        ],
        requiredEntities: ['person'],
        weight: 0.9
      },
      {
        category: SemanticCategory.NARRATIVE,
        triggers: [
          'when', 'then', 'later', 'before', 'after', 'during', 'while',
          'first', 'next', 'finally', 'meanwhile', 'eventually', 'suddenly',
          'it was', 'there was', 'once upon', 'story', 'remember', 'recall',
          'yesterday', 'today', 'tomorrow', 'morning', 'afternoon', 'evening', 'night'
        ],
        requiredEntities: ['person', 'date'],
        weight: 0.8
      },
      {
        category: SemanticCategory.TECHNICAL,
        triggers: [
          'function', 'class', 'method', 'variable', 'code', 'algorithm',
          'API', 'endpoint', 'database', 'server', 'client', 'library',
          'framework', 'module', 'component', 'system', 'architecture',
          'Node.js', 'TypeScript', 'CozoDB', 'RAG', 'vector', 'embedding'
        ],
        requiredEntities: ['technical'],
        weight: 0.95
      },
      {
        category: SemanticCategory.INDUSTRY,
        triggers: [
          'market', 'industry', 'company', 'business', 'finance', 'economy',
          'oil', 'gas', 'energy', 'seismic', 'co2', 'sequestration',
          'production', 'drilling', 'reservoir', 'pipeline', 'refinery',
          'barrel', 'bpd', 'mboed', 'upstream', 'midstream', 'downstream'
        ],
        requiredEntities: ['concept'],
        weight: 0.85
      },
      {
        category: SemanticCategory.LOCATION,
        triggers: [
          'in', 'at', 'near', 'by', 'around', 'beside', 'between', 'within',
          'city', 'town', 'country', 'state', 'street', 'building', 'room',
          'address', 'coordinates', 'region', 'area', 'district', 'zone',
          'Albuquerque', 'Bernalillo', 'Sandia', 'Los Alamos', 'Texas', 'New Mexico'
        ],
        requiredEntities: ['place'],
        weight: 0.7
      },
      {
        category: SemanticCategory.EMOTIONAL,
        triggers: [
          'happy', 'sad', 'angry', 'excited', 'frustrated', 'anxious', 'joy',
          'fear', 'love', 'hate', 'regret', 'hope', 'despair', 'grateful',
          'felt', 'emotions', 'feelings', 'heart', 'soul', 'spirit', 'lonely',
          'connected', 'isolated', 'supported', 'understood'
        ],
        weight: 0.8
      }
    ];
  }

  public async createBackup(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}_${timestamp}.json`;
    await fs.writeFile(path.join(BACKUP_DIR, filename), JSON.stringify(this.activeRules, null, 2));
    return filename;
  }

  public async listBackups() {
    const files = await fs.readdir(BACKUP_DIR);
    return files.filter(f => f.endsWith('.json'));
  }

  public async restoreBackup(filename: string) {
    const data = await fs.readFile(path.join(BACKUP_DIR, filename), 'utf-8');
    const rules = JSON.parse(data);
    await this.saveRules(rules);
    return rules;
  }

  /**
   * Discover entities from the graph for auto-tagging suggestions
   */
  public async discoverEntitiesFromGraph(): Promise<Array<{entity: string, frequency: number, suggestedCategory: string}>> {
    console.log('[Taxonomy] Starting Graph Discovery...');
    
    try {
      // Query the database for high-frequency entities
      // This is a simplified version - in practice, you'd have a more sophisticated query
      // that looks for named entities in your content
      const result = await db.run(`
        SELECT content as entity, COUNT(*) as count
        FROM atoms
        GROUP BY content
        ORDER BY count DESC
        LIMIT 50
      `);

      const suggestions = result.rows.map((row: any) => ({
        entity: row.entity as string,
        frequency: row.count as number,
        suggestedCategory: this.guessCategory(row.entity as string)
      })).filter((item: any) => item.frequency > 1); // Only include entities that appear more than once

      return suggestions;
    } catch (error) {
      console.error('[Taxonomy] Discovery failed:', error);
      return [];
    }
  }

  private guessCategory(word: string): string {
    const lowerWord = word.toLowerCase();
    
    // Check against known person names
    const knownPeople = ['rob', 'jade', 'dory', 'coda', 'alex']; // Add more as needed
    if (knownPeople.includes(lowerWord)) return 'Person/Relationship';
    
    // Check against known places
    const knownPlaces = ['albuquerque', 'bernalillo', 'sandia', 'los alamos', 'texas'];
    if (knownPlaces.includes(lowerWord)) return 'Location';
    
    // Check against known technical terms
    const knownTech = ['node.js', 'typescript', 'cozodb', 'rag', 'vector', 'embedding', 'api'];
    if (knownTech.some(tech => lowerWord.includes(tech))) return 'Technical';
    
    // Default to unknown concept
    return 'Unknown Concept';
  }

  /**
   * Derive semantic tags for a text based on entity co-occurrence
   */
  public deriveSemanticTags(content: string, entities: string[]): SemanticCategory[] {
    const tags = new Set<SemanticCategory>();
    const contentLower = content.toLowerCase();
    
    // Check each rule to see if it applies
    for (const rule of this.activeRules) {
      let applies = false;
      
      // Check if any trigger words are in the content
      for (const trigger of rule.triggers) {
        if (contentLower.includes(trigger.toLowerCase())) {
          applies = true;
          break;
        }
      }
      
      // If trigger matched, check required entities
      if (applies && rule.requiredEntities) {
        applies = rule.requiredEntities.some(reqType => 
          entities.some(entity => this.entityMatchesType(entity, reqType))
        );
      }
      
      // Check for exclusions
      if (applies && rule.exclusions) {
        applies = !rule.exclusions.some(excl => 
          contentLower.includes(excl.toLowerCase())
        );
      }
      
      if (applies) {
        tags.add(rule.category);
      }
    }
    
    // Special relationship logic: if multiple person entities exist in the same content, tag as relationship
    const people = entities.filter(entity => this.isPersonEntity(entity));
    if (people.length >= this.entityCooccurrenceThreshold) {
      tags.add(SemanticCategory.RELATIONSHIP);
    }
    
    // Special narrative logic: if person and time reference exist, tag as narrative
    if (people.length > 0 && this.hasTimeReference(content)) {
      tags.add(SemanticCategory.NARRATIVE);
    }
    
    // Special technical logic: if technical terms exist, tag as technical
    const techTerms = entities.filter(entity => this.isTechnicalEntity(entity));
    if (techTerms.length > 0 || this.containsCodeBlock(content)) {
      tags.add(SemanticCategory.TECHNICAL);
    }
    
    return Array.from(tags);
  }

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
        return this.isTechnicalEntity(entity);
      default:
        return false;
    }
  }

  private isPersonEntity(entity: string): boolean {
    // Simple heuristic for person names - could be enhanced with NER
    const personIndicators = ['mr.', 'mrs.', 'ms.', 'dr.', 'prof.', 'jr.', 'sr.'];
    const lowerEntity = entity.toLowerCase();
    
    // Check if it's a capitalized name pattern
    if (/^[A-Z][a-z]+$/.test(entity) && !this.isCommonWord(entity)) {
      return true;
    }
    
    // Check for person indicators
    return personIndicators.some(indicator => lowerEntity.includes(indicator));
  }

  private isPlaceEntity(entity: string): boolean {
    const placeIndicators = ['city', 'town', 'state', 'country', 'street', 'avenue', 'road', 'building', 'avenue', 'boulevard', 'lane', 'drive', 'court', 'place', 'nm', 'tx', 'ca', 'ny', 'fl'];
    return placeIndicators.some(indicator => entity.toLowerCase().includes(indicator));
  }

  private isConceptEntity(entity: string): boolean {
    // Generic concept check - could be enhanced
    return entity.length > 2 && !this.isPersonEntity(entity) && !this.isDateEntity(entity);
  }

  private isDateEntity(entity: string): boolean {
    // Check for date patterns
    const dateRegex = /^(19|20)\d{2}$|^(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])|^(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|1[0-2])/;
    if (dateRegex.test(entity)) return true;
    
    // Check if it's a month name
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                   'july', 'august', 'september', 'october', 'november', 'december'];
    return months.includes(entity.toLowerCase());
  }

  private isTechnicalEntity(entity: string): boolean {
    const techTerms = [
      'node.js', 'typescript', 'javascript', 'api', 'database', 'function', 'class', 
      'method', 'variable', 'algorithm', 'cozodb', 'electron', 'react', 'vite',
      'graphql', 'rest', 'json', 'xml', 'html', 'css', 'sql', 'nosql', 'mongodb',
      'postgresql', 'mysql', 'redis', 'docker', 'kubernetes', 'aws', 'azure', 'gcp',
      'rag', 'vector', 'embedding', 'simhash', 'cozo', 'rocksdb'
    ];
    return techTerms.includes(entity.toLowerCase());
  }

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

  private containsCodeBlock(content: string): boolean {
    return /```[\s\S]*?```|`[^`]*`/.test(content) || 
           /function\s+\w+\s*\(|class\s+\w+|import\s+\w+|const\s+\w+\s*=/.test(content);
  }

  private isCommonWord(word: string): boolean {
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
                        'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
                        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
                        'should', 'may', 'might', 'must', 'can', 'shall', 'this', 'that', 'these', 'those'];
    return commonWords.includes(word.toLowerCase());
  }
}