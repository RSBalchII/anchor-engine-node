/**
 * Enhanced Native Module Manager for ECE
 * 
 * Implements improved error handling and fallback mechanisms for native modules
 * following Standard 074: Native Module Acceleration guidelines
 */

import { pathManager } from './path-manager.js';
import { createRequire } from 'module';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

export interface NativeModuleStatus {
  loaded: boolean;
  moduleName: string;
  platform: string;
  architecture: string;
  error?: string;
  fallbackActive: boolean;
}

export class NativeModuleManager {
  private static instance: NativeModuleManager;
  private modules: Map<string, any> = new Map();
  private status: Map<string, NativeModuleStatus> = new Map();

  private constructor() { }

  public static getInstance(): NativeModuleManager {
    if (!NativeModuleManager.instance) {
      NativeModuleManager.instance = new NativeModuleManager();
    }
    return NativeModuleManager.instance;
  }

  /**
   * Load a native module with comprehensive error handling and fallbacks
   */
  public loadNativeModule(moduleName: string, binaryName: string): any {
    if (this.modules.has(moduleName)) {
      const existingModule = this.modules.get(moduleName);
      // Check if we previously marked this module as problematic
      const status = this.status.get(moduleName);
      if (status && status.fallbackActive) {
        console.log(`[NativeModuleManager] Returning cached fallback for ${moduleName}`);
        return existingModule;
      }
      return existingModule;
    }

    let nativeModule: any = null;
    let fallbackActive = false;
    let errorMessage: string | undefined;

    // Check if we should skip native module loading entirely for safety
    // This could be based on a config or previous crash detection
    const shouldUseFallbackOnly = this.shouldUseFallbackOnly(moduleName);

    if (shouldUseFallbackOnly) {
      console.log(`[NativeModuleManager] Skipping native module ${moduleName} due to safety mode`);
      fallbackActive = true;
      nativeModule = this.createFallbackModule(moduleName);
    } else {
      try {
        // 1. Try standard path resolution
        const nativePath = pathManager.getNativePath(binaryName);

        if (require && typeof require === 'function') {
          nativeModule = require(nativePath);
          console.log(`[NativeModuleManager] Successfully loaded ${moduleName} from: ${nativePath}`);

          // Perform a quick safety test to make sure the module doesn't crash
          if (moduleName === 'ece_native' && nativeModule && typeof nativeModule.distance === 'function') {
            try {
              // Quick test with safe values
              const testResult = nativeModule.distance(BigInt(1), BigInt(2));
              if (typeof testResult !== 'number') {
                throw new Error('Native distance function returned unexpected type');
              }
              console.log(`[NativeModuleManager] Native module ${moduleName} passed safety test`);
            } catch (testError) {
              console.error(`[NativeModuleManager] Native module ${moduleName} failed safety test:`, testError);
              fallbackActive = true;
              nativeModule = this.createFallbackModule(moduleName);
            }
          }
        } else {
          throw new Error('Require function not available');
        }
      } catch (e1: any) {
        console.warn(`[NativeModuleManager] Standard load failed for ${moduleName}:`, e1.message);

        // 2. Try alternative paths (debug builds, etc.)
        try {
          const debugPath = pathManager.getNativePath(binaryName).replace('Release', 'Debug');
          nativeModule = require(debugPath);
          console.log(`[NativeModuleManager] Loaded ${moduleName} from debug build: ${debugPath}`);
        } catch (e2: any) {
          console.warn(`[NativeModuleManager] Debug load failed for ${moduleName}:`, e2.message);

          // 3. Try development fallback path
          try {
            const devPath = path.resolve(__dirname, `../../build/Release/${binaryName}`);
            nativeModule = require(devPath);
            console.log(`[NativeModuleManager] Loaded ${moduleName} from dev path: ${devPath}`);
          } catch (e3: any) {
            console.warn(`[NativeModuleManager] Dev path load failed for ${moduleName}:`, e3.message);

            // 4. Activate fallback implementation
            fallbackActive = true;
            errorMessage = `Native module ${moduleName} failed to load: ${e3.message}`;
            console.warn(`[NativeModuleManager] Activating fallback for ${moduleName}`);

            // Return a fallback object with the same interface as the native module
            nativeModule = this.createFallbackModule(moduleName);
          }
        }
      }
    }

    // Store module and status
    this.modules.set(moduleName, nativeModule);

    const status: NativeModuleStatus = {
      loaded: nativeModule !== null,
      moduleName,
      platform: process.platform,
      architecture: process.arch,
      fallbackActive,
      error: errorMessage
    };

    this.status.set(moduleName, status);

    return nativeModule;
  }

  /**
   * Determine if we should use fallback only for a particular module
   * This could be based on previous crashes or configuration
   */
  private shouldUseFallbackOnly(moduleName: string): boolean {
    // For stability, force fallback for ece_native to prevent crashes
    // This addresses the ECONNRESET issue caused by native module segfaults
    if (moduleName === 'ece_native') {
      console.log(`[NativeModuleManager] Forcing fallback for ${moduleName} to prevent crashes`);
      return true;
    }
    // For now, we'll return false for other modules, but this could be enhanced to check
    // for crash history or user configuration
    return false;
  }

  /**
   * Create a fallback implementation for when native modules fail
   */
  private createFallbackModule(moduleName: string): any {
    switch (moduleName) {
      case 'ece_native':
        return {
          // Fallback implementations for native functions
          cleanse: (input: string): string => {
            // Simple fallback for Key Assassin functionality
            let clean = input;

            // Recursive un-escape (JS fallback)
            let pass = 0;
            while (clean.includes('\\') && pass < 3) {
              pass++;
              clean = clean.replace(/\\"/g, '"');
              clean = clean.replace(/\\n/g, '\n');
              clean = clean.replace(/\\t/g, '\t');
            }

            // Remove common metadata keys
            clean = clean.replace(/"type"\s*:\s*"[^"]*",?/g, '');
            clean = clean.replace(/"timestamp"\s*:\s*"[^"]*",?/g, '');
            clean = clean.replace(/"source"\s*:\s*"[^"]*",?/g, '');
            clean = clean.replace(/"response_content"\s*:\s*/g, '');
            clean = clean.replace(/"thinking_content"\s*:\s*/g, '');

            // Slash compression
            clean = clean.replace(/\\{2,}/g, '/');

            return clean;
          },

          atomize: (input: string, strategy: string): string[] => {
            // Simple fallback for atomization
            if (strategy === 'code') {
              // Split by top-level code blocks
              return input.split(/(?=^\s*[a-z_][^{]*\{)/m).filter(s => s.trim().length > 0);
            } else {
              // Split by paragraphs for prose
              return input.split(/\n\s*\n/).filter(s => s.trim().length > 0);
            }
          },

          fingerprint: (input: string): bigint => {
            // Robust JS Fallback for SimHash (Standard 074)
            // Implementation: 2-gram Shingling + Jenkins Hash + 64-bit Vector

            const tokens = input.toLowerCase().split(/\s+/);
            const shingles: string[] = [];

            // Generate 2-shingles (overlapping pairs)
            if (tokens.length < 2) {
              shingles.push(tokens[0] || "");
            } else {
              for (let i = 0; i < tokens.length - 1; i++) {
                shingles.push(`${tokens[i]} ${tokens[i + 1]}`);
              }
            }

            const v = new Int32Array(64).fill(0);

            for (const shingle of shingles) {
              // Jenkins One-at-a-Time Hash for the shingle
              let hash = 0;
              for (let i = 0; i < shingle.length; i++) {
                hash += shingle.charCodeAt(i);
                hash += (hash << 10);
                hash ^= (hash >>> 6);
              }
              hash += (hash << 3);
              hash ^= (hash >>> 11);
              hash += (hash << 15);

              // Update vector
              // We use the 32-bit hash twice to simulate 64 bits or just map 32 bits?
              // For valid similarity with C++ implementation (usually MD5 or similar), we should try to match.
              // But for fallback within JS-only scope, self-consistency is enough.
              // Let's stick to 64-bit mapping of the 32-bit hash for simplicity or mix it.

              // Simple expansion to 64 positions
              for (let i = 0; i < 64; i++) {
                const bit = (i < 32) ? ((hash >> i) & 1) : ((hash >> (i - 32)) & 1); // Mirror
                v[i] += bit ? 1 : -1;
              }
            }

            // Collapse to 64-bit integer
            let fingerprint = 0n;
            for (let i = 0; i < 64; i++) {
              if (v[i] > 0) {
                fingerprint |= (1n << BigInt(i));
              }
            }

            return fingerprint;
          },

          distance: (a: bigint, b: bigint): number => {
            // Hamming Distance
            const xor = a ^ b;
            let count = 0;
            // Kernighan's Algorithm for bit counting with safety limit
            let n = xor;
            const MAX_BITS = 64; // Maximum possible bits for our fingerprint

            while (n > 0n && count < MAX_BITS) {
              n &= (n - 1n);
              count++;
            }

            // Safety check in case of unexpected behavior
            if (count >= MAX_BITS) {
              console.warn('[NativeModuleManager] Hamming distance reached maximum bit count, returning 64');
              return 64;
            }

            return count;
          }
        };

      default:
        return null;
    }
  }

  /**
   * Get the status of a loaded native module
   */
  public getStatus(moduleName: string): NativeModuleStatus | undefined {
    return this.status.get(moduleName);
  }

  /**
   * Check if a module is using fallback implementation
   */
  public isUsingFallback(moduleName: string): boolean {
    const status = this.getStatus(moduleName);
    return status ? status.fallbackActive : false;
  }

  /**
   * Get all loaded modules status
   */
  public getAllStatus(): Map<string, NativeModuleStatus> {
    return new Map(this.status);
  }
}

// Export singleton instance
export const nativeModuleManager = NativeModuleManager.getInstance();