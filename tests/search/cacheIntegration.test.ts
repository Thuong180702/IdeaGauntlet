import { describe, it, expect, vi } from "vitest";
import { SearchCache, searchCacheKey, pageCacheKey } from "../../src/search/cache.js";

describe("cacheIntegration", () => {
  it("caches search results — fn called once on repeated getOrCompute", async () => {
    const cache = new SearchCache();
    const mockFn = vi.fn().mockResolvedValue([{ title: "Test", url: "http://example.com", snippet: "x" }]);

    const key = searchCacheKey("duckduckgo", "test query", 5);

    // First call — should invoke fn
    const result1 = await cache.getOrCompute(key, mockFn);
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(result1).toHaveLength(1);

    // Second call — should return cached, fn not called again
    const result2 = await cache.getOrCompute(key, mockFn);
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(result2).toEqual(result1);
  });

  it("caches page content — different URLs get different cache keys", () => {
    const cache = new SearchCache();

    const page1 = { url: "http://a.com", title: "A", text: "content a" };
    const page2 = { url: "http://b.com", title: "B", text: "content b" };

    cache.set(pageCacheKey("http://a.com"), page1);
    cache.set(pageCacheKey("http://b.com"), page2);

    expect(cache.get(pageCacheKey("http://a.com"))).toEqual(page1);
    expect(cache.get(pageCacheKey("http://b.com"))).toEqual(page2);
    expect(cache.get(pageCacheKey("http://c.com"))).toBeNull();
  });

  it("expires entries after TTL", async () => {
    const cache = new SearchCache(50); // 50ms TTL
    const mockFn = vi.fn().mockResolvedValue("value");

    await cache.getOrCompute("key", mockFn);
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Wait for TTL to expire
    await new Promise((r) => setTimeout(r, 60));

    await cache.getOrCompute("key", mockFn);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});
