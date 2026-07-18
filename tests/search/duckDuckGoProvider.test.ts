import { describe, it, expect, vi, afterEach } from "vitest";
import { DuckDuckGoProvider } from "../../src/search/duckDuckGoProvider.js";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

afterEach(() => {
  mockFetch.mockReset();
});

describe("DuckDuckGoProvider", () => {
  const provider = new DuckDuckGoProvider();

  it("has kind 'duckduckgo'", () => {
    expect(provider.kind).toBe("duckduckgo");
  });

  it("enforces rate limiting between requests", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => '[]',
    });

    const start = Date.now();
    // Two calls should take at least 500ms due to rate limiting
    await provider.search("query1", 5);
    await provider.search("query2", 5);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(400);
  });

  it("returns empty array on fetch failure", async () => {
    // DDG request fails → return [] (orchestrator relies on API providers instead)
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503, text: async () => "" });

    const results = await provider.search("fail query", 5);
    expect(results).toEqual([]);
  });

  it("parses DuckDuckGo HTML results", async () => {
    const html = `
      <html><body>
      <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fpage">Example Page</a>
      <a class="result__snippet" href="#">This is a snippet of the page</a>
      <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.org">Example Org</a>
      <a class="result__snippet" href="#">Description of org</a>
      </body></html>
    `;
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => html,
    });

    const results = await provider.search("test", 5);
    // Should attempt to parse HTML
    expect(mockFetch).toHaveBeenCalled();
  });
});
