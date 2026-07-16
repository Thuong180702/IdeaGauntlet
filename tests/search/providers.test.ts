import { describe, it, expect, vi, afterEach } from "vitest";
import { HackerNewsProvider } from "../../src/search/hackerNewsProvider.js";
import { GitHubProvider } from "../../src/search/gitHubProvider.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

afterEach(() => {
  mockFetch.mockReset();
});

describe("HackerNewsProvider", () => {
  const provider = new HackerNewsProvider();

  it("has kind 'custom'", () => {
    expect(provider.kind).toBe("custom");
  });

  it("returns results from Algolia API", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        hits: [
          {
            title: "Show HN: My project",
            url: "https://example.com",
            objectID: "123",
            points: 42,
            num_comments: 10,
            author: "alice",
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
      }),
    });

    const results = await provider.search("test query", 5);
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("Show HN: My project");
    expect(results[0].url).toBe("https://example.com");
    expect(results[0].snippet).toContain("42 points");
  });

  it("returns empty on API failure", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const results = await provider.search("fail", 5);
    expect(results).toEqual([]);
  });

  it("handles missing URL (falls back to HN link)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        hits: [
          {
            title: "Discussion",
            url: null,
            objectID: "456",
            points: 5,
          },
        ],
      }),
    });

    const results = await provider.search("test", 5);
    expect(results.length).toBe(1);
    expect(results[0].url).toContain("news.ycombinator.com/item?id=456");
  });
});

describe("GitHubProvider", () => {
  const provider = new GitHubProvider();

  it("has kind 'custom'", () => {
    expect(provider.kind).toBe("custom");
  });

  it("returns repo results from API", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            full_name: "user/repo",
            description: "A test repository",
            html_url: "https://github.com/user/repo",
            stargazers_count: 100,
            forks_count: 20,
            language: "TypeScript",
            updated_at: "2026-01-15T10:00:00Z",
          },
        ],
      }),
    });

    const results = await provider.search("test", 5);
    expect(results.length).toBe(1);
    expect(results[0].url).toBe("https://github.com/user/repo");
    expect(results[0].snippet).toContain("Stars: 100");
    expect(results[0].snippet).toContain("TypeScript");
  });

  it("returns empty on API failure", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const results = await provider.search("fail", 5);
    expect(results).toEqual([]);
  });

  it("handles empty results", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });

    const results = await provider.search("nothing", 5);
    expect(results).toEqual([]);
  });
});
