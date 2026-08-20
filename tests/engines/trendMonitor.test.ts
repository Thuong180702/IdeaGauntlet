import { describe, it, expect, afterEach } from "vitest";
import { existsSync, rmSync, unlinkSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { saveReport } from "../../src/history/historyStore.js";
import { analyzeTrend, formatTrendResult, listTrendableIdeas } from "../../src/engines/trendMonitor.js";
import type { GauntletReport } from "../../src/core/types.js";
import type { ResearchBrief } from "../../src/search/types.js";

// analyzeTrend calls loadReport(ideaId) without a workspaceDir, defaulting to process.cwd().
// We must save test reports to the default cwd history dir and clean up after each test.
const HISTORY_DIR = resolve(process.cwd(), ".idea-gauntlet/history");
// Track IDs created during tests so we can remove just those files
const createdIds: string[] = [];

function saveTestReport(report: GauntletReport): void {
  saveReport(report); // no workspaceDir → uses cwd
  createdIds.push(report.id);
}

function cleanupTestReports(): void {
  while (createdIds.length > 0) {
    const id = createdIds.pop()!;
    const path = resolve(HISTORY_DIR, `${id}.json`);
    try {
      if (existsSync(path)) unlinkSync(path);
    } catch (_) { /* ignore */ }
  }
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeResearchBrief = (overrides: Partial<ResearchBrief> = {}): ResearchBrief => ({
  queries: ["test query"],
  results: [
    { title: "Competitor A", url: "https://competitor-a.com", snippet: "A focus tool for teams." },
    { title: "Competitor B", url: "https://competitor-b.com", snippet: "Another focus tool." },
  ],
  summary: "Test research brief summary.",
  searchedAt: new Date().toISOString(),
  competitorLandscape: {
    competitors: [
      { name: "Competitor A", url: "https://competitor-a.com", type: "direct", pricing: "$10/mo" },
      { name: "Competitor B", url: "https://competitor-b.com", type: "indirect" },
    ],
    saturationLevel: "medium",
    analysisNote: "Medium saturation market.",
  },
  nicheOpportunities: [
    { type: "pricing_gap", description: "No free tier exists.", evidence: "All tools are paid.", wedgeIdea: "Build freemium.", whyNow: "Users want free options." },
  ],
  ...overrides,
});

const makeSavedReport = (id: string, webResearch?: ResearchBrief): GauntletReport => ({
  id,
  createdAt: "2026-07-01T09:00:00.000Z",
  mode: "quick",
  input: { idea: "A focus-room app for remote workers" },
  verdict: "unclear",
  scores: { clarity: 6, pain: 5, differentiation: 4, buildability: 7, distribution: 3, monetization: 3, evidence: 2 },
  markdown: "# Test Report\nContent here.",
  webResearch,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("trendMonitor", () => {
  afterEach(cleanupTestReports);

  describe("analyzeTrend", () => {
    it("returns null if old report does not exist", () => {
      const result = analyzeTrend("nonexistent-id-xyz", makeResearchBrief());
      expect(result).toBeNull();
    });

    it("returns null if old report has no webResearch", () => {
      const id = "test-no-research-trend";
      saveTestReport(makeSavedReport(id)); // no webResearch
      const result = analyzeTrend(id, makeResearchBrief());
      expect(result).toBeNull();
    });

    it("detects new competitors added since last research", () => {
      const id = "test-new-competitor-trend";
      const oldBrief = makeResearchBrief({
        competitorLandscape: {
          competitors: [{ name: "Competitor A", url: "https://competitor-a.com", type: "direct" }],
          saturationLevel: "low",
          analysisNote: "Low saturation.",
        },
      });
      saveTestReport(makeSavedReport(id, oldBrief));

      const newBrief = makeResearchBrief(); // includes Competitor B
      const result = analyzeTrend(id, newBrief);

      expect(result).not.toBeNull();
      expect(result!.newCompetitors.some((c) => c.name === "Competitor B")).toBe(true);
    });

    it("detects lost competitors removed since last research", () => {
      const id = "test-lost-competitor-trend";
      saveTestReport(makeSavedReport(id, makeResearchBrief())); // has Competitor A + B

      const newBrief = makeResearchBrief({
        competitorLandscape: {
          competitors: [{ name: "Competitor A", url: "https://competitor-a.com", type: "direct" }],
          saturationLevel: "low",
          analysisNote: "Reduced saturation.",
        },
      });
      const result = analyzeTrend(id, newBrief);

      expect(result).not.toBeNull();
      expect(result!.lostCompetitors).toContain("competitor b");
    });

    it("detects saturation level change", () => {
      const id = "test-saturation-change-trend";
      const oldBrief = makeResearchBrief({
        competitorLandscape: { competitors: [], saturationLevel: "low", analysisNote: "Low." },
      });
      saveTestReport(makeSavedReport(id, oldBrief));

      const newBrief = makeResearchBrief({
        competitorLandscape: { competitors: [], saturationLevel: "high", analysisNote: "High." },
      });
      const result = analyzeTrend(id, newBrief);

      expect(result).not.toBeNull();
      expect(result!.saturationChanged).toBe(true);
      expect(result!.previousSaturation).toBe("low");
      expect(result!.currentSaturation).toBe("high");
    });

    it("detects new niche opportunities", () => {
      const id = "test-new-niche-trend";
      saveTestReport(makeSavedReport(id, makeResearchBrief({ nicheOpportunities: [] })));

      const newBrief = makeResearchBrief(); // has a niche opportunity
      const result = analyzeTrend(id, newBrief);

      expect(result).not.toBeNull();
      expect(result!.nicheChanges.length).toBeGreaterThan(0);
    });

    it("reports no changes when research is identical", () => {
      const id = "test-identical-research-trend";
      saveTestReport(makeSavedReport(id, makeResearchBrief()));

      const result = analyzeTrend(id, makeResearchBrief());

      expect(result).not.toBeNull();
      expect(result!.newCompetitors).toHaveLength(0);
      expect(result!.lostCompetitors).toHaveLength(0);
      expect(result!.saturationChanged).toBe(false);
    });

    it("includes ideaId and idea text in result", () => {
      const id = "test-meta-trend";
      saveTestReport(makeSavedReport(id, makeResearchBrief()));

      const result = analyzeTrend(id, makeResearchBrief());

      expect(result).not.toBeNull();
      expect(result!.ideaId).toBe(id);
      expect(result!.idea).toBe("A focus-room app for remote workers");
    });
  });

  describe("formatTrendResult", () => {
    it("renders a readable markdown report", () => {
      const trend = {
        ideaId: "report-abc",
        idea: "A focus-room app",
        previousAt: "2026-07-01T00:00:00Z",
        currentAt: "2026-08-01T00:00:00Z",
        newCompetitors: [{ name: "NewCo", url: "https://newco.io" }],
        lostCompetitors: ["OldCo"],
        newSearchResults: [],
        saturationChanged: true,
        previousSaturation: "low" as const,
        currentSaturation: "medium" as const,
        nicheChanges: ["New pricing gap detected."],
      };

      const output = formatTrendResult(trend);
      expect(output).toContain("Trend Monitoring Report");
      expect(output).toContain("NewCo");
      expect(output).toContain("OldCo");
      expect(output).toContain("Saturation Changed");
      expect(output).toContain("New Niche Opportunities");
      expect(output).toContain("New pricing gap detected");
    });

    it("shows no-changes message when nothing changed", () => {
      const trend = {
        ideaId: "report-quiet",
        idea: "A focus-room app",
        previousAt: "2026-07-01T00:00:00Z",
        currentAt: "2026-08-01T00:00:00Z",
        newCompetitors: [],
        lostCompetitors: [],
        newSearchResults: [],
        saturationChanged: false,
        nicheChanges: [],
      };

      const output = formatTrendResult(trend);
      expect(output).toContain("No significant changes detected");
    });
  });

  describe("listTrendableIdeas", () => {
    it("returns an empty array or array of valid entries without throwing", () => {
      const ideas = listTrendableIdeas();
      expect(Array.isArray(ideas)).toBe(true);
      for (const i of ideas) {
        expect(i).toHaveProperty("id");
        expect(i).toHaveProperty("idea");
        expect(i).toHaveProperty("mode");
        expect(i).toHaveProperty("createdAt");
      }
    });

    it("includes saved reports that have webResearch in listTrendableIdeas", () => {
      const id = "test-trendable-list";
      saveTestReport(makeSavedReport(id, makeResearchBrief()));

      const ideas = listTrendableIdeas();
      const found = ideas.some((i) => i.id === id);
      expect(found).toBe(true);
    });
  });
});
