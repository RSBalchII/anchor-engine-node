/**
 * Path Manager - Centralized Path Resolution for Anchor Engine
 * 
 * Implements Standard 051: Service Module Path Resolution
 * Ensures consistent path handling across all platforms
 */

import * as path from 'path'; // @ts-ignore - used in path resolution
import { fileURLToPath } from 'url'; // @ts-ignore - used in path resolution
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url); // @ts-ignore - used in path resolution
// const __dirname = path.dirname(__filename); // Not used, commented out to avoid TS error
const require = createRequire(import.meta.url); // @ts-ignore - used in path resolution

export class PathManager {
  private static instance: PathManager;
  private readonly basePath: string;
  private readonly platform: NodeJS.Platform;

  private constructor() {
    // Determine base path based on execution context
    if (typeof process !== 'undefined' && (process as any).resourcesPath) {
      // Electron environment
      this.basePath = (process as any).resourcesPath;
    } else if (typeof process !== 'undefined') {
      // Node.js environment
      // In ES modules, __dirname is not available, so we use import.meta.url
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      this.basePath = path.resolve(__dirname, '../..');
    } else {
      // Fallback
      this.basePath = (process as any).cwd();
    }

    this.platform = process.platform;
    console.log(`[PathManager] Initialized. BasePath: ${this.basePath}, Platform: ${this.platform}`);
  }

  public static getInstance(): PathManager {
    if (!PathManager.instance) {
      PathManager.instance = new PathManager();
      console.log('[PathManager] Singleton instance created.');
    }
    return PathManager.instance;
  }

  /**
   * Resolve native binary paths based on environment and platform
   */
  public getNativePath(filename: string): string {
    // Handle platform-specific binary names
    let platformBinary = filename;

    if (filename.startsWith('cozo_node_')) {
      // Already platform-specific
      platformBinary = filename;
    } else if (filename === 'cozo_lib.node') {
      // Map generic name to platform-specific
      switch (this.platform) {
        case 'win32':
          platformBinary = 'cozo_node_win32.node';
          break;
        case 'darwin':
          platformBinary = 'cozo_node_darwin.node';
          break;
        case 'linux':
          platformBinary = 'cozo_node_linux.node';
          break;
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }
    } else if (filename === 'ece_native.node') {
      // For our custom native module
      switch (this.platform) {
        case 'win32':
          platformBinary = path.join(this.basePath, 'build', 'Release', 'ece_native.node');
          break;
        case 'darwin':
        case 'linux':
          platformBinary = path.join(this.basePath, 'build', 'Release', 'ece_native.node');
          break;
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }
    }

    const resolvedPath = path.resolve(this.basePath, platformBinary);
    console.log(`[PathManager] Resolving ${filename} -> ${resolvedPath}`);
    return resolvedPath;
  }

  /**
   * Get database path
   */
  public getDatabasePath(): string {
    return path.resolve(this.basePath, 'context_data');
  }

  /**
   * Get notebook directory path
   */
  public getNotebookDir(): string {
    // Current: basePath = .../anchor-engine/engine
    // Desired: .../Anchor Engine/../notebook -> .../Projects/notebook
    // So we need to go up from anchor-engine (which is engine/..)
    return path.resolve(this.basePath, '../..', 'notebook');
  }

  /**
   * Get context directory path (Internal Configuration/Tags)
   */
  public getContextDir(): string {
    return path.resolve(this.basePath, '..', 'context');
  }

  /**
   * Get models directory path
   */
  public getModelsDir(): string {
    return path.resolve(this.basePath, '../..', 'models');
  }

  /**
   * Get logs directory path
   */
  public getLogsDir(): string {
    return path.resolve(this.basePath, 'logs');
  }

  /**
   * Get specs directory path
   */
  public getSpecsDir(): string {
    return path.resolve(this.basePath, '..', 'specs');
  }

  /**
   * Get user settings path
   */
  public getUserSettingsPath(): string {
    return path.resolve(this.basePath, 'user_settings.json');
  }

  /**
   * Get sovereign tags path
   */
  public getSovereignTagsPath(): string {
    return path.resolve(this.getContextDir(), 'internal_tags.json');
  }
}

// Export singleton instance
export const pathManager = PathManager.getInstance();