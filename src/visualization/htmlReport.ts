import type { GauntletReport } from "../core/types.js";
import { buildReport } from "../core/report.js";
import { generateRadarChart } from "./radarChart.js";
import { generateMvpFlowchart, generateCourtMindmap, generateCompetitorGraph, generateNicheMindmap } from "./mermaidDiagram.js";

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

  // Mermaid diagram raw strings — NOT HTML-escaped so the client JS can render them.
  const mermaidDiagrams: string[] = [];
  if (report.enhancedMvpPlan) {
    mermaidDiagrams.push(generateMvpFlowchart(report));
  }
  if (report.mode === "court" && report.courtDebate) {
    mermaidDiagrams.push(generateCourtMindmap(report));
  }
  // Competitor landscape diagram
  const competitorLandscape =
    report.courtDebate?.competitorLandscape ??
    report.quickReport?.competitorAnalysis;
  if (competitorLandscape && competitorLandscape.competitors.length > 0) {
    mermaidDiagrams.push(generateCompetitorGraph(report));
  }
  // Niche mindmap
  const niches =
    report.courtDebate?.nicheOpportunities ??
    report.quickReport?.nicheOpportunities;
  if (niches && niches.length > 0) {
    mermaidDiagrams.push(generateNicheMindmap(report));
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
  parts.push("    .niche-card { background: var(--surface-2); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; border-left: 3px solid var(--accent); }");
  parts.push("    .niche-type { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; background: var(--accent); color: #fff; margin-bottom: 0.5rem; }");
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

  // Mermaid diagrams: store raw Mermaid text in <pre data-mermaid> tags so client JS can parse cleanly.
  if (mermaidDiagrams.length > 0) {
    const diagramHtml = mermaidDiagrams.map((d) => {
      // Extract inner mermaid text from the ```mermaid...``` fence.
      const match = d.match(/^```mermaid\n([\s\S]*?)\n```$/);
      const mermaidText = match ? match[1] : d;
      // Store as <pre data-mermaid> — avoids escapeHtml corruption of diagram content.
      return '<div class="diagram-block"><pre data-mermaid>' + escapeHtml(mermaidText) + "</pre></div>";
    }).join("");
    parts.push('    <div class="card full-width" style="margin-top:1.5rem"><h2>Diagrams</h2>' + diagramHtml + "</div>");
  }

  // Competitor landscape card
  if (competitorLandscape && competitorLandscape.competitors.length > 0) {
    parts.push('    <div class="card full-width" style="margin-top:1.5rem">');
    parts.push('      <h2>Competitor Landscape</h2>');
    parts.push('      <p style="color:var(--text-dim);margin-bottom:1rem">Saturation: <strong style="color:' + getSaturationColor(competitorLandscape.saturationLevel) + '">' + competitorLandscape.saturationLevel + '</strong> (' + competitorLandscape.competitors.length + ' competitors)</p>');
    parts.push('      <p style="margin-bottom:1rem">' + inlineMd(competitorLandscape.analysisNote) + '</p>');
    parts.push('      <table><thead><tr><th>#</th><th>Competitor</th><th>Type</th><th>Pricing</th><th>Features</th><th>Weaknesses</th></tr></thead><tbody>');
    competitorLandscape.competitors.forEach((c, i) => {
      parts.push('        <tr><td>' + (i + 1) + '</td><td><a href="' + escapeHtml(c.url) + '" target="_blank">' + escapeHtml(c.name) + '</a></td><td>' + escapeHtml(c.type) + '</td><td>' + escapeHtml(c.pricing ?? '-') + '</td><td>' + escapeHtml((c.features ?? []).join('; ')) + '</td><td>' + escapeHtml((c.weaknesses ?? []).join('; ')) + '</td></tr>');
    });
    parts.push('      </tbody></table>');
    parts.push('    </div>');
  }
  // Niche opportunities card
  if (niches && niches.length > 0) {
    parts.push('    <div class="card full-width" style="margin-top:1.5rem">');
    parts.push('      <h2>Niche Opportunities</h2>');
    parts.push('      <p style="color:var(--text-dim);margin-bottom:1rem">If the market is saturated, consider these edge opportunities:</p>');
    niches.forEach((n) => {
      parts.push('        <div class="niche-card">');
      parts.push('          <span class="niche-type">' + escapeHtml(n.type.replace(/_/g, ' ')) + '</span>');
      parts.push('          <p><strong>' + escapeHtml(n.description) + '</strong></p>');
      parts.push('          <p style="font-size:0.85rem;color:var(--text-dim)">Evidence: ' + escapeHtml(n.evidence) + '</p>');
      parts.push('          <p style="font-size:0.85rem">Wedge: ' + escapeHtml(n.wedgeIdea) + '</p>');
      parts.push('          <p style="font-size:0.85rem">Why now: ' + escapeHtml(n.whyNow) + '</p>');
      parts.push('        </div>');
    });
    parts.push('    </div>');
  }
  parts.push('    <div class="report-body full-width">');
  parts.push("      " + htmlBody);
  parts.push("    </div>");
  parts.push('    <div class="disclaimer">');
  parts.push("      <p>Report generated by <strong>IdeaGauntlet</strong>. Scores are diagnostic signals, not predictions.</p>");
  parts.push("      <p>Synthetic analysis is not a substitute for real user research.</p>");
  parts.push("    </div>");
  parts.push("  </div>");

  // Mermaid client-side rendering: read from <pre data-mermaid> to avoid HTML encoding issues.
  parts.push('  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>');
  parts.push("  <script>");
  parts.push("    document.addEventListener('DOMContentLoaded', function() {");
  parts.push("      if (typeof mermaid !== 'undefined') {");
  parts.push("        mermaid.initialize({ startOnLoad: false, theme: 'dark' });");
  // Fix: read from <pre data-mermaid> so the mermaid text is unescaped before rendering.
  parts.push("        document.querySelectorAll('pre[data-mermaid]').forEach(function(pre, i) {");
  parts.push("          var text = pre.textContent || '';");
  parts.push("          var container = pre.parentElement;");
  parts.push("          mermaid.render('mg' + i, text).then(function(r) {");
  parts.push("            container.innerHTML = r.svg;");
  parts.push("          })['catch'](function() {");
  parts.push("            pre.style.display = 'block';");
  parts.push("            pre.removeAttribute('data-mermaid');");
  parts.push("          });");
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

function getSaturationColor(level?: string): string {
  switch (level) {
    case "high": return "#ef4444";
    case "medium": return "#f59e0b";
    case "low": return "#10b981";
    default: return "#64748b";
  }
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const html: string[] = [];
  let inCodeBlock = false;
  let inTable = false;
  let tableRows: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeList = () => {
    if (inUl) { html.push("</ul>"); inUl = false; }
    if (inOl) { html.push("</ol>"); inOl = false; }
  };

  for (const line of lines) {
    // Code block toggle
    if (line.trim().startsWith("```")) {
      closeList();
      if (inCodeBlock) { html.push("</pre>"); inCodeBlock = false; }
      else { html.push("<pre>"); inCodeBlock = true; }
      continue;
    }
    if (inCodeBlock) { html.push(escapeHtml(line)); continue; }

    // Table handling
    if (line.trim().startsWith("|") && !inTable) { closeList(); inTable = true; tableRows = [line]; continue; }
    if (inTable) {
      if (line.trim().startsWith("|")) { tableRows.push(line); continue; }
      else { html.push(renderTable(tableRows)); tableRows = []; inTable = false; }
    }

    // Headings close lists
    if (line.startsWith("### ") || line.startsWith("## ") || line.startsWith("# ")) {
      closeList();
    }

    if (line.startsWith("### ")) html.push("<h3>" + inlineMd(line.slice(4)) + "</h3>");
    else if (line.startsWith("## ")) html.push("<h2>" + inlineMd(line.slice(3)) + "</h2>");
    else if (line.startsWith("# ")) html.push("<h1>" + inlineMd(line.slice(2)) + "</h1>");
    else if (line.trim() === "---") { closeList(); html.push("<hr/>"); }
    else if (line.trim() === "") { closeList(); html.push("<br/>"); }
    else if (line.match(/^\d+\.\s/)) {
      // Ordered list item — open <ol> if not already open
      if (inUl) { html.push("</ul>"); inUl = false; }
      if (!inOl) { html.push("<ol>"); inOl = true; }
      html.push("<li>" + inlineMd(line.replace(/^\d+\.\s/, "")) + "</li>");
    } else if (line.startsWith("- ")) {
      // Unordered list item — open <ul> if not already open
      if (inOl) { html.push("</ol>"); inOl = false; }
      if (!inUl) { html.push("<ul>"); inUl = true; }
      html.push("<li>" + inlineMd(line.slice(2)) + "</li>");
    } else {
      closeList();
      html.push("<p>" + inlineMd(line) + "</p>");
    }
  }

  // Close any open structures at end of document
  closeList();
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
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="' + QUOT + '" target="_blank">$1</a>'.replace(QUOT, "$2"));
}
