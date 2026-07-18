import { describe, it, expect } from "vitest";
import { generateReportCard } from "../../src/visualization/reportCard.js";
import type { GauntletReport } from "../../src/core/types.js";

function baseReport(over: Partial<GauntletReport> = {}): GauntletReport {
  return {
    id: "t1",
    createdAt: "2026-07-18T00:00:00.000Z",
    mode: "quick",
    input: { idea: "A focus-room app for remote workers", mode: "quick" },
    verdict: "promising_but_risky",
    scores: { clarity: 8, pain: 6, differentiation: 5, buildability: 7, distribution: 3, monetization: 4, evidence: 2 },
    brutalTakeaway: "You are selling discipline, not software — retention dies once the novelty wears off.",
    risks: [
      { title: "Retention collapse after week 2", severity: "high", explanation: "" },
      { title: "CAC too high for the price point", severity: "high", explanation: "" },
    ],
    markdown: "",
    ...over,
  };
}

describe("generateReportCard", () => {
  it("renders verdict, overall score, radar, takeaway and install line", () => {
    const html = generateReportCard(baseReport());
    expect(html).toContain("PROMISING BUT RISKY");
    expect(html).toContain("/10 overall");
    expect(html).toContain("<svg"); // radar
    expect(html).toContain("selling discipline");
    expect(html).toContain("npm i -g idea-gauntlet");
    expect(html).toContain("Retention collapse after week 2");
  });

  it("is a fixed-size 1200x630 self-contained card (no external assets)", () => {
    const html = generateReportCard(baseReport());
    expect(html).toContain("width: 1200px");
    expect(html).toContain("height: 630px");
    // No external asset loading (SVG xmlns namespace URIs are fine).
    expect(html).not.toContain("<link");
    expect(html).not.toMatch(/src\s*=\s*["']https?:/);
    expect(html).not.toMatch(/@import|url\(https?:/);
  });

  it("escapes HTML in the idea and takeaway (no injection)", () => {
    const html = generateReportCard(baseReport({
      input: { idea: "<script>alert(1)</script>", mode: "quick" },
      brutalTakeaway: "bad <img src=x onerror=1>",
    }));
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("derives a card from a court report (no top-level scores)", () => {
    const html = generateReportCard({
      id: "c1", createdAt: "2026-07-18T00:00:00.000Z", mode: "court",
      input: { idea: "Test", mode: "court" }, verdict: "weak", markdown: "",
      courtDebate: {
        ideaSnapshot: { idea: "Test", targetUser: "", market: "", stage: "", keyPromise: "" },
        assumptionsMap: [], roleArguments: [], crossExamination: "", evidenceAudit: "",
        verdictDetail: "Weak. No moat.", killTests: [{ title: "Landing page test", method: "", timeframe: "", successSignal: "", killSignal: "" }],
        scoresDetailed: [
          { dimension: "clarity", score: 5, reason: "" },
          { dimension: "pain", score: 3, reason: "" },
        ],
        nextActions: [],
      },
    } as GauntletReport);
    expect(html).toContain("WEAK");
    expect(html).toContain("<svg");
    expect(html).toContain("Landing page test");
  });
});
