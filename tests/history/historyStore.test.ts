import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, rmSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { saveReport, loadReport, listReports, compareReports } from "../../src/history/historyStore.js";
import type { GauntletReport } from "../../src/core/types.js";

describe("historyStore", () => {
  const testWorkspaceDir = resolve(process.cwd(), "tests/scratch_history_test");

  beforeEach(() => {
    if (existsSync(testWorkspaceDir)) {
      rmSync(testWorkspaceDir, { recursive: true, force: true });
    }
    mkdirSync(testWorkspaceDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testWorkspaceDir)) {
      rmSync(testWorkspaceDir, { recursive: true, force: true });
    }
  });

  const mockReport1: GauntletReport = {
    id: "report-abc",
    createdAt: "2026-07-15T09:00:00.000Z",
    mode: "quick",
    input: { idea: "Test idea 1" },
    verdict: "strong",
    scores: {
      clarity: 8,
      pain: 8,
      differentiation: 7,
      buildability: 6,
      distribution: 5,
      monetization: 6,
      evidence: 2,
    },
    markdown: "Report 1 Markdown",
  };

  const mockReport2: GauntletReport = {
    id: "report-xyz",
    createdAt: "2026-07-15T10:00:00.000Z",
    mode: "quick",
    input: { idea: "Test idea 1 revised" },
    verdict: "strong",
    scores: {
      clarity: 9,
      pain: 8,
      differentiation: 8,
      buildability: 6,
      distribution: 6,
      monetization: 7,
      evidence: 3,
    },
    markdown: "Report 2 Markdown",
  };

  it("saves and loads reports successfully", () => {
    const savedPath = saveReport(mockReport1, testWorkspaceDir);
    expect(existsSync(savedPath)).toBe(true);

    const loaded = loadReport(mockReport1.id, testWorkspaceDir);
    expect(loaded).toBeDefined();
    expect(loaded!.id).toBe(mockReport1.id);
    expect(loaded!.input.idea).toBe(mockReport1.input.idea);
    expect(loaded!.scores).toEqual(mockReport1.scores);
  });

  it("lists reports with correct metadata", () => {
    saveReport(mockReport1, testWorkspaceDir);
    saveReport(mockReport2, testWorkspaceDir);

    const reports = listReports(testWorkspaceDir);
    expect(reports.length).toBe(2);
    // Should be sorted descending by createdAt
    expect(reports[0].id).toBe(mockReport2.id);
    expect(reports[0].idea).toBe(mockReport2.input.idea);
    expect(reports[1].id).toBe(mockReport1.id);
    expect(reports[1].idea).toBe(mockReport1.input.idea);
  });

  it("triggers readPartialJson optimization for large reports", () => {
    // Generate a report with a large markdown field to exceed 100KB
    const largeMarkdown = "A".repeat(110 * 1024);
    const largeReport: GauntletReport = {
      ...mockReport1,
      id: "report-large",
      createdAt: "2026-07-15T11:00:00.000Z",
      markdown: largeMarkdown,
    };

    saveReport(largeReport, testWorkspaceDir);

    const reports = listReports(testWorkspaceDir);
    expect(reports.length).toBe(1);
    expect(reports[0].id).toBe("report-large");
    expect(reports[0].idea).toBe("Test idea 1");
  });

  it("compares reports and computes correct score deltas", () => {
    saveReport(mockReport1, testWorkspaceDir);
    saveReport(mockReport2, testWorkspaceDir);

    const delta = compareReports(mockReport1.id, mockReport2.id, testWorkspaceDir);
    expect(delta.overallTrend).toBe("improved");
    expect(delta.deltas.clarity).toBe(1);
    expect(delta.deltas.pain).toBe(0);
    expect(delta.deltas.differentiation).toBe(1);
    expect(delta.deltas.distribution).toBe(1);
    expect(delta.deltas.monetization).toBe(1);
    expect(delta.deltas.evidence).toBe(1);
  });
});
