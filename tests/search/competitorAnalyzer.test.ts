import { describe, it, expect } from "vitest";
import { analyzeCompetitors } from "../../src/search/competitorAnalyzer.js";
import { detectNiches } from "../../src/search/nicheDetector.js";
import type { SearchResult, PageContent } from "../../src/search/types.js";

describe("competitorAnalyzer", () => {
  const sampleResults: SearchResult[] = [
    { title: "Notion", url: "https://notion.so", snippet: "All-in-one workspace" },
    { title: "Obsidian", url: "https://obsidian.md", snippet: "Knowledge management" },
    { title: "Roam Research", url: "https://roamresearch.com", snippet: "Networked thought" },
    { title: "Notion Blog", url: "https://notion.so/blog", snippet: "Tips and tricks" },
    { title: "Reddit thread", url: "https://reddit.com/r/productivity", snippet: "Discussion" },
  ];

  it("extracts unique competitors from search results", () => {
    const landscape = analyzeCompetitors("note-taking app", sampleResults);
    expect(landscape.competitors.length).toBeGreaterThan(0);
    // Dedup is by name — Notion and Notion Blog are different names
    // Reddit is filtered as generic/social
    const names = landscape.competitors.map(c => c.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it("assigns a saturation level", () => {
    const landscape = analyzeCompetitors("test idea", sampleResults);
    expect(["low", "medium", "high", "unknown"]).toContain(landscape.saturationLevel);
  });

  it("generates analysis note", () => {
    const landscape = analyzeCompetitors("test idea", sampleResults);
    expect(landscape.analysisNote).toBeTruthy();
    expect(typeof landscape.analysisNote).toBe("string");
  });

  it("handles empty results gracefully", () => {
    const landscape = analyzeCompetitors("test idea", []);
    expect(landscape.competitors).toEqual([]);
    expect(landscape.saturationLevel).toBe("unknown");
  });

  it("incorporates page content for richer analysis", () => {
    const pages: PageContent[] = [
      {
        url: "https://notion.so",
        title: "Notion",
        text: "Pricing: Free, Plus, Business, Enterprise tiers available",
      },
    ];

    const landscape = analyzeCompetitors("test", sampleResults, pages);
    const notion = landscape.competitors.find(c => c.url.includes("notion.so"));
    if (notion) {
      expect(notion.pricing).toBeTruthy();
    }
  });
});

describe("nicheDetector", () => {
  const sampleResults: SearchResult[] = [
    { title: "Mainstream tool", url: "https://example.com", snippet: "General tool for everyone" },
    { title: "Niche forum discussion", url: "https://forum.example.com", snippet: "Looking for tool for left-handed users" },
  ];

  it("returns array of niche opportunities", () => {
    const niches = detectNiches("test idea", {
      competitors: [],
      saturationLevel: "high",
      analysisNote: "Market is saturated",
    }, sampleResults);
    expect(Array.isArray(niches)).toBe(true);
  });

  it("handles empty results", () => {
    const niches = detectNiches("test", {
      competitors: [],
      saturationLevel: "unknown",
      analysisNote: "",
    }, []);
    expect(Array.isArray(niches)).toBe(true);
  });
});
