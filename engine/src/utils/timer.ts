/**
 * Timer Utility for Performance Measurement
 * 
 * Provides timing functionality to measure how long processes take
 */
export class Timer {
  private startTime: number;
  private lapTime: number;
  private label: string;

  constructor(label: string = 'Timer') {
    this.label = label;
    this.startTime = Date.now();
    this.lapTime = this.startTime;
  }

  /**
   * Get the elapsed time since the timer started
   */
  public elapsed(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get the time elapsed since the last lap
   */
  public lap(): number {
    const currentTime = Date.now();
    const lapDuration = currentTime - this.lapTime;
    this.lapTime = currentTime;
    return lapDuration;
  }

  /**
   * Format time in milliseconds to human-readable format
   */
  public static formatTime(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      const seconds = (ms / 1000).toFixed(2);
      return `${seconds}s`;
    } else {
      const minutes = (ms / 60000).toFixed(2);
      return `${minutes}m`;
    }
  }

  /**
   * Log the elapsed time with a message
   */
  public log(message: string): void {
    const elapsed = this.elapsed();
    console.log(`[${this.label}] ${message} (${Timer.formatTime(elapsed)})`);
  }

  /**
   * Log a lap time with a message
   */
  public logLap(message: string): void {
    const lap = this.lap();
    console.log(`[${this.label}] ${message} (+${Timer.formatTime(lap)})`);
  }

  /**
   * Log the total elapsed time and reset the timer
   */
  public logTotalAndReset(message: string): void {
    const elapsed = this.elapsed();
    console.log(`[${this.label}] ${message} (Total: ${Timer.formatTime(elapsed)})`);
    this.reset();
  }

  /**
   * Reset the timer
   */
  public reset(): void {
    this.startTime = Date.now();
    this.lapTime = this.startTime;
  }
}