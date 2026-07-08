import type { GauntletReport } from "../core/types.js";
import { buildReport } from "../core/report.js";
import { generateRadarChart, type RadarChartInput } from "./radarChart.js";
import { generateMvpFlowchart, generateCourtMindmap } from "./mermaidDiagram.js";

/**
 * HTML report generator - styled, self-contained HTML page.
 * Includes radar chart + Mermaid diagrams.
 */

// HTML entities using \u0026 (= &) to avoid tool encoding issues
const AMP = "\u0026amp;";
const LT = "\u0026lt;";
const GT = "\u0026gt;";
const QUOT = "\u0026quot;";
const APOS = "\u0026#039;";

export function generateHtmlReport(report: GauntletReport): string {
  if (!report.markdown) {
    report.markdown = buildReport(report);
  }

  let radarSvg = "";
  if (report.scores) {
    radarSvg = generateRadarChart(
      {
        clarity: report.scores.clarity,
        pain: report.scores.pain,
        differentiation: report.scores.differentiation,
        buildability: report.scores.buildability,
        distribution: report.scores.distribution,
        monetization: report.scores.monetization,
        evidence: report.scores.evidence,
      },
      "Score Card",
    );
  } else if (report.courtDebate?.scoresDetailed && report.courtDebate.scoresDetailed.length > 0) {
    const find = (dim: string) =>
      report.courtDebate!.scoresDetailed!.find((s) =>
        s.dimension.toLowerCase().includes(dim.toLowerCase()),
      );
    radarSvg = generateRadarChart(
      {
        clarity: find("clarity")?.score ?? 5,
        pain: find("pain")?.score ?? 5,
        differentiation: find("differentiation")?.score ?? 5,
        buildability: find("buildability")?.score ?? 5,
        distribution: find("distribution")?.score ?? 5,
        monetization: find("monetization")?.score ?? 5,
        evidence: find("evidence")?.score ?? 5,
      },
      "Court Scores",
    );
  }

  const mermaidBlocks: string[] = [];
  if (report.enhancedMvpPlan) {
    mermaidBlocks.push(
      '<div class="diagram-block">' + escapeHtml(generateMvpFlowchart(report)) + "</div>",
    );
  }
  if (report.mode === "court" && report.courtDebate) {
    mermaidBlocks.push(
      '<div class="diagram-block">' + escapeHtml(generateCourtMindmap(report)) + "</div>",
    );
  }

  const verdictColor = getVerdictColor(report.verdict);
  const reportTitle = report.input?.idea?.slice(0, 60) ?? "IdeaGauntlet Report";
  const htmlBody = markdownToHtml(report.markdown);

  const parts: string[] = [];
  parts.push("<!DOCTYPE html>");
  parts.push('<html lang="en">');
  parts.push("<head>");
  parts.push('  <meta charset="UTF-8">');
  parts.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
  parts.push("  <title>IdeaGauntlet Report - " + escapeHtml(reportTitle) + "</title>");
  parts.push('  <meta name="description" content="IdeaGauntlet adversarial analysis report">');
  parts.push("  <style>");
  parts.push("    * { margin: 0; padding: 0; box-sizing: border-box; }");
  parts.push("    :root {");
  parts.push("      --bg: #0f172a; --surface: #1e293b; --surface-2: #334155;");
  parts.push("      --text: #e2e8f0; --text-dim: #94a3b8; --accent: #6366f1;");
  parts.push("      --accent-2: #818cf8; --radius: 12px;");
  parts.push("    }");
  parts.push("    body {");
  parts.push("      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;");
  parts.push("      background: linear-gradient(135deg, #0f172a 0%, #1a1a2e 50%, #16213e 100%);");
  parts.push("      color: var(--text); min-height: 100vh; padding: 2rem; line-height: 1.6;");
  parts.push("    }");
  parts.push("    .container { max-width: 900px; margin: 0 auto; }");
  parts.push("    .header {");
  parts.push("      background: var(--surface); border-radius: var(--radius); padding: 2rem;");
  parts.push("      margin-bottom: 2rem; border: 1px solid var(--surface-2);");
  parts.push("      box-shadow: 0 8px 32px rgba(0,0,0,0.3);");
  parts.push("    }");
  parts.push("    .header h1 {");
  parts.push("      font-size: 1.75rem; font-weight: 700;");
  parts.push("      background: linear-gradient(135deg, var(--accent-2), #c084fc);");
  parts.push("      -webkit-background-clip: text; -webkit-text-fill-color: transparent;");
  parts.push("      margin-bottom: 0.5rem;");
  parts.push("    }");
  parts.push("    .verdict-badge {");
  parts.push("      display: inline-block; padding: 0.3rem 0.8rem; border-radius: 20px;");
  parts.push("      font-weight: 600; font-size: 0.85rem; background: " + verdictColor + ";");
  parts.push("      color: #fff; margin-bottom: 1rem;");
  parts.push("    }");
  parts.push("    .meta-row { display: flex; gap: 1.5rem; flex-wrap: wrap; font-size: 0.85rem; color: var(--text-dim); }");
  parts.push("    @media (min-width: 768px) { .full-width { grid-column: 1 / -1; } }");
  parts.push("    .card { background: var(--surface); border-radius: var(--radius); padding: 1.5rem; border: 1px solid var(--surface-2); }");
  parts.push("    .card h2 { font-size: 1.1rem; color: var(--accent-2); margin-bottom: 1rem; font-weight: 600; }");
  parts.push("    .radar-chart { display: flex; justify-content: center; align-items: center; padding: 1rem; }");
  parts.push("    .report-body { background: var(--surface); border-radius: var(--radius); padding: 2rem;");
  parts.push("      border: 1px solid var(--surface-2); line-height: 1.7; margin-top: 1.5rem; }");
  parts.push("    .report-body h2 { color: var(--accent-2); margin-top: 1.5rem; font-size: 1.2rem;");
  parts.push("      border-bottom: 1px solid var(--surface-2); padding-bottom: 0.3rem; }");
  parts.push("    .report-body h3 { color: var(--text); margin-top: 1rem; font-weight: 600; }");
  parts.push("    .report-body p { margin-bottom: 0.5rem; }");
  parts.push("    .report-body ul, .report-body ol { margin-left: 1.5rem; margin-bottom: 0.5rem; }");
  parts.push("    .report-body li { margin-bottom: 0.2rem; }");
  parts.push("    .report-body table { width: 100%; border-collapse: collapse; margin: 0.5rem 0; }");
  parts.push("    .report-body th, .report-body td { border: 1px solid var(--surface-2); padding: 0.4rem 0.6rem; text-align: left; font-size: 0.9rem; }");
  parts.push("    .report-body th { background: var(--surface-2); font-weight: 600; }");
  parts.push("    .diagram-block { background: var(--surface); border-radius: var(--radius); padding: 1rem;");
  parts.push("      margin-top: 1rem; border: 1px solid var(--surface-2); overflow-x: auto; }");
  parts.push("    pre { background: var(--bg); padding: 1rem; border-radius: 8px; overflow-x: auto; }");
  parts.push("    .disclaimer { text-align: center; color: var(--text-dim); font-size: 0.8rem; margin-top: 2rem; }");
  parts.push("  </style>");
  parts.push("</head>");
  parts.push("<body>");
  parts.push('  <div class="container">');
  parts.push('    <div class="header">');
  parts.push("      <h1>IdeaGauntlet Report</h1>");
  parts.push('      <div class="verdict-badge">' + escapeHtml(report.verdict ?? "unclear") + "</div>");
  parts.push('      <div class="meta-row">');
  parts.push('        <span>Date: ' + escapeHtml(report.createdAt ?? "") + "</span>");
  parts.push('        <span>Mode: ' + escapeHtml(report.mode ?? "quick") + "</span>");
  parts.push('        <span>ID: ' + escapeHtml(report.id ?? "") + "</span>");
  parts.push("      </div>");
  parts.push("    </div>");
  if (radarSvg) {
    parts.push('    <div class="card full-width"><h2>Score Visualization</h2><div class="radar-chart">' + radarSvg + "</div></div>");
  }
  if (mermaidBlocks.length > 0) {
    parts.push('    <div class="card full-width" style="margin-top:1.5rem"><h2>Diagrams</h2>' + mermaidBlocks.join("") + "</div>");
  }
  parts.push('    <div class="report-body full-width">');
  parts.push("      " + htmlBody);
  parts.push("    </div>");
  parts.push('    <div class="disclaimer">');
  parts.push("      <p>Report generated by <strong>IdeaGauntlet</strong>. Scores are diagnostic signals, not predictions.</p>");
  parts.push("      <p>Synthetic analysis is not a substitute for real user research.</p>");
  parts.push("    </div>");
  parts.push("  </div>");
  parts.push('  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>');
  parts.push("  <script>");
  parts.push("    document.addEventListener('DOMContentLoaded', function() {");
  parts.push("      if (typeof mermaid !== 'undefined') {");
  parts.push("        mermaid.initialize({ startOnLoad: false, theme: 'dark' });");
  parts.push("        document.querySelectorAll('.diagram-block').forEach(function(block, i) {");
  parts.push("          var text = block.textContent.trim();");
  parts.push("          var match = text.match(/```mermaid\\n([\\s\\S]*?)\\n```/);");
  parts.push("          if (match) {");
  parts.push("            mermaid.render('m' + i, match[1]).then(function(r) {");
  parts.push("              block.innerHTML = r.svg;");
  parts.push("            })['catch'](function() { block.innerHTML = '<pre>' + text + '</pre>'; });");
  parts.push("          } else { block.innerHTML = '<pre>' + text + '</pre>'; }");
  parts.push("        });");
  parts.push("      }");
  parts.push("    });");
  parts.push("  </script>");
  parts.push("</body>");
  parts.push("</html>");

  return parts.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, AMP)
    .replace(/</g, LT)
    .replace(/>/g, GT)
    .replace(/"/g, QUOT)
    .replace(/'/g, APOS);
}

function getVerdictColor(verdict?: string): string {
  switch (verdict) {
    case "strong": return "linear-gradient(135deg, #10b981, #059669)";
    case "promising_but_risky": return "linear-gradient(135deg, #6366f1, #818cf8)";
    case "needs_real_evidence": return "linear-gradient(135deg, #f59e0b, #d97706)";
    case "pivot_recommended": return "linear-gradient(135deg, #f97316, #ea580c)";
    case "weak": return "linear-gradient(135deg, #ef4444, #dc2626)";
    default: return "linear-gradient(135deg, #64748b, #475569)";
  }
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const html: string[] = [];
  let inCodeBlock = false;
  let inTable = false;
  let tableRows: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) { html.push("</pre>"); inCodeBlock = false; }
      else { html.push("<pre>"); inCodeBlock = true; }
      continue;
    }
    if (inCodeBlock) { html.push(escapeHtml(line)); continue; }

    if (line.trim().startsWith("|") && !inTable) { inTable = true; tableRows = [line]; continue; }
    if (inTable) {
      if (line.trim().startsWith("|")) { tableRows.push(line); continue; }
      else { html.push(renderTable(tableRows)); tableRows = []; inTable = false; }
    }

    if (line.startsWith("### ")) html.push("<h3>" + inlineMd(line.slice(4)) + "</h3>");
    else if (line.startsWith("## ")) html.push("<h2>" + inlineMd(line.slice(3)) + "</h2>");
    else if (line.startsWith("# ")) html.push("<h1>" + inlineMd(line.slice(2)) + "</h1>");
    else if (line.trim() === "---") html.push("<hr/>");
    else if (line.trim() === "") html.push("<br/>");
    else if (line.match(/^\d+\.\s/)) html.push("<li>" + inlineMd(line.replace(/^\d+\.\s/, "")) + "</li>");
    else if (line.startsWith("- ")) html.push("<li>" + inlineMd(line.slice(2)) + "</li>");
    else html.push("<p>" + inlineMd(line) + "</p>");
  }

  if (inTable && tableRows.length > 0) html.push(renderTable(tableRows));
  if (inCodeBlock) html.push("</pre>");
  return html.join("\n");
}

function renderTable(rows: string[]): string {
  if (rows.length < 2) return "";
  const parse = (row: string) => {
    const cells = row.split("|").map((c) => c.trim());
    if (cells[0] === "") cells.shift();
    if (cells[cells.length - 1] === "") cells.pop();
    return cells;
  };
  const header = parse(rows[0]);
  const body = rows.slice(2).map(parse).filter((r) => r.length > 0);
  const th = header.map((h) => "<th>" + inlineMd(h) + "</th>").join("");
  const tr = body
    .map((r) => "<tr>" + r.map((c, i) => "<td>" + (i < header.length ? inlineMd(c) : c) + "</td>").join("") + "</tr>")
    .join("");
  return "<table><thead><tr>" + th + "</tr></thead><tbody>" + tr + "</tbody></table>";
}

function inlineMd(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
}
