/**
 * Idle Manager for Anchor OS
 *
 * Detects system inactivity and triggers memory cleanup to reduce RAM usage
 * during idle periods. Coordinates with all services to release resources.
 *
 * @see MEMORY_OPTIMIZATION_PLAN.md for full details
 */

import { performanceMonitor } from '../utils/performance-monitor.js';
import { metricsTracker } from '../utils/structured-logger.js';
import { resourceManager } from '../utils/resource-manager.js';

export interface IdleManagerConfig {
  idleTimeoutMinutes: number;
  enabled: boolean;
  enableModelUnload: boolean;
  enableMetricsPrune: boolean;
  enableGC: boolean;
}

export class IdleManager {
  private static instance: IdleManager;
  private lastActivityTime: number = Date.now();
  private idleTimeout: NodeJS.Timeout | null = null;
  private config: IdleManagerConfig;
  private isIdle: boolean = false;
  private activityCounter: number = 0;

  private constructor() {
    this.config = {
      idleTimeoutMinutes: 5,
      enabled: process.env.IDLE_MANAGER_ENABLED !== 'false',
      enableModelUnload: process.env.IDLE_UNLOAD_MODELS !== 'false',
      enableMetricsPrune: process.env.IDLE_PRUNE_METRICS !== 'false',
      enableGC: process.env.IDLE_ENABLE_GC !== 'false'
    };

    if (this.config.enabled) {
      console.log(`[IdleManager] Initialized (timeout: ${this.config.idleTimeoutMinutes}min)`);
      this.startMonitoring();
    } else {
      console.log('[IdleManager] Disabled via environment variable');
    }
  }

  public static getInstance(): IdleManager {
    if (!IdleManager.instance) {
      IdleManager.instance = new IdleManager();
    }
    return IdleManager.instance;
  }

  /**
   * Mark system as active (call this on any user request)
   */
  public markActive(reason?: string) {
    if (!this.config.enabled) return;

    const wasIdle = this.isIdle;
    this.lastActivityTime = Date.now();
    this.activityCounter++;

    // Cancel idle cleanup if scheduled
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;

      if (wasIdle) {
        console.log(`[IdleManager] Waking from idle (activity: ${reason || 'user request'})`);
        this.isIdle = false;
      }
    }

    // Schedule next idle check
    this.scheduleIdleCheck();
  }

  /**
   * Configure idle manager settings
   */
  public configure(config: Partial<IdleManagerConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.idleTimeoutMinutes) {
      console.log(`[IdleManager] Timeout updated: ${config.idleTimeoutMinutes}min`);
      if (this.idleTimeout) {
        this.scheduleIdleCheck();
      }
    }
  }

  /**
   * Get current idle status
   */
  public getStatus(): {
    isIdle: boolean;
    idleTimeoutMinutes: number;
    minutesUntilIdle: number;
    activityCount: number;
    lastActivityAgo: number;
  } {
    const now = Date.now();
    const lastActivityAgo = now - this.lastActivityTime;
    const minutesUntilIdle = Math.max(0, Math.round((this.config.idleTimeoutMinutes * 60 * 1000 - lastActivityAgo) / 60000));

    return {
      isIdle: this.isIdle,
      idleTimeoutMinutes: this.config.idleTimeoutMinutes,
      minutesUntilIdle,
      activityCount: this.activityCounter,
      lastActivityAgo
    };
  }

  /**
   * Manually trigger idle mode (for testing)
   */
  public async triggerIdleMode(): Promise<void> {
    console.log('[IdleManager] Manually triggering idle mode...');
    await this.enterIdleMode();
  }

  /**
   * Reset activity counter (for testing)
   */
  public resetActivityCounter(): void {
    this.activityCounter = 0;
  }

  private scheduleIdleCheck(): void {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }

    this.idleTimeout = setTimeout(() => {
      const idleDuration = Date.now() - this.lastActivityTime;
      const thresholdMs = this.config.idleTimeoutMinutes * 60 * 1000;

      if (idleDuration >= thresholdMs && !this.isIdle) {
        this.enterIdleMode();
      }
    }, this.config.idleTimeoutMinutes * 60 * 1000);
  }

  private async enterIdleMode(): Promise<void> {
    this.isIdle = true;
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     IdleManager: Entering idle mode                        ║');
    console.log('║     Releasing resources to reduce memory usage             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    const statsBefore = process.memoryUsage();
    console.log(`[IdleManager] Memory before cleanup: RSS=${(statsBefore.rss / 1024 / 1024).toFixed(0)}MB`);

    // 1. Unload NLP model
    if (this.config.enableModelUnload) {
      try {
        const { NlpService } = await import('./nlp/nlp-service.js');
        await NlpService.unloadModel();
      } catch (error) {
        console.error('[IdleManager] Error unloading NLP model:', error);
      }
    }

    // 2. Unload GLiNER NER model
    if (this.config.enableModelUnload) {
      try {
        const { unloadModel: unloadNerModel } = await import('./tags/gliner.js');
        await unloadNerModel();
      } catch (error) {
        console.error('[IdleManager] Error unloading GLiNER model:', error);
      }
    }

    // 3. Prune performance metrics
    if (this.config.enableMetricsPrune) {
      try {
        performanceMonitor.pruneOldMetrics();
        console.log('[IdleManager] Pruned old performance metrics');
      } catch (error) {
        console.error('[IdleManager] Error pruning metrics:', error);
      }
    }

    // 4. Reset logger metrics
    if (this.config.enableMetricsPrune) {
      try {
        metricsTracker.pruneOldMetrics();
        console.log('[IdleManager] Pruned logger metrics');
      } catch (error) {
        console.error('[IdleManager] Error pruning logger metrics:', error);
      }
    }

    // 5. Force garbage collection
    if (this.config.enableGC && global.gc) {
      try {
        global.gc();
        console.log('[IdleManager] Forced garbage collection');
        
        // Windows-specific: Force V8 to compact heap and return memory to OS
        if (process.platform === 'win32') {
          const v8 = await import('v8');
          v8.setFlagsFromString('--max-old-space-size=2048'); // Limit heap to 2GB
          v8.setFlagsFromString('--min-semi-space-size=2'); // Reduce semi-space
          console.log('[IdleManager] Applied Windows memory compaction flags');
        }
      } catch (error) {
        console.error('[IdleManager] Error during GC:', error);
      }
    } else if (this.config.enableGC && !global.gc) {
      console.warn('[IdleManager] GC not available. Run with --expose-gc flag');
    }

    // 6. Optimize memory via ResourceManager
    try {
      resourceManager.optimizeMemory();
    } catch (error) {
      console.error('[IdleManager] Error in resource optimization:', error);
    }

    // Log results
    const statsAfter = process.memoryUsage();
    const saved = statsBefore.rss - statsAfter.rss;
    console.log(`[IdleManager] Memory after cleanup: RSS=${(statsAfter.rss / 1024 / 1024).toFixed(0)}MB`);
    console.log(`[IdleManager] Memory saved: ${(saved / 1024 / 1024).toFixed(0)}MB (${((saved / statsBefore.rss) * 100).toFixed(1)}%)`);
    console.log('');
  }

  private startMonitoring(): void {
    // Schedule first idle check
    this.scheduleIdleCheck();

    // Log status periodically (every 10 minutes)
    setInterval(() => {
      const status = this.getStatus();
      if (process.env.DEBUG_IDLE || process.env.NODE_ENV === 'development') {
        console.log(`[IdleManager] Status: isIdle=${status.isIdle}, activity=${status.activityCount}, nextIdle=${status.minutesUntilIdle}min`);
      }
    }, 10 * 60 * 1000);
  }
}

// Export singleton instance
export const idleManager = IdleManager.getInstance();
