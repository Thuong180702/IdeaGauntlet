/**
 * Simple in-memory TTL cache for search results and page fetches.
 * Reduces redundant API calls within a single session.
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class SearchCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private ttlMs: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  /** Get cached value or null if expired/missing. */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  /** Set cache entry with TTL. */
  set<T>(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  /** Get or compute — cache on miss. */
  async getOrCompute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;
    const value = await fn();
    this.set(key, value);
    return value;
  }

  /** Clear all entries. */
  clear(): void {
    this.store.clear();
  }

  /** Current entry count (for testing). */
  get size(): number {
    return this.store.size;
  }
}

/** Build cache key from query + provider + count. */
export function searchCacheKey(provider: string, query: string, maxResults: number): string {
  return `search:${provider}:${query}:${maxResults}`;
}

/** Build cache key for page fetch. */
export function pageCacheKey(url: string): string {
  return `page:${url}`;
}
