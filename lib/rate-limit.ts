interface RateLimitResult {
  success: boolean;
  remaining: number;
}

/**
 * Simple in-memory rate limiting for API endpoints.
 * Uses a Map to track requests per IP address.
 * 
 * @param ip - Client IP address
 * @param maxRequests - Maximum requests allowed
 * @param windowSeconds - Time window in seconds
 * @returns Object with success status and remaining attempts
 */
export function rateLimit(
  ip: string,
  maxRequests: number = 10,
  windowSeconds: number = 3600
): RateLimitResult {
  const cacheKey = `ratelimit:${ip}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  // Get existing count or initialize
  let requestCount = 0;
  let windowStart = now - windowMs;

  // Simple in-memory cache (in production, use Redis or similar)
  const cache = (globalThis as Record<string, unknown>).ratelimitCache as Map<string, { count: number; start: number }>;
  
  if (!cache) {
    Object.defineProperty(globalThis, 'ratelimitCache', {
      value: new Map(),
      writable: true,
      configurable: true,
    });
  }

  const cached = cache.get(cacheKey);

  if (cached && now - cached.start < windowMs) {
    requestCount = cached.count;
    windowStart = cached.start;
  } else {
    requestCount = 1;
    windowStart = now;
    cache.set(cacheKey, { count: 1, start: now });
  }

  const remaining = Math.max(0, maxRequests - requestCount);
  const success = requestCount <= maxRequests;

  return { success, remaining };
}

/**
 * Reset rate limit for testing purposes
 * @param ip - IP address to reset
 */
export function resetRateLimit(ip: string): void {
  const cache = (globalThis as Record<string, unknown>).ratelimitCache as Map<string, { count: number; start: number }>;
  if (cache) {
    cache.delete(`ratelimit:${ip}`);
  }
}
