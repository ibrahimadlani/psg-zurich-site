import "server-only";

// In memory: the site runs as a single Node process (Infomaniak), so one counter is enough.
const hits = new Map<string, number[]>();

/**
 * Sliding-window limiter. Returns false once `key` made `max` calls within `windowMs`.
 * Only successful checks are counted.
 */
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  // Keep the map small: drop keys whose window has passed.
  if (hits.size > 5000) {
    for (const [other, times] of hits) if (times.every((time) => now - time >= windowMs)) hits.delete(other);
  }
  return true;
}
