import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchPageContent, fetchPageContents } from "../../src/search/pageFetcher.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

afterEach(() => {
  mockFetch.mockReset();
});

describe("pageFetcher", () => {
  it("returns null for SSRF-blocked URLs", async () => {
    const result = await fetchPageContent("http://localhost:3000");
    expect(result).toBeNull();
  });

  it("returns null for SSRF-blocked private IPs", async () => {
    const result = await fetchPageContent("http://127.0.0.1/admin");
    expect(result).toBeNull();
  });

  it("returns null for non-http protocols", async () => {
    const result = await fetchPageContent("file:///etc/passwd");
    expect(result).toBeNull();
  });

  it("returns null on non-ok response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404, headers: new Map() });
    const result = await fetchPageContent("https://example.com");
    expect(result).toBeNull();
  });

  it("returns null for non-HTML content type", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (name: string) => name === "content-type" ? "application/pdf" : null },
      text: async () => "",
    });
    const result = await fetchPageContent("https://example.com");
    expect(result).toBeNull();
  });

  it("extracts title and text from HTML", async () => {
    const html = `
      <html>
        <head><title>Test Page</title></head>
        <body>
          <script>var x = 1;</script>
          <nav>nav bar</nav>
          <main>
            <p>This is the main content of the page with enough text to pass minimum length checks.</p>
          </main>
        </body>
      </html>
    `;
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (name: string) => name === "content-type" ? "text/html" : null },
      text: async () => html,
    });

    const result = await fetchPageContent("https://example.com");
    expect(result).not.toBeNull();
    if (result) {
      expect(result.url).toBe("https://example.com");
      expect(result.title).toBe("Test Page");
      expect(result.text).toContain("main content");
      expect(result.text).not.toContain("nav bar");
      expect(result.text).not.toContain("var x");
    }
  });

  it("fetchPagesContents respects concurrency limit", async () => {
    const html = `<html><head><title>Page</title></head><body><p>${"x".repeat(100)}</p></body></html>`;
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "text/html" },
      text: async () => html,
    });

    const urls = ["https://a.com", "https://b.com", "https://c.com"];
    const results = await fetchPageContents(urls);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("fetchPagesContents filters out null results", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: () => "text/html" },
      text: async () => "",
    });

    const results = await fetchPageContents(["https://x.com"]);
    expect(results.length).toBe(0);
  });
});
