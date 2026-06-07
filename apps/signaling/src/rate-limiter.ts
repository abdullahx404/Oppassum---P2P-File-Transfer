export type RateLimitConfig = {
  windowMs: number;
  maxEvents: number;
  maxInvalidEvents: number;
};

type SocketWindow = {
  startedAt: number;
  eventCount: number;
  invalidCount: number;
};

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 10_000,
  maxEvents: 120,
  maxInvalidEvents: 10
};

export class SocketRateLimiter {
  private readonly windows = new Map<string, SocketWindow>();

  constructor(private readonly config: RateLimitConfig = DEFAULT_RATE_LIMIT) {}

  consume(socketId: string, now = Date.now()): boolean {
    const window = this.getWindow(socketId, now);
    window.eventCount += 1;
    return window.eventCount <= this.config.maxEvents;
  }

  recordInvalid(socketId: string, now = Date.now()): boolean {
    const window = this.getWindow(socketId, now);
    window.invalidCount += 1;
    return window.invalidCount <= this.config.maxInvalidEvents;
  }

  clear(socketId: string): void {
    this.windows.delete(socketId);
  }

  private getWindow(socketId: string, now: number): SocketWindow {
    const existing = this.windows.get(socketId);

    if (existing && now - existing.startedAt < this.config.windowMs) {
      return existing;
    }

    const nextWindow = {
      startedAt: now,
      eventCount: 0,
      invalidCount: 0
    };
    this.windows.set(socketId, nextWindow);
    return nextWindow;
  }
}
