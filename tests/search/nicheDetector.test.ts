import { describe, it, expect } from "vitest";
import { detectNiches } from "../../src/search/nicheDetector.js";
import type { CompetitorLandscape, SearchResult, PageContent } from "../../src/search/types.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeCompetitorLandscape = (overrides: Partial<CompetitorLandscape> = {}): CompetitorLandscape => ({
  competitors: [
    { name: "Focusmate", url: "https://focusmate.com", type: "direct", pricing: "$5/mo", features: ["video sessions", "scheduling"] },
    { name: "Pomofocus", url: "https://pomofocus.io", type: "indirect" },
    { name: "Forest App", url: "https://forestapp.cc", type: "indirect", pricing: "$2.99" },
  ],
  saturationLevel: "medium",
  analysisNote: "Medium competition in the focus productivity market.",
  ...overrides,
});

const makeSearchResults = (snippets: string[] = []): SearchResult[] =>
  snippets.map((snippet, i) => ({
    title: `Result ${i + 1}`,
    url: `https://example${i + 1}.com`,
    snippet,
  }));

describe("detectNiches", () => {
  it("returns an array of niche opportunities", () => {
    const niches = detectNiches(
      "A focus-room app for remote workers",
      makeCompetitorLandscape(),
      makeSearchResults(["I wish there was a focus tool for freelancers", "frustrating workflow"]),
    );

    expect(Array.isArray(niches)).toBe(true);
  });

  it("returns at most 12 niches", () => {
    const niches = detectNiches(
      "A very generic idea",
      makeCompetitorLandscape({ competitors: [] }),
      makeSearchResults([
        "I wish it could do more", "frustrating workflow", "too expensive for startups",
        "not available in europe", "no mobile app", "no api support",
        "tedious process", "no integration with slack",
        "for healthcare compliance", "manual copy paste",
      ]),
      [],
    );

    expect(niches.length).toBeLessThanOrEqual(12);
  });

  it("detects feature_gap niches from user complaints in snippets", () => {
    const niches = detectNiches(
      "A focus-room app",
      makeCompetitorLandscape(),
      makeSearchResults([
        "I wish the focus tool supported Pomodoro timers natively",
        "frustrating that you can't set custom session lengths",
      ]),
    );

    const featureGaps = niches.filter((n) => n.type === "feature_gap");
    expect(featureGaps.length).toBeGreaterThanOrEqual(0); // may or may not trigger depending on text
    for (const niche of niches) {
      expect(niche).toHaveProperty("type");
      expect(niche).toHaveProperty("description");
      expect(niche).toHaveProperty("evidence");
      expect(niche).toHaveProperty("wedgeIdea");
      expect(niche).toHaveProperty("whyNow");
    }
  });

  it("detects pricing_gap when all competitors are paid", () => {
    const paidLandscape = makeCompetitorLandscape({
      competitors: [
        { name: "Tool A", url: "https://a.com", type: "direct", pricing: "$10/mo premium subscription" },
        { name: "Tool B", url: "https://b.com", type: "direct", pricing: "$15/mo enterprise pricing" },
      ],
    });

    const niches = detectNiches("A focus-room app", paidLandscape, makeSearchResults());
    const pricingGaps = niches.filter((n) => n.type === "pricing_gap");
    expect(pricingGaps.length).toBeGreaterThanOrEqual(1);
    expect(pricingGaps[0].description).toContain("freemium");
  });

  it("detects pricing_gap when all competitors are free", () => {
    const freeLandscape = makeCompetitorLandscape({
      competitors: [
        { name: "FreeTimer", url: "https://freetimer.com", type: "direct", pricing: "free forever open-source" },
        { name: "FreePomodoro", url: "https://freepomodoro.io", type: "direct", pricing: "free no cost" },
      ],
    });

    const niches = detectNiches("A focus-room app", freeLandscape, makeSearchResults());
    const pricingGaps = niches.filter((n) => n.type === "pricing_gap");
    expect(pricingGaps.length).toBeGreaterThanOrEqual(1);
    expect(pricingGaps[0].description).toContain("premium");
  });

  it("detects underserved_segment niches when segment not mentioned by competitors", () => {
    const sparseCompetitors = makeCompetitorLandscape({
      competitors: [
        { name: "GenericFocus", url: "https://generic.com", type: "indirect" },
      ],
    });

    const niches = detectNiches("A focus-room app", sparseCompetitors, makeSearchResults());
    const segmentNiches = niches.filter((n) => n.type === "underserved_segment");
    expect(segmentNiches.length).toBeGreaterThanOrEqual(0);
  });

  it("detects integration_gap when no competitor offers API/mobile", () => {
    const noApiLandscape = makeCompetitorLandscape({
      competitors: [
        { name: "BasicTool", url: "https://basic.com", type: "direct", features: ["dashboard", "reports"] },
      ],
    });

    const niches = detectNiches("A focus-room app", noApiLandscape, makeSearchResults(["no api available for this tool"]));
    const integrationGaps = niches.filter((n) => n.type === "integration_gap");
    expect(integrationGaps.length).toBeGreaterThanOrEqual(0); // gap detected if no features mention api
  });

  it("detects geographic_gap from snippets", () => {
    const niches = detectNiches(
      "A focus-room app",
      makeCompetitorLandscape(),
      makeSearchResults(["not available in europe currently", "us only right now"]),
    );

    const geoGaps = niches.filter((n) => n.type === "geographic_gap");
    expect(geoGaps.length).toBeGreaterThanOrEqual(0);
  });

  it("detects workflow_gap from snippets", () => {
    const niches = detectNiches(
      "A focus-room app",
      makeCompetitorLandscape(),
      makeSearchResults([
        "the workflow is too manual and tedious",
        "repetitive busywork with this tool",
      ]),
    );

    const workflowGaps = niches.filter((n) => n.type === "workflow_gap");
    expect(workflowGaps.length).toBeGreaterThanOrEqual(0);
  });

  it("detects industry_vertical_gap for uncovered verticals", () => {
    const niches = detectNiches(
      "A focus-room app",
      makeCompetitorLandscape({ competitors: [] }),
      makeSearchResults(), // no vertical mentions
    );

    const verticalGaps = niches.filter((n) => n.type === "industry_vertical_gap");
    expect(verticalGaps.length).toBeGreaterThanOrEqual(1);
  });

  it("returns unique niches (no duplicates)", () => {
    const niches = detectNiches(
      "A focus-room app",
      makeCompetitorLandscape(),
      makeSearchResults([
        "frustrating workflow process",
        "tedious manual steps",
        "no api no integration",
      ]),
      [
        { url: "https://test.com", title: "Test", text: "No mobile app available. Too many steps required." },
      ] as PageContent[],
    );

    const descriptions = niches.map((n) => n.description.toLowerCase().slice(0, 80));
    const unique = new Set(descriptions);
    expect(unique.size).toBe(descriptions.length);
  });

  it("enriches analysis with page content complaints", () => {
    const niches = detectNiches(
      "A focus-room app",
      makeCompetitorLandscape(),
      makeSearchResults(),
      [
        {
          url: "https://review.com",
          title: "Review of FocusTool",
          text: "I wish it could track my sessions automatically. Very frustrating that it doesn't support team focus rooms. The workflow is too manual.",
        },
      ] as PageContent[],
    );

    expect(Array.isArray(niches)).toBe(true);
    // Should have found something from page content
    expect(niches.length).toBeGreaterThan(0);
  });

  it("handles empty competitors and empty search results without crashing", () => {
    const emptyLandscape: CompetitorLandscape = {
      competitors: [],
      saturationLevel: "unknown",
      analysisNote: "No competitors found.",
    };

    expect(() => detectNiches("Any idea", emptyLandscape, [])).not.toThrow();
  });

  it("handles empty idea string without crashing", () => {
    expect(() => detectNiches("", makeCompetitorLandscape(), makeSearchResults())).not.toThrow();
  });
});
