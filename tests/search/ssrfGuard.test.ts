import { describe, it, expect } from "vitest";
import { isSafeUrl } from "../../src/search/ssrfGuard.js";

describe("ssrfGuard", () => {
  const SAFE = [
    "https://example.com",
    "http://example.com/page",
    "https://sub.domain.example.com/path?q=1",
    "https://api.github.com/repos",
    "https://news.ycombinator.com/item?id=42",
  ];

  const UNSAFE = [
    "http://localhost",
    "http://localhost:8080",
    "http://127.0.0.1",
    "http://127.0.0.1:3000",
    "http://10.0.0.1",
    "http://192.168.1.1",
    "http://172.16.0.1",
    "http://172.31.255.255",
    "http://0.0.0.0",
    "http://169.254.169.254", // cloud metadata
    "http://metadata.google.internal",
    "http://[::1]",
    "http://fe80::1",
    "ftp://example.com", // non-http(s)
    "file:///etc/passwd",
    "javascript:alert(1)",
    "",
    "not-a-url",
    "http://my-service.local",
    "http://internal.api.internal",
  ];

  it("allows safe public URLs", () => {
    for (const url of SAFE) {
      expect(isSafeUrl(url)).toBe(true);
    }
  });

  it("blocks private/local IPs and metadata endpoints", () => {
    for (const url of UNSAFE) {
      expect(isSafeUrl(url)).toBe(false);
    }
  });

  it("allows 172.15.x.x (public 172 range)", () => {
    expect(isSafeUrl("http://172.15.0.1")).toBe(true);
  });

  it("allows 172.32.x.x (public 172 range)", () => {
    expect(isSafeUrl("http://172.32.0.1")).toBe(true);
  });

  it("blocks 172.16-31.x.x (private 172 range)", () => {
    expect(isSafeUrl("http://172.20.0.1")).toBe(false);
    expect(isSafeUrl("http://172.31.0.1")).toBe(false);
  });
});
