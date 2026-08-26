import { describe, it, expect } from "vitest";
import {
  verifyScoreProvenance,
  buildSourceIndex,
  isCitationSupported,
  formatBasisBadge,
} from "../../src/core/provenance.js";
import type { ResearchBrief } from "../../src/search/types.js";
import type { Scorecard, ScoreRubricEntry } from "../../src/core/types.js";

function brief(overrides: Partial<ResearchBrief> = {}): ResearchBrief {
  return {
    queries: ["focus room app"],
    results: [
      { title: "Focusmate — Virtual Coworking", url: "https://www.focusmate.com/", snippet: "" },
      { title: "Caveday pricing", url: "https://caveday.org/pricing", snippet: "" },
    ],
    summary: "research summary",
    searchedAt: new Date().toISOString(),
    ...overrides,
  };
}

function rubric(
  entries: Partial<Record<keyof Scorecard, Partial<ScoreRubricEntry>>>,
): Partial<Record<keyof Scorecard, ScoreRubricEntry>> {
  const out: Partial<Record<keyof Scorecard, ScoreRubricEntry>> = {};
  for (const [k, v] of Object.entries(entries)) {
    out[k as keyof Scorecard] = { evidence: "e", sensitivity: "s", ...v } as ScoreRubricEntry;
  }
  return out;
}

describe("isCitationSupported", () => {
  const index = buildSourceIndex(brief());

  it("matches an exact retrieved URL", () => {
    expect(isCitationSupported("https://www.focusmate.com/", index)).toBe(true);
  });

  it("matches ignoring scheme, www, and trailing slash", () => {
    expect(isCitationSupported("focusmate.com", index)).toBe(true);
    expect(isCitationSupported("http://focusmate.com", index)).toBe(true);
  });

  it("matches a path that extends a retrieved path", () => {
    expect(isCitationSupported("https://caveday.org/pricing/teams", index)).toBe(true);
  });

  it("matches a retrieved title, and a shortened form of it", () => {
    expect(isCitationSupported("Focusmate — Virtual Coworking", index)).toBe(true);
    expect(isCitationSupported("Focusmate", index)).toBe(true);
  });

  // The whole point: a plausible-looking source the run never retrieved.
  it("rejects a hallucinated URL", () => {
    expect(isCitationSupported("https://techcrunch.com/2024/focus-apps", index)).toBe(false);
  });

  it("rejects a hallucinated publication name", () => {
    expect(isCitationSupported("Gartner Magic Quadrant 2024", index)).toBe(false);
  });

  it("rejects noise-length fragments", () => {
    expect(isCitationSupported("a", index)).toBe(false);
    expect(isCitationSupported("", index)).toBe(false);
  });

  it("matches nothing when no research was retrieved", () => {
    const empty = buildSourceIndex(undefined);
    expect(empty.empty).toBe(true);
    expect(isCitationSupported("https://www.focusmate.com/", empty)).toBe(false);
  });
});

describe("verifyScoreProvenance", () => {
  it("marks a dimension sourced when its citation is in the brief", () => {
    const { rubric: out, calibration } = verifyScoreProvenance(
      rubric({ differentiation: { citations: ["https://www.focusmate.com/"] } }),
      brief(),
    );
    expect(out?.differentiation?.basis).toBe("sourced");
    expect(out?.differentiation?.citations).toEqual(["https://www.focusmate.com/"]);
    expect(calibration.sourcedCount).toBe(1);
    expect(calibration.judgmentCount).toBe(0);
  });

  // The core guarantee: the model cannot self-certify.
  it("downgrades to judgment when every claimed citation is hallucinated", () => {
    const { rubric: out, calibration } = verifyScoreProvenance(
      rubric({
        differentiation: {
          basis: "sourced",
          citations: ["https://techcrunch.com/made-up", "Gartner 2024"],
        },
      }),
      brief(),
    );
    expect(out?.differentiation?.basis).toBe("judgment");
    expect(out?.differentiation?.citations).toBeUndefined();
    expect(out?.differentiation?.unverifiedCitations).toEqual([
      "https://techcrunch.com/made-up",
      "Gartner 2024",
    ]);
    expect(calibration.sourcedCount).toBe(0);
    expect(calibration.droppedCitationCount).toBe(2);
  });

  it("ignores a bare basis claim carrying no citations", () => {
    const { rubric: out } = verifyScoreProvenance(
      rubric({ pain: { basis: "sourced" } }),
      brief(),
    );
    expect(out?.pain?.basis).toBe("judgment");
  });

  it("keeps verified citations and separates the unverified ones", () => {
    const { rubric: out, calibration } = verifyScoreProvenance(
      rubric({
        distribution: { citations: ["focusmate.com", "https://fake.example/report"] },
      }),
      brief(),
    );
    expect(out?.distribution?.basis).toBe("sourced");
    expect(out?.distribution?.citations).toEqual(["focusmate.com"]);
    expect(out?.distribution?.unverifiedCitations).toEqual(["https://fake.example/report"]);
    expect(calibration.droppedCitationCount).toBe(1);
  });

  it("marks everything judgment when research is unavailable", () => {
    const { rubric: out, calibration } = verifyScoreProvenance(
      rubric({
        pain: { citations: ["https://www.focusmate.com/"] },
        clarity: { citations: [] },
      }),
      undefined,
    );
    expect(out?.pain?.basis).toBe("judgment");
    expect(calibration.researchUnavailable).toBe(true);
    expect(calibration.sourcedCount).toBe(0);
    expect(calibration.judgmentCount).toBe(2);
    expect(calibration.note).toContain("model judgment");
  });

  it("does not count unassessed dimensions toward calibration", () => {
    const { calibration } = verifyScoreProvenance(
      rubric({
        pain: { citations: ["focusmate.com"] },
        distribution: { citations: ["focusmate.com"] },
      }),
      brief(),
      ["distribution"],
    );
    expect(calibration.assessedCount).toBe(1);
    expect(calibration.sourcedCount).toBe(1);
  });

  it("does not mutate the input rubric", () => {
    const input = rubric({ pain: { citations: ["https://fake.example/x"] } });
    verifyScoreProvenance(input, brief());
    expect(input.pain?.basis).toBeUndefined();
    expect(input.pain?.unverifiedCitations).toBeUndefined();
  });

  it("agrees in number when reporting dropped citations", () => {
    const one = verifyScoreProvenance(
      rubric({ pain: { citations: ["https://fake.example/a"] } }),
      brief(),
    ).calibration.note;
    expect(one).toContain("1 claimed citation was not found");
    expect(one).not.toMatch(/citation was .* were not counted/);

    const many = verifyScoreProvenance(
      rubric({ pain: { citations: ["https://fake.example/a", "https://fake.example/b"] } }),
      brief(),
    ).calibration.note;
    expect(many).toContain("2 claimed citations were not found");
  });

  it("returns an empty-safe result for a missing rubric", () => {
    const { rubric: out, calibration } = verifyScoreProvenance(undefined, brief());
    expect(out).toBeUndefined();
    expect(calibration.assessedCount).toBe(0);
    expect(calibration.note).toContain("No scored dimensions");
  });

  it("indexes competitor names and page contents as citable sources", () => {
    const withExtras = brief({
      pageContents: [{ url: "https://sunsama.com/pricing", title: "Sunsama Pricing", text: "" }],
      competitorLandscape: {
        competitors: [{ name: "Flown", url: "https://flown.com" } as any],
        saturationLevel: "medium",
        analysisNote: "",
      },
    });
    const index = buildSourceIndex(withExtras);
    expect(isCitationSupported("Sunsama Pricing", index)).toBe(true);
    expect(isCitationSupported("https://flown.com", index)).toBe(true);
    expect(isCitationSupported("Flown", index)).toBe(true);
  });
});

describe("formatBasisBadge", () => {
  it("renders the verified basis", () => {
    expect(formatBasisBadge({ evidence: "", sensitivity: "", basis: "sourced" })).toBe("sourced");
    expect(formatBasisBadge({ evidence: "", sensitivity: "", basis: "judgment" })).toBe("judgment");
  });

  it("renders a dash when provenance was never verified", () => {
    expect(formatBasisBadge(undefined)).toBe("—");
    expect(formatBasisBadge({ evidence: "", sensitivity: "" })).toBe("—");
  });
});
