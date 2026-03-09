/**
 * Simple in-memory sliding window rate limiter.
 * No external dependencies. Suitable for single-instance deployments.
 *
 * State is lost on server restart and not shared across multiple instances.
 * Acceptable for single-container Docker Compose deployment.
 */

interface SlidingWindowEntry {
  timestamps: number[];
}

export class RateLimiter {
  private store = new Map<string, SlidingWindowEntry>();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(options: { windowMs: number; maxRequests: number }) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;

    // Periodic cleanup of expired entries every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  check(key: string): {
    allowed: boolean;
    remaining: number;
    retryAfterMs: number;
  } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let entry = this.store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

    if (entry.timestamps.length >= this.maxRequests) {
      const oldestInWindow = entry.timestamps[0];
      const retryAfterMs = oldestInWindow + this.windowMs - now;
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(retryAfterMs, 0),
      };
    }

    entry.timestamps.push(now);
    return {
      allowed: true,
      remaining: this.maxRequests - entry.timestamps.length,
      retryAfterMs: 0,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    for (const [key, entry] of this.store.entries()) {
      entry.timestamps = entry.timestamps.filter((t) => t > windowStart);
      if (entry.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }
}

// Singleton: 10 requests per 60 seconds per user
export const extractRateLimiter = new RateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
});

// Singleton: 5 login attempts per 15 minutes per email
export const loginRateLimiter = new RateLimiter({
  windowMs: 15 * 60_000,
  maxRequests: 5,
});
