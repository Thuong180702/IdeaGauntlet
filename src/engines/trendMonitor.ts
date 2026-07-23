/**
 * F-07: Trend monitoring — track competitor/market changes over time.
 * Re-runs research on a saved idea and compares against previous research brief.
 * Usage: `idea-gauntlet trend <idea-id>`
 */

import { loadReport, listReports } from "../history/historyStore.js";
import type { ResearchBrief, SearchResult } from "../search/types.js";
import type { IdeaInput } from "../core/types.js";

export interface TrendResult {
  ideaId: string;
  idea: string;
  previousAt: string;
  currentAt: string;
  newCompetitors: { name: string; url: string }[];
  lostCompetitors: string[];
  newSearchResults: SearchResult[];
  saturationChanged: boolean;
  previousSaturation?: string;
  currentSaturation?: string;
  nicheChanges: string[];
}

export function analyzeTrend(
  ideaId: string,
  currentResearch: ResearchBrief,
): TrendResult | null {
  const oldReport = loadReport(ideaId);
  if (!oldReport) return null;

  const oldResearch = oldReport.webResearch;
  if (!oldResearch) {
    return null;
  }

  const oldCompetitorNames = new Set(
    (oldResearch.competitorLandscape?.competitors ?? []).map((c) => c.name.toLowerCase())
  );
  const currentCompetitors = currentResearch.competitorLandscape?.competitors ?? [];

  const newCompetitors = currentCompetitors
    .filter((c) => !oldCompetitorNames.has(c.name.toLowerCase()))
    .map((c) => ({ name: c.name, url: c.url }));

  const lostCompetitors = [...oldCompetitorNames]
    .filter((name) => !currentCompetitors.some((c) => c.name.toLowerCase() === name));

  // Find new search results not in previous
  const oldUrls = new Set(oldResearch.results.map((r: SearchResult) => r.url));
  const newSearchResults = currentResearch.results.filter((r) => !oldUrls.has(r.url));

  // Saturation change
  const previousSaturation = oldResearch.competitorLandscape?.saturationLevel;
  const currentSaturation = currentResearch.competitorLandscape?.saturationLevel;
  const saturationChanged = previousSaturation !== currentSaturation;

  // Niche changes
  const oldNiches = new Set((oldResearch.nicheOpportunities ?? []).map((n) => n.description));
  const currentNiches = currentResearch.nicheOpportunities ?? [];
  const nicheChanges = currentNiches
    .filter((n) => !oldNiches.has(n.description))
    .map((n) => n.description);

  return {
    ideaId,
    idea: oldReport.input.idea,
    previousAt: oldResearch.searchedAt,
    currentAt: currentResearch.searchedAt,
    newCompetitors,
    lostCompetitors,
    newSearchResults,
    saturationChanged,
    previousSaturation,
    currentSaturation,
    nicheChanges,
  };
}

export function formatTrendResult(trend: TrendResult): string {
  const lines: string[] = [];
  lines.push("# Trend Monitoring Report\n");
  lines.push(`**Idea:** ${trend.idea}`);
  lines.push(`**Previous research:** ${trend.previousAt}`);
  lines.push(`**Current research:** ${trend.currentAt}\n`);

  if (trend.newCompetitors.length > 0) {
    lines.push("## 🆕 New Competitors\n");
    for (const c of trend.newCompetitors) {
      lines.push(`- **${c.name}** — ${c.url}`);
    }
    lines.push("");
  }

  if (trend.lostCompetitors.length > 0) {
    lines.push("## 📉 Lost/Removed Competitors\n");
    for (const c of trend.lostCompetitors) {
      lines.push(`- ${c}`);
    }
    lines.push("");
  }

  if (trend.saturationChanged) {
    lines.push(`## 🔄 Saturation Changed\n`);
    lines.push(`- Previous: ${trend.previousSaturation ?? "unknown"}`);
    lines.push(`- Current: ${trend.currentSaturation ?? "unknown"}\n`);
  }

  if (trend.nicheChanges.length > 0) {
    lines.push("## 🎯 New Niche Opportunities\n");
    for (const n of trend.nicheChanges) {
      lines.push(`- ${n}`);
    }
    lines.push("");
  }

  if (trend.newSearchResults.length > 0) {
    lines.push(`## 📰 New Search Results (${trend.newSearchResults.length})\n`);
    for (const r of trend.newSearchResults.slice(0, 10)) {
      lines.push(`- ${r.title} — ${r.url}`);
    }
    lines.push("");
  }

  if (
    trend.newCompetitors.length === 0 &&
    trend.lostCompetitors.length === 0 &&
    !trend.saturationChanged &&
    trend.nicheChanges.length === 0
  ) {
    lines.push("✅ **No significant changes detected** since last research.\n");
  }

  lines.push("---");
  lines.push("*Trend analysis compares current research against saved historical research.*\n");
  return lines.join("\n");
}

/** List ideas that have saved research, usable for trend analysis. */
export function listTrendableIdeas(): { id: string; idea: string; mode: string; createdAt: string }[] {
  return listReports()
    .filter((e) => e.mode === "quick" || e.mode === "court")
    .map((e) => ({ id: e.id, idea: e.idea, mode: e.mode, createdAt: e.createdAt }));
}
