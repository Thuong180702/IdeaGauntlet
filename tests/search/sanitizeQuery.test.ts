import { describe, it, expect } from "vitest";
import { sanitizeQuery, generateQueries } from "../../src/search/searchOrchestrator.js";

describe("sanitizeQuery", () => {
  it("strips control characters", () => {
    expect(sanitizeQuery("hello\nworld\ttab")).toBe("hello world tab");
  });

  it("replaces null bytes with space", () => {
    expect(sanitizeQuery("hello\x00world")).toBe("hello world");
  });

  it("removes shell metacharacters", () => {
    expect(sanitizeQuery("test`whoami`cmd$var")).toBe("testwhoamicmdvar");
  });

  it("collapses whitespace", () => {
    expect(sanitizeQuery("  multiple   spaces  ")).toBe("multiple spaces");
  });

  it("trims leading/trailing whitespace", () => {
    expect(sanitizeQuery("  hello  ")).toBe("hello");
  });

  it("limits length to 200 characters", () => {
    const long = "a".repeat(300);
    const result = sanitizeQuery(long);
    expect(result.length).toBe(200);
  });

  it("handles empty string", () => {
    expect(sanitizeQuery("")).toBe("");
  });

  it("preserves legitimate search operators", () => {
    const q = 'idea "quoted phrase" OR alternative -exclude';
    const result = sanitizeQuery(q);
    expect(result).toContain('"quoted phrase"');
    expect(result).toContain("OR");
    expect(result).toContain("-exclude");
  });
});

describe("generateQueries with sanitization", () => {
  it("sanitizes idea text in generated queries", () => {
    const queries = generateQueries({
      idea: "test\x00idea\nwith\rcrap",
      stage: "napkin",
      mode: "quick",
    } as any, "quick");

    for (const q of queries) {
      expect(q).not.toContain("\x00");
      expect(q).not.toContain("\n");
      expect(q).not.toContain("\r");
    }
  });
});
