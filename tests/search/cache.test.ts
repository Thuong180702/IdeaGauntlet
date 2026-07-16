import { describe, it, expect, vi, beforeEach } from "vitest";
import { SearchCache, searchCacheKey, pageCacheKey } from "../../src/search/cache.js";

describe("SearchCache", () => {
  let cache: SearchCache;

  beforeEach(() => {
    cache = new SearchCache(1000); // 1s TTL for testing
  });

  it("stores and retrieves values", () => {
    cache.set("key1", { data: "test" });
    expect(cache.get<{ data: string }>("key1")).toEqual({ data: "test" });
  });

  it("returns null for missing keys", () => {
    expect(cache.get("nonexistent")).toBeNull();
  });

  it("expires entries after TTL", async () => {
    cache = new SearchCache(50); // 50ms TTL
    cache.set("key1", "value");
    expect(cache.get("key1")).toBe("value");
    await new Promise((r) => setTimeout(r, 60));
    expect(cache.get("key1")).toBeNull();
  });

  it("getOrCompute caches on miss", async () => {
    const fn = vi.fn(async () => "computed");
    const result1 = await cache.getOrCompute("key1", fn);
    expect(result1).toBe("computed");
    expect(fn).toHaveBeenCalledOnce();

    // Second call should use cache
    const result2 = await cache.getOrCompute("key1", fn);
    expect(result2).toBe("computed");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("clear removes all entries", () => {
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.size).toBe(2);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it("size reflects entry count", () => {
    expect(cache.size).toBe(0);
    cache.set("a", 1);
    expect(cache.size).toBe(1);
    cache.set("b", 2);
    expect(cache.size).toBe(2);
  });
});

describe("cache key builders", () => {
  it("searchCacheKey includes provider, query, and count", () => {
    const key = searchCacheKey("duckduckgo", "test query", 5);
    expect(key).toContain("search:duckduckgo:test query:5");
  });

  it("pageCacheKey includes URL", () => {
    const key = pageCacheKey("https://example.com/page");
    expect(key).toContain("page:https://example.com/page");
  });

  it("different queries produce different keys", () => {
    expect(searchCacheKey("ddg", "query1", 5)).not.toBe(searchCacheKey("ddg", "query2", 5));
  });
});
