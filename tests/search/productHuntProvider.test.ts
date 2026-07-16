import { describe, it, expect, vi, afterEach } from "vitest";
import { ProductHuntProvider } from "../../src/search/productHuntProvider.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

afterEach(() => {
  mockFetch.mockReset();
});

describe("ProductHuntProvider", () => {
  const provider = new ProductHuntProvider();

  it("has kind 'custom'", () => {
    expect(provider.kind).toBe("custom");
  });

  it("returns results from GraphQL API", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          search: {
            edges: [
              {
                node: {
                  name: "Cool Product",
                  tagline: "The best product ever",
                  description: "A detailed description of the product",
                  website: "https://cool-product.com",
                  url: "https://www.producthunt.com/posts/cool-product",
                  votesCount: 500,
                  topics: { edges: [{ node: { name: "Productivity" } }] },
                },
              },
            ],
          },
        },
      }),
    });

    const results = await provider.search("productivity tool", 5);
    expect(results.length).toBe(1);
    expect(results[0].url).toContain("cool-product");
    expect(results[0].snippet).toContain("detailed description");
  });

  it("returns empty on API failure", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const results = await provider.search("fail", 5);
    expect(results).toEqual([]);
  });

  it("handles missing edges gracefully", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { search: { edges: [] } } }),
    });

    const results = await provider.search("nothing", 5);
    expect(results).toEqual([]);
  });

  it("handles malformed GraphQL response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ errors: [{ message: "Bad query" }] }),
    });

    const results = await provider.search("error", 5);
    expect(results).toEqual([]);
  });
});
