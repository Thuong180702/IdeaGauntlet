import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadIdeaInput } from "../../src/utils/loadIdeaFile.js";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";

describe("loadIdeaFile", () => {
  const scratchDir = resolve(process.cwd(), "tests/scratch_loadIdea");

  beforeEach(() => {
    if (existsSync(scratchDir)) rmSync(scratchDir, { recursive: true, force: true });
    mkdirSync(scratchDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(scratchDir)) rmSync(scratchDir, { recursive: true, force: true });
  });

  it("returns string as-is when not a file path", () => {
    const result = loadIdeaInput("just an idea string");
    expect(result).toBe("just an idea string");
  });

  it("returns file content when path has .md extension", () => {
    const testFile = resolve(scratchDir, "idea.md");
    writeFileSync(testFile, "My startup idea", "utf-8");
    const result = loadIdeaInput(testFile);
    expect(result).toBe("My startup idea");
  });

  it("throws on empty file", () => {
    const testFile = resolve(scratchDir, "empty.md");
    writeFileSync(testFile, "   ", "utf-8");
    expect(() => loadIdeaInput(testFile)).toThrow("File is empty");
  });

  it("returns original string when file does not exist (ENOENT)", () => {
    const nonExistent = resolve(scratchDir, "nonexistent.md");
    const result = loadIdeaInput(nonExistent);
    expect(result).toBe(nonExistent);
  });

  it("handles .txt extension", () => {
    const txtFile = resolve(scratchDir, "idea.txt");
    writeFileSync(txtFile, "Text file idea", "utf-8");
    const result = loadIdeaInput(txtFile);
    expect(result).toBe("Text file idea");
  });
});
