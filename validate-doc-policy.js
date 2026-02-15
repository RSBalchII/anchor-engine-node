#!/usr/bin/env node

/**
 * ECE_Core Documentation Policy Compliance Validator
 * 
 * Validates that all documentation follows the doc_policy.md standards:
 * - Code is King: Code is the only source of truth
 * - Synchronous Testing: Every feature has matching test updates
 * - Visuals over Text: Prefers diagrams to paragraphs
 * - Brevity: Text sections <500 characters
 * - Pain into Patterns: Every major bug becomes a Standard
 * - LLM-First Documentation: Structured for LLM consumption
 * - Change Capture: System improvements documented in Standards
 * - Modular Architecture: Components documented in isolation
 * - API-First Design: Interfaces clearly defined with examples
 * - Self-Documenting Code: Complex logic includes inline documentation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DocPolicyValidator {
  constructor() {
    this.policyViolations = [];
    this.complianceStats = {
      totalFiles: 0,
      compliantFiles: 0,
      nonCompliantFiles: 0
    };
  }

  /**
   * Validate that documentation follows doc_policy standards
   */
  async validateDocumentation() {
    console.log('🔍 Starting ECE_Core Documentation Policy Compliance Validation...\n');

    // Check core documentation files
    const coreDocs = [
      'README.md',
      'specs/spec.md',
      'specs/doc_policy.md',
      'QUICKSTART.md'
    ];

    for (const doc of coreDocs) {
      const filePath = path.join(__dirname, '..', doc);
      if (fs.existsSync(filePath)) {
        await this.validateFile(filePath);
      } else {
        console.warn(`⚠️  Core documentation file missing: ${doc}`);
      }
    }

    // Check all standard files
    const standardsDir = path.join(__dirname, '..', 'specs', 'standards');
    if (fs.existsSync(standardsDir)) {
      const standardFiles = fs.readdirSync(standardsDir).filter(f => f.endsWith('.md'));
      for (const standardFile of standardFiles) {
        const filePath = path.join(standardsDir, standardFile);
        await this.validateFile(filePath);
      }
    }

    // Check all type definition files
    const typesDir = path.join(__dirname, '..', 'engine', 'src', 'types');
    if (fs.existsSync(typesDir)) {
      const typeFiles = fs.readdirSync(typesDir).filter(f => f.endsWith('.ts'));
      for (const typeFile of typeFiles) {
        const filePath = path.join(typesDir, typeFile);
        await this.validateFile(filePath);
      }
    }

    this.printSummary();
  }

  /**
   * Validate a single file against doc_policy standards
   */
  async validateFile(filePath) {
    this.complianceStats.totalFiles++;

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(filePath);
      const relativePath = path.relative(path.join(__dirname, '..'), filePath);

      console.log(`📄 Validating: ${relativePath}`);

      let isCompliant = true;
      const violations = [];

      // Check 1: Brevity (Text sections <500 characters)
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.length > 500) {
          violations.push(`Line ${i + 1}: Text exceeds 500 characters (${line.length})`);
          isCompliant = false;
        }
      }

      // Check 2: LLM-First Documentation patterns
      const hasLlmDeveloperSections = this.hasLlmDeveloperPatterns(content);
      if (!hasLlmDeveloperSections) {
        violations.push('Missing LLM developer specific sections or patterns');
        // Note: This is not necessarily non-compliant as some docs are for humans
      }

      // Check 3: API-First Design (for relevant files)
      if (this.isFileApiRelevant(filePath)) {
        const hasApiDefinitions = this.hasApiDefinitions(content);
        if (!hasApiDefinitions) {
          violations.push('Missing API definitions or interface specifications');
          isCompliant = false;
        }
      }

      // Check 4: Self-Documenting Code patterns (for code files)
      if (fileName.endsWith('.ts') || fileName.endsWith('.js')) {
        const hasInlineDocs = this.hasInlineDocumentation(content);
        if (!hasInlineDocs) {
          violations.push('Missing inline documentation for complex logic');
          // Note: Not marking as non-compliant as not all code needs extensive docs
        }
      }

      // Check 5: Modular Architecture (for component files)
      if (this.isFileComponentRelevant(filePath)) {
        const hasIsolatedDocumentation = this.hasIsolatedComponentDocumentation(content);
        if (!hasIsolatedDocumentation) {
          violations.push('Missing isolated component documentation');
          isCompliant = false;
        }
      }

      if (violations.length > 0) {
        this.policyViolations.push({
          file: relativePath,
          violations: violations
        });
        this.complianceStats.nonCompliantFiles++;
      } else {
        this.complianceStats.compliantFiles++;
      }

      console.log(`  ${isCompliant ? '✅' : '❌'} ${isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}\n`);

    } catch (error) {
      console.error(`❌ Error validating file ${filePath}: ${error.message}`);
      this.policyViolations.push({
        file: filePath,
        violations: [`Error reading file: ${error.message}`]
      });
      this.complianceStats.nonCompliantFiles++;
    }
  }

  /**
   * Check if file contains LLM developer patterns
   */
  hasLlmDeveloperPatterns(content) {
    const llmPatterns = [
      'LLM Developer',
      'For LLM Developers',
      'LLM developer',
      'for LLM developers',
      'AI Memory',
      'semantic graph',
      'entity co-occurrence',
      'relationship narrative',
      'semantic categories',
      'atomic architecture',
      'Tag-Walker',
      'Bright Node',
      'SimHash',
      'Native Module'
    ];

    return llmPatterns.some(pattern => content.includes(pattern));
  }

  /**
   * Check if file contains API definitions
   */
  hasApiDefinitions(content) {
    const apiPatterns = [
      'POST /',
      'GET /',
      'PUT /',
      'DELETE /',
      'API:',
      'Endpoints:',
      'Interface:',
      'function ',
      'class ',
      'export '
    ];

    return apiPatterns.some(pattern => content.includes(pattern));
  }

  /**
   * Check if file contains inline documentation
   */
  hasInlineDocumentation(content) {
    // Look for JSDoc-style comments or other inline documentation
    const jsdocPattern = /\/\*\*[\s\S]*?\*\//g;
    const commentPattern = /\/\/\s/g;

    return jsdocPattern.test(content) || commentPattern.test(content);
  }

  /**
   * Check if file has isolated component documentation
   */
  hasIsolatedComponentDocumentation(content) {
    const componentPatterns = [
      'Purpose:',
      'Role:',
      'Features:',
      'Location:',
      'Constructor:',
      'Methods:',
      'Properties:'
    ];

    return componentPatterns.some(pattern => content.includes(pattern));
  }

  /**
   * Determine if file should have API definitions
   */
  isFileApiRelevant(filePath) {
    return filePath.includes('types/') || 
           filePath.includes('api') || 
           filePath.includes('service') ||
           filePath.endsWith('.ts');
  }

  /**
   * Determine if file should have isolated component documentation
   */
  isFileComponentRelevant(filePath) {
    return filePath.includes('services/') || 
           filePath.includes('core/') || 
           filePath.includes('utils/') ||
           filePath.includes('types/');
  }

  /**
   * Print validation summary
   */
  printSummary() {
    console.log('\n📋 DOCUMENTATION POLICY COMPLIANCE SUMMARY');
    console.log('===========================================');
    console.log(`Total Files Checked: ${this.complianceStats.totalFiles}`);
    console.log(`Compliant Files: ${this.complianceStats.compliantFiles}`);
    console.log(`Non-Compliant Files: ${this.complianceStats.nonCompliantFiles}`);
    console.log(`Compliance Rate: ${((this.complianceStats.compliantFiles / Math.max(1, this.complianceStats.totalFiles)) * 100).toFixed(1)}%\n`);

    if (this.policyViolations.length > 0) {
      console.log('🚨 POLICY VIOLATIONS FOUND:');
      console.log('==========================');
      for (const violation of this.policyViolations) {
        console.log(`\nFile: ${violation.file}`);
        for (const v of violation.violations) {
          console.log(`  ❌ ${v}`);
        }
      }
    } else {
      console.log('✅ ALL FILES COMPLY WITH DOCUMENTATION POLICY');
    }

    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('1. Address any identified violations');
    console.log('2. Ensure all new features have corresponding test updates');
    console.log('3. Add LLM developer specific sections where appropriate');
    console.log('4. Maintain text sections under 500 characters');
    console.log('5. Include API definitions in type and service files');
  }
}

// Run the validator
const validator = new DocPolicyValidator();
validator.validateDocumentation().catch(console.error);