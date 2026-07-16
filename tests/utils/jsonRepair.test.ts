import { describe, it, expect } from "vitest";
import { extractJSON, safeParseJSON, stripMarkdownFences } from "../../src/utils/jsonRepair.js";

describe("jsonRepair", () => {
  describe("stripMarkdownFences", () => {
    it("strips ```json fences", () => {
      const input = "```json\n{\"a\": 1}\n```";
      expect(stripMarkdownFences(input)).toBe('{"a": 1}');
    });

    it("strips ```JSON fences (uppercase)", () => {
      const input = "```JSON\n{\"b\": 2}\n```";
      expect(stripMarkdownFences(input)).toBe('{"b": 2}');
    });

    it("strips plain ``` fences", () => {
      const input = "```\n{\"c\": 3}\n```";
      expect(stripMarkdownFences(input)).toBe('{"c": 3}');
    });

    it("handles no fences", () => {
      expect(stripMarkdownFences('{"d": 4}')).toBe('{"d": 4}');
    });

    it("handles empty/undefined input", () => {
      expect(stripMarkdownFences("")).toBe("");
    });
  });

  describe("extractJSON", () => {
    it("parses clean JSON", () => {
      const result = extractJSON('{"key": "value"}');
      expect(result).toEqual({ key: "value" });
    });

    it("parses JSON wrapped in markdown fences", () => {
      const result = extractJSON('```json\n{"key": "value"}\n```');
      expect(result).toEqual({ key: "value" });
    });

    it("parses JSON with leading prose", () => {
      const result = extractJSON('Here is my analysis:\n\n{"verdict": "strong"}');
      expect(result).toEqual({ verdict: "strong" });
    });

    it("parses JSON with trailing text", () => {
      const result = extractJSON('{"score": 8}\n\nThat is my assessment.');
      expect(result).toEqual({ score: 8 });
    });

    it("parses JSON arrays", () => {
      const result = extractJSON('[1, 2, 3]');
      expect(result).toEqual([1, 2, 3]);
    });

    it("parses nested JSON", () => {
      const result = extractJSON('{"a": {"b": {"c": [1, 2]}}}');
      expect(result).toEqual({ a: { b: { c: [1, 2] } } });
    });

    it("handles strings with braces in values", () => {
      const result = extractJSON('{"text": "contains } brace"}');
      expect(result).toEqual({ text: "contains } brace" });
    });

    it("handles strings with escaped quotes", () => {
      const result = extractJSON('{"text": "he said \\"hello\\""}');
      expect(result).toEqual({ text: 'he said "hello"' });
    });

    it("returns null for non-JSON", () => {
      expect(extractJSON("no json here")).toBeNull();
    });

    it("returns null for empty input", () => {
      expect(extractJSON("")).toBeNull();
    });

    it("returns null for malformed JSON", () => {
      expect(extractJSON('{"key": "missing close"')).toBeNull();
    });

    it("finds first JSON object in mixed text", () => {
      const result = extractJSON('text {"first": true} more text {"second": true}');
      expect(result).toEqual({ first: true });
    });
  });

  describe("safeParseJSON", () => {
    it("returns parsed value on success", () => {
      const result = safeParseJSON('{"x": 5}', { x: 0 });
      expect(result).toEqual({ x: 5 });
    });

    it("returns fallback on failure", () => {
      const fallback = { default: true };
      const result = safeParseJSON("not json", fallback);
      expect(result).toEqual(fallback);
    });

    it("returns fallback on empty input", () => {
      const fallback = "default";
      expect(safeParseJSON("", fallback)).toBe("default");
    });
  });
});
