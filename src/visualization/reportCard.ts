/**
 * Report Card — a single self-contained, screenshot-optimized HTML card.
 *
 * Sized 1200×630 (OG / Twitter preview) so a founder can screenshot the verdict
 * and share it. The output IS the marketing: it carries the brutal takeaway,
 * the score radar, and the install line. No external assets, no browser render
 * step — just open the HTML and screenshot.
 */

import type { GauntletReport, Scorecard } from "../core/types.js";
import { overallScore } from "../core/scoring.js";
import { generateRadarChart } from "./radarChart.js";

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const VERDICT_STYLE: Record<string, { label: string; color: string }> = {
  strong: { label: "STRONG", color: "#10b981" },
  promising_but_risky: { label: "PROMISING BUT RISKY", color: "#f59e0b" },
  unclear: { label: "UNCLEAR", color: "#94a3b8" },
  needs_real_evidence: { label: "NEEDS REAL EVIDENCE", color: "#f97316" },
  weak: { label: "WEAK", color: "#ef4444" },
  pivot_recommended: { label: "PIVOT RECOMMENDED", color: "#ef4444" },
};

const SCORECARD_KEYS: (keyof Scorecard)[] = [
  "clarity", "pain", "differentiation", "buildability",
  "distribution", "monetization", "evidence",
];

/** Map court's free-form scoresDetailed onto the 7 Scorecard dimensions. */
function scorecardFromDetailed(detailed: Array<{ dimension: string; score: number }>): Scorecard {
  const base: Scorecard = {
    clarity: 0, pain: 0, differentiation: 0, buildability: 0,
    distribution: 0, monetization: 0, evidence: 0,
  };
  for (const d of detailed) {
    const key = SCORECARD_KEYS.find((k) => d.dimension?.toLowerCase().includes(k));
    if (key) base[key] = clamp(d.score);
  }
  return base;
}

function clamp(n: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(10, Math.round(v)));
}

interface CardData {
  idea: string;
  verdict: string;
  scores?: Scorecard;
  unassessed: (keyof Scorecard)[];
  takeaway: string;
  risks: string[];
}

function extractCardData(report: GauntletReport): CardData {
  const idea = report.input?.idea ?? "";
  const verdict = report.verdict ?? "unclear";

  let scores = report.scores;
  if (!scores && report.courtDebate?.scoresDetailed?.length) {
    scores = scorecardFromDetailed(report.courtDebate.scoresDetailed);
  }

  const firstSentence = (s?: string) => s?.split(/(?<=[.!?])\s/)[0]?.trim();
  const takeaway =
    report.brutalTakeaway ??
    report.quickReport?.oneLineVerdict ??
    report.coreInsight ??
    firstSentence(report.courtDebate?.verdictDetail) ??
    "";

  let risks: string[] = [];
  if (report.risks?.length) risks = report.risks.map((r) => r.title);
  else if (report.courtDebate?.killTests?.length) risks = report.courtDebate.killTests.map((k) => k.title);
  else if (report.userSynthesis?.recurringObjections?.length) risks = report.userSynthesis.recurringObjections;

  return {
    idea,
    verdict,
    scores,
    unassessed: report.unassessedDimensions ?? [],
    takeaway,
    risks: risks.filter(Boolean).slice(0, 3),
  };
}

export function generateReportCard(report: GauntletReport): string {
  const d = extractCardData(report);
  const style = VERDICT_STYLE[d.verdict] ?? VERDICT_STYLE.unclear;
  const overall = d.scores ? overallScore(d.scores, d.unassessed) : null;

  const radar = d.scores ? generateRadarChart(d.scores, "Score") : "";
  const risksHtml = d.risks.length
    ? `<div class="risks"><div class="risks-label">Top risks</div>${d.risks
        .map((r) => `<div class="risk">▸ ${escapeHtml(r)}</div>`)
        .join("")}</div>`
    : "";
  const takeawayHtml = d.takeaway
    ? `<div class="takeaway"><span class="knife">🔪</span> ${escapeHtml(d.takeaway)}</div>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>IdeaGauntlet Verdict</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: Inter, -apple-system, Segoe UI, Roboto, sans-serif; }
  .card { width: 1200px; height: 630px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #e2e8f0; display: flex; flex-direction: column; padding: 56px 64px; position: relative; overflow: hidden; }
  .brand { font-size: 20px; font-weight: 800; letter-spacing: 0.5px; color: #a5b4fc; }
  .brand .scale { color: #e2e8f0; }
  .body { display: flex; gap: 40px; flex: 1; align-items: center; margin-top: 8px; }
  .left { flex: 1; min-width: 0; }
  .right { width: 400px; flex-shrink: 0; }
  .badge { display: inline-block; font-size: 22px; font-weight: 800; letter-spacing: 1px; padding: 8px 18px; border-radius: 999px; color: #0f172a; background: ${style.color}; }
  .score-line { display: flex; align-items: baseline; gap: 14px; margin: 20px 0 14px; }
  .score-num { font-size: 76px; font-weight: 800; color: ${style.color}; line-height: 1; }
  .score-of { font-size: 26px; color: #94a3b8; font-weight: 600; }
  .idea { font-size: 26px; font-weight: 700; color: #f1f5f9; line-height: 1.25; max-height: 96px; overflow: hidden; }
  .takeaway { margin-top: 20px; font-size: 22px; font-weight: 600; color: #fde68a; line-height: 1.35; border-left: 4px solid ${style.color}; padding-left: 16px; max-height: 120px; overflow: hidden; }
  .takeaway .knife { margin-right: 6px; }
  .risks { margin-top: 20px; }
  .risks-label { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 6px; font-weight: 700; }
  .risk { font-size: 17px; color: #cbd5e1; line-height: 1.5; }
  .right svg { width: 400px; height: 400px; }
  .footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #334155; padding-top: 18px; margin-top: 8px; }
  .tagline { font-size: 17px; color: #94a3b8; font-weight: 500; }
  .install { font-family: SFMono-Regular, Menlo, monospace; font-size: 16px; color: #a5b4fc; background: #1e293b; padding: 8px 14px; border-radius: 8px; border: 1px solid #334155; }
</style>
</head>
<body>
  <div class="card">
    <div class="brand">⚖️ IDEAGAUNTLET <span class="scale">VERDICT</span></div>
    <div class="body">
      <div class="left">
        <span class="badge">${escapeHtml(style.label)}</span>
        ${overall !== null ? `<div class="score-line"><span class="score-num">${overall}</span><span class="score-of">/10 overall</span></div>` : `<div style="height:20px"></div>`}
        <div class="idea">${escapeHtml(d.idea)}</div>
        ${takeawayHtml}
        ${risksHtml}
      </div>
      <div class="right">${radar}</div>
    </div>
    <div class="footer">
      <div class="tagline">Put your idea through trial before users do.</div>
      <div class="install">npm i -g idea-gauntlet</div>
    </div>
  </div>
</body>
</html>`;
}
