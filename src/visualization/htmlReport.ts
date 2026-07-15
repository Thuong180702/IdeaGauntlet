import type { GauntletReport } from "../core/types.js";
import { buildReport } from "../core/report.js";
import { generateRadarChart } from "./radarChart.js";
import { generateMvpFlowchart, generateCourtMindmap, generateCompetitorGraph, generateNicheMindmap } from "./mermaidDiagram.js";

/**
 * HTML report generator - styled, self-contained premium HTML page.
 * Includes interactive tabbed layout, progress score indicators, 
 * styled synthetic user profile cards, radar charts, and Mermaid diagrams.
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

  // Resolve scores card
  const scores = report.scores ?? (report.quickReport?.quickScores) ?? (report.courtDebate?.scoresDetailed ? {
    clarity: report.courtDebate.scoresDetailed.find(s => s.dimension.toLowerCase().includes("clarity"))?.score ?? 5,
    pain: report.courtDebate.scoresDetailed.find(s => s.dimension.toLowerCase().includes("pain"))?.score ?? 5,
    differentiation: report.courtDebate.scoresDetailed.find(s => s.dimension.toLowerCase().includes("different"))?.score ?? 5,
    buildability: report.courtDebate.scoresDetailed.find(s => s.dimension.toLowerCase().includes("build"))?.score ?? 5,
    distribution: report.courtDebate.scoresDetailed.find(s => s.dimension.toLowerCase().includes("dist"))?.score ?? 5,
    monetization: report.courtDebate.scoresDetailed.find(s => s.dimension.toLowerCase().includes("monet"))?.score ?? 5,
    evidence: report.courtDebate.scoresDetailed.find(s => s.dimension.toLowerCase().includes("evid"))?.score ?? 5,
  } : undefined);

  let radarSvg = "";
  if (scores) {
    radarSvg = generateRadarChart(scores, "Scorecard Calibration");
  }

  // Mermaid diagrams — NOT HTML-escaped so client JS can render.
  const diagrams: Array<{ id: string; title: string; source: string }> = [];
  if (report.enhancedMvpPlan) {
    diagrams.push({ id: "mvp-flow", title: "Validation Journey Flow", source: generateMvpFlowchart(report) });
  }
  if (report.mode === "court" && report.courtDebate) {
    diagrams.push({ id: "court-map", title: "Debate Conflicts Map", source: generateCourtMindmap(report) });
  }

  const competitorLandscape = report.courtDebate?.competitorLandscape ?? report.quickReport?.competitorAnalysis;
  if (competitorLandscape && competitorLandscape.competitors.length > 0) {
    diagrams.push({ id: "comp-graph", title: "Competitive Wedge Graph", source: generateCompetitorGraph(report) });
  }

  const niches = report.courtDebate?.nicheOpportunities ?? report.quickReport?.nicheOpportunities;
  if (niches && niches.length > 0) {
    diagrams.push({ id: "niche-map", title: "Niche Opportunities Map", source: generateNicheMindmap(report) });
  }

  const verdictColor = getVerdictColor(report.verdict);
  const reportTitle = report.input?.idea?.slice(0, 60) ?? "IdeaGauntlet Report";
  const htmlBody = markdownToHtml(report.markdown);

  const parts: string[] = [];
  parts.push("<!DOCTYPE html>");
  parts.push('<html lang="en">');
  parts.push("<head>");
  parts.push("  <meta charset=\"UTF-8\">");
  parts.push("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">");
  parts.push("  <title>IdeaGauntlet Report - " + escapeHtml(reportTitle) + "</title>");
  parts.push("  <meta name=\"description\" content=\"IdeaGauntlet adversarial analysis report\">");
  
  // Custom font & style sheet
  parts.push("  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">");
  parts.push("  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>");
  parts.push("  <link href=\"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700\u0026family=JetBrains+Mono:wght@400;500\u0026display=swap\" rel=\"stylesheet\">");
  
  parts.push("  <style>");
  parts.push("    * { margin: 0; padding: 0; box-sizing: border-box; }");
  parts.push("    :root {");
  parts.push("      --bg: #0b0f19; --surface: #151f32; --surface-2: #24324d;");
  parts.push("      --text: #f1f5f9; --text-dim: #94a3b8; --accent: #6366f1;");
  parts.push("      --accent-2: #818cf8; --radius: 16px; --glow: rgba(99, 102, 241, 0.15);");
  parts.push("    }");
  parts.push("    body {");
  parts.push("      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;");
  parts.push("      background: linear-gradient(135deg, #0b0f19 0%, #111827 50%, #0f172a 100%);");
  parts.push("      color: var(--text); min-height: 100vh; padding: 2rem 1rem; line-height: 1.6;");
  parts.push("    }");
  parts.push("    .container { max-width: 960px; margin: 0 auto; }");
  
  // Header with glassmorphism
  parts.push("    .header {");
  parts.push("      background: rgba(21, 31, 50, 0.8); border-radius: var(--radius); padding: 2rem;");
  parts.push("      margin-bottom: 1.5rem; border: 1px solid var(--surface-2);");
  parts.push("      backdrop-filter: blur(12px); box-shadow: 0 10px 30px rgba(0,0,0,0.4);");
  parts.push("    }");
  parts.push("    .header h1 {");
  parts.push("      font-size: 2rem; font-weight: 700;");
  parts.push("      background: linear-gradient(135deg, #a5b4fc, #c084fc);");
  parts.push("      -webkit-background-clip: text; -webkit-text-fill-color: transparent;");
  parts.push("      margin-bottom: 0.75rem;");
  parts.push("    }");
  parts.push("    .verdict-badge {");
  parts.push("      display: inline-block; padding: 0.35rem 1rem; border-radius: 30px;");
  parts.push("      font-weight: 700; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em;");
  parts.push("      background: " + verdictColor + "; color: #fff; margin-bottom: 1.25rem;");
  parts.push("      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);");
  parts.push("    }");
  parts.push("    .meta-row { display: flex; gap: 1.5rem; flex-wrap: wrap; font-size: 0.85rem; color: var(--text-dim); }");
  
  // Tabs Navigation
  parts.push("    .tabs-nav {");
  parts.push("      display: flex; gap: 0.35rem; margin-bottom: 1.5rem; background: rgba(21, 31, 50, 0.6);");
  parts.push("      padding: 0.35rem; border-radius: 30px; border: 1px solid var(--surface-2);");
  parts.push("      overflow-x: auto; -webkit-overflow-scrolling: touch;");
  parts.push("    }");
  parts.push("    .tab-btn {");
  parts.push("      background: transparent; border: none; color: var(--text-dim);");
  parts.push("      padding: 0.5rem 1.25rem; border-radius: 20px; font-weight: 600; font-size: 0.85rem;");
  parts.push("      cursor: pointer; transition: all 0.25s ease; white-space: nowrap;");
  parts.push("    }");
  parts.push("    .tab-btn:hover { color: var(--text); background: rgba(255,255,255,0.04); }");
  parts.push("    .tab-btn.active { background: var(--accent); color: #fff; box-shadow: 0 4px 12px var(--glow); }");
  
  // Tab Panes
  parts.push("    .tab-pane { display: none; animation: slideIn 0.35s ease-out; }");
  parts.push("    .tab-pane.active { display: block; }");
  parts.push("    @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }");
  
  // Layout components
  parts.push("    .card { background: var(--surface); border-radius: var(--radius); padding: 2rem; border: 1px solid var(--surface-2); margin-bottom: 1.5rem; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }");
  parts.push("    .card h2 { font-size: 1.25rem; color: var(--accent-2); margin-bottom: 1.25rem; font-weight: 700; letter-spacing: -0.01em; }");
  parts.push("    .full-width { width: 100%; }");
  parts.push("    .two-cols { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }");
  parts.push("    @media (min-width: 768px) { .two-cols { grid-template-columns: 1.1fr 0.9fr; } }");
  
  // Scorecard bars
  parts.push("    .scores-grid { display: grid; grid-template-columns: 1fr; gap: 1.2rem; }");
  parts.push("    @media (min-width: 600px) { .scores-grid { grid-template-columns: 1fr 1fr; } }");
  parts.push("    .score-item { background: rgba(11, 15, 25, 0.4); padding: 1rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03); }");
  parts.push("    .score-info { display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.4rem; }");
  parts.push("    .score-bar-bg { background: rgba(255,255,255,0.06); height: 8px; border-radius: 4px; overflow: hidden; }");
  parts.push("    .score-bar-fill { height: 100%; border-radius: 4px; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); }");
  parts.push("    .radar-container { display: flex; justify-content: center; align-items: center; background: rgba(11, 15, 25, 0.3); border-radius: 12px; border: 1px solid var(--surface-2); padding: 1rem; }");
  
  // Markdown Report body
  parts.push("    .report-body { background: var(--surface); border-radius: var(--radius); padding: 2rem; border: 1px solid var(--surface-2); line-height: 1.75; }");
  parts.push("    .report-body h2 { color: var(--accent-2); margin-top: 2rem; font-size: 1.35rem; font-weight: 700; border-bottom: 1px solid var(--surface-2); padding-bottom: 0.4rem; margin-bottom: 1rem; }");
  parts.push("    .report-body h3 { color: var(--text); margin-top: 1.5rem; font-weight: 700; font-size: 1.1rem; margin-bottom: 0.5rem; }");
  parts.push("    .report-body p { margin-bottom: 0.75rem; color: #cbd5e1; }");
  parts.push("    .report-body ul, .report-body ol { margin-left: 1.5rem; margin-bottom: 1rem; color: #cbd5e1; }");
  parts.push("    .report-body li { margin-bottom: 0.35rem; }");
  parts.push("    .report-body table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 8px; overflow: hidden; }");
  parts.push("    .report-body th, .report-body td { border: 1px solid var(--surface-2); padding: 0.75rem 1rem; text-align: left; font-size: 0.875rem; }");
  parts.push("    .report-body th { background: rgba(36, 50, 77, 0.6); font-weight: 700; color: #fff; }");
  parts.push("    .report-body td { background: rgba(21, 31, 50, 0.4); }");
  
  // Diagrams & general lists
  parts.push("    .diagram-block { background: rgba(11, 15, 25, 0.3); border-radius: 12px; padding: 1.5rem; margin-top: 1.25rem; border: 1px solid var(--surface-2); overflow-x: auto; display: flex; justify-content: center; }");
  parts.push("    pre { font-family: 'JetBrains Mono', monospace; background: #0b0f19; padding: 1.25rem; border-radius: 8px; overflow-x: auto; font-size: 0.85rem; border: 1px solid var(--surface-2); }");
  parts.push("    .disclaimer { text-align: center; color: var(--text-dim); font-size: 0.8rem; margin-top: 3rem; border-top: 1px solid var(--surface-2); padding-top: 1.5rem; }");
  
  // Competitor styles
  parts.push("    .competitor-table-wrapper { overflow-x: auto; margin-top: 1rem; border-radius: 8px; border: 1px solid var(--surface-2); }");
  parts.push("    .competitor-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem; }");
  parts.push("    .competitor-table th { background: var(--surface-2); color: #fff; padding: 0.75rem 1rem; font-weight: 700; }");
  parts.push("    .competitor-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--surface-2); background: rgba(21, 31, 50, 0.3); }");
  parts.push("    .competitor-table tr:last-child td { border-bottom: none; }");
  parts.push("    .competitor-table a { color: var(--accent-2); text-decoration: none; font-weight: 600; }");
  parts.push("    .competitor-table a:hover { text-decoration: underline; }");
  
  // Niche opportunities
  parts.push("    .niche-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; margin-top: 1rem; }");
  parts.push("    @media (min-width: 640px) { .niche-grid { grid-template-columns: 1fr 1fr; } }");
  parts.push("    .niche-card { background: rgba(36, 50, 77, 0.3); border-radius: 12px; padding: 1.25rem; border-left: 4px solid var(--accent); border: 1px solid var(--surface-2); border-left: 4px solid var(--accent); }");
  parts.push("    .niche-type { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.7rem; font-weight: 700; background: var(--accent); color: #fff; text-transform: uppercase; margin-bottom: 0.6rem; }");
  parts.push("    .niche-card h3 { font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem; }");
  parts.push("    .niche-meta { font-size: 0.8rem; color: var(--text-dim); margin-top: 0.4rem; }");
  
  // Personas
  parts.push("    .personas-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; margin-top: 1rem; }");
  parts.push("    @media (min-width: 768px) { .personas-grid { grid-template-columns: 1fr 1fr; } }");
  parts.push("    .persona-card { background: var(--surface); border: 1px solid var(--surface-2); border-radius: var(--radius); padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15); }");
  parts.push("    .persona-header { display: flex; align-items: center; gap: 1rem; border-bottom: 1px solid var(--surface-2); padding-bottom: 0.8rem; }");
  parts.push("    .persona-avatar { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), #c084fc); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; color: #fff; }");
  parts.push("    .persona-meta h3 { font-size: 1.05rem; font-weight: 700; color: #fff; }");
  parts.push("    .persona-archetype { font-size: 0.75rem; color: var(--accent-2); font-weight: 700; }");
  parts.push("    .persona-body { font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.5rem; }");
  parts.push("    .persona-quote { font-style: italic; color: #94a3b8; border-left: 2px solid var(--accent); padding-left: 0.75rem; margin: 0.5rem 0; font-size: 0.85rem; line-height: 1.5; }");
  parts.push("    .persona-field { color: var(--text-dim); }");
  parts.push("    .persona-field strong { color: #cbd5e1; }");
  parts.push("    .wtp-badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 12px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: #fff; }");
  parts.push("    .wtp-high { background: #10b981; }");
  parts.push("    .wtp-medium { background: #6366f1; }");
  parts.push("    .wtp-low { background: #f59e0b; }");
  parts.push("    .wtp-none { background: #ef4444; }");
  parts.push("    .wtp-unknown { background: #64748b; }");
  
  parts.push("  </style>");
  parts.push("</head>");
  parts.push("<body>");
  parts.push("  <div class=\"container\">");
  
  // Header section
  parts.push("    <div class=\"header\">");
  parts.push("      <div class=\"verdict-badge\">" + escapeHtml(report.verdict ?? "unclear") + "</div>");
  parts.push("      <h1>" + escapeHtml(reportTitle) + "</h1>");
  parts.push("      <div class=\"meta-row\">");
  parts.push("        <span>Date: " + escapeHtml(report.createdAt ? report.createdAt.slice(0, 10) : "") + "</span>");
  parts.push("        <span>Mode: " + escapeHtml(report.mode ?? "quick") + "</span>");
  parts.push("        <span>ID: " + escapeHtml(report.id ?? "") + "</span>");
  parts.push("      </div>");
  parts.push("    </div>");

  // Determine active tabs
  const hasUsers = (report.enhancedSyntheticUsers && report.enhancedSyntheticUsers.length > 0) || (report.syntheticUsers && report.syntheticUsers.length > 0);
  const hasMarket = (competitorLandscape && competitorLandscape.competitors.length > 0) || (niches && niches.length > 0);
  const hasMvp = (report.enhancedMvpPlan !== undefined) || (report.mvpPlan !== undefined);

  // Render Tab Navigation bar
  parts.push("    <div class=\"tabs-nav\">");
  parts.push("      <button class=\"tab-btn active\" data-tab=\"overview\">Overview</button>");
  parts.push("      <button class=\"tab-btn\" data-tab=\"report\">Detailed Report</button>");
  if (hasMarket) parts.push("      <button class=\"tab-btn\" data-tab=\"market\">Market \u0026 Competitors</button>");
  if (hasMvp) parts.push("      <button class=\"tab-btn\" data-tab=\"mvp\">MVP Plan</button>");
  if (hasUsers) parts.push("      <button class=\"tab-btn\" data-tab=\"users\">Synthetic Users</button>");
  parts.push("    </div>");

  // --- TAB 1: OVERVIEW ---
  parts.push("    <div class=\"tab-pane active\" id=\"overview-tab\">");
  parts.push("      <div class=\"two-cols\">");
  parts.push("        <div class=\"card\">");
  parts.push("          <h2>Diagnostics Calibration</h2>");
  if (scores) {
    parts.push(renderScorecardBars(scores));
  } else {
    parts.push("          <p style=\"color:var(--text-dim)\">No diagnostic score details available for this report.</p>");
  }
  parts.push("        </div>");
  parts.push("        <div class=\"card\" style=\"display:flex; flex-direction:column; justify-content:space-between\">");
  parts.push("          <div>");
  parts.push("            <h2>Radar Distribution</h2>");
  if (radarSvg) {
    parts.push("            <div class=\"radar-container\">" + radarSvg + "</div>");
  } else {
    parts.push("            <p style=\"color:var(--text-dim)\">No scores to visualize.</p>");
  }
  parts.push("          </div>");
  if (report.coreInsight) {
    parts.push("          <div style=\"margin-top:1.5rem; background:rgba(36,50,77,0.3); padding:1rem; border-radius:12px; border:1px solid var(--surface-2)\">");
    parts.push("            <strong style=\"color:var(--accent-2); font-size:0.85rem; text-transform:uppercase; letter-spacing:0.05em\">Core Insight:</strong>");
    parts.push("            <p style=\"font-size:0.9rem; margin-top:0.25rem; color:#e2e8f0\">" + escapeHtml(report.coreInsight) + "</p>");
    parts.push("          </div>");
  }
  parts.push("        </div>");
  parts.push("      </div>");
  
  if (report.nextActions && report.nextActions.length > 0) {
    parts.push("      <div class=\"card\">");
    parts.push("        <h2>Recommended Actions Summary</h2>");
    parts.push("        <ul style=\"margin-left:1.5rem\">");
    report.nextActions.forEach((action) => {
      parts.push("          <li style=\"margin-bottom:0.5rem; font-size:0.9rem; color:#e2e8f0\">" + inlineMd(escapeHtml(action)) + "</li>");
    });
    parts.push("        </ul>");
    parts.push("      </div>");
  }
  parts.push("    </div>");

  // --- TAB 2: DETAILED REPORT ---
  parts.push("    <div class=\"tab-pane\" id=\"report-tab\">");
  parts.push("      <div class=\"report-body\">");
  parts.push("        " + htmlBody);
  parts.push("      </div>");
  parts.push("    </div>");

  // --- TAB 3: MARKET & COMPETITORS ---
  if (hasMarket) {
    parts.push("    <div class=\"tab-pane\" id=\"market-tab\">");
    if (competitorLandscape && competitorLandscape.competitors.length > 0) {
      parts.push("      <div class=\"card\">");
      parts.push("        <h2>Competitor Landscape</h2>");
      parts.push("        <p style=\"color:var(--text-dim); margin-bottom:1rem; font-size:0.9rem\">Saturation Level: <strong style=\"color:" + getSaturationColor(competitorLandscape.saturationLevel) + "\">" + competitorLandscape.saturationLevel.toUpperCase() + "</strong> (" + competitorLandscape.competitors.length + " competitors identified)</p>");
      parts.push("        <p style=\"margin-bottom:1.25rem; font-size:0.9rem\">" + inlineMd(escapeHtml(competitorLandscape.analysisNote)) + "</p>");
      parts.push("        <div class=\"competitor-table-wrapper\">");
      parts.push("          <table class=\"competitor-table\"><thead><tr><th>#</th><th>Name</th><th>Type</th><th>Pricing Model</th><th>Identified Weaknesses</th></tr></thead><tbody>");
      competitorLandscape.competitors.forEach((c, idx) => {
        const pricing = c.pricing ? escapeHtml(c.pricing) : "-";
        const weaknesses = c.weaknesses && c.weaknesses.length > 0 ? escapeHtml(c.weaknesses.join("; ")) : "None noted";
        parts.push("            <tr><td>" + (idx + 1) + "</td><td><a href=\"" + escapeHtml(c.url) + "\" target=\"_blank\">" + escapeHtml(c.name) + "</a></td><td>" + escapeHtml(c.type) + "</td><td>" + pricing + "</td><td style=\"color:#f43f5e\">" + weaknesses + "</td></tr>");
      });
      parts.push("          </tbody></table>");
      parts.push("        </div>");
      parts.push("      </div>");
    }

    if (niches && niches.length > 0) {
      parts.push("      <div class=\"card\">");
      parts.push("        <h2>Niche Opportunities</h2>");
      parts.push("        <p style=\"color:var(--text-dim); margin-bottom:1.25rem; font-size:0.9rem\">Identified edge segments to bypass heavy competition:</p>");
      parts.push("        <div class=\"niche-grid\">");
      niches.forEach((n) => {
        parts.push("          <div class=\"niche-card\">");
        parts.push("            <span class=\"niche-type\">" + escapeHtml(n.type.replace(/_/g, ' ')) + "</span>");
        parts.push("            <h3>" + escapeHtml(n.description) + "</h3>");
        parts.push("            <p class=\"niche-meta\"><strong>Wedge Idea:</strong> " + escapeHtml(n.wedgeIdea) + "</p>");
        parts.push("            <p class=\"niche-meta\"><strong>Evidence:</strong> " + escapeHtml(n.evidence) + "</p>");
        parts.push("            <p class=\"niche-meta\"><strong>Why Now:</strong> " + escapeHtml(n.whyNow) + "</p>");
        parts.push("          </div>");
      });
      parts.push("        </div>");
      parts.push("      </div>");
    }

    // Embed competitor/niche diagrams
    const marketDiagrams = diagrams.filter(d => d.id === "comp-graph" || d.id === "niche-map");
    if (marketDiagrams.length > 0) {
      parts.push("      <div class=\"card\">");
      parts.push("        <h2>Market Relationships Diagrams</h2>");
      marketDiagrams.forEach((d) => {
        const match = d.source.match(/^```mermaid\n([\s\S]*?)\n```$/);
        const mermaidText = match ? match[1] : d.source;
        parts.push("        <h3 style=\"margin-top:1rem; font-size:1rem\">" + escapeHtml(d.title) + "</h3>");
        parts.push("        <div class=\"diagram-block\"><pre data-mermaid>" + escapeHtml(mermaidText) + "</pre></div>");
      });
      parts.push("      </div>");
    }
    parts.push("    </div>");
  }

  // --- TAB 4: MVP PLAN & DIAGRAMS ---
  if (hasMvp) {
    parts.push("    <div class=\"tab-pane\" id=\"mvp-tab\">");
    
    // Core hypothesis / MVP Wedges
    const mvp = report.enhancedMvpPlan;
    if (mvp) {
      parts.push("      <div class=\"card\">");
      parts.push("        <h2>MVP Wedge Strategy</h2>");
      parts.push("        <p style=\"margin-bottom:1rem\"><strong>Core Hypothesis:</strong> " + escapeHtml(mvp.coreHypothesis) + "</p>");
      parts.push("        <p style=\"margin-bottom:1rem\"><strong>MVP Wedge (Narrow Scope):</strong> " + escapeHtml(mvp.mvpWedge) + "</p>");
      if (mvp.recommendedScope) {
        parts.push("        <p style=\"margin-bottom:1rem\"><strong>Recommended Scope:</strong> " + escapeHtml(mvp.recommendedScope) + "</p>");
      }
      parts.push("      </div>");

      // Experiments & Script
      parts.push("      <div class=\"two-cols\">");
      parts.push("        <div class=\"card\">");
      parts.push("          <h2>Validation Experiments</h2>");
      parts.push("          <ul style=\"margin-left:1.5rem\">");
      parts.push("            <li style=\"margin-bottom:0.5rem\"><strong>Fake Door Test:</strong> " + escapeHtml(mvp.fakeDoorTest) + "</li>");
      parts.push("            <li style=\"margin-bottom:0.5rem\"><strong>Concierge Test:</strong> " + escapeHtml(mvp.conciergeTest) + "</li>");
      parts.push("          </ul>");
      if (mvp.experimentBacklog && mvp.experimentBacklog.length > 0) {
        parts.push("          <strong style=\"display:block; margin-top:1rem; margin-bottom:0.5rem; font-size:0.9rem\">Experiment Backlog:</strong>");
        parts.push("          <ul style=\"margin-left:1.5rem; font-size:0.85rem; color:var(--text-dim)\">");
        mvp.experimentBacklog.forEach(exp => {
          parts.push("            <li>" + escapeHtml(exp) + "</li>");
        });
        parts.push("          </ul>");
      }
      parts.push("        </div>");
      
      parts.push("        <div class=\"card\">");
      parts.push("          <h2>Kill/Pivot Criteria</h2>");
      parts.push("          <strong style=\"display:block; font-size:0.9rem; margin-bottom:0.5rem; color:#ef4444\">Kill Signals:</strong>");
      parts.push("          <ul style=\"margin-left:1.5rem; font-size:0.85rem; color:#cbd5e1; margin-bottom:1rem\">");
      mvp.killCriteria.forEach(crit => {
        parts.push("            <li style=\"margin-bottom:0.3rem\">" + escapeHtml(crit) + "</li>");
      });
      parts.push("          </ul>");
      parts.push("          <strong style=\"display:block; font-size:0.9rem; margin-bottom:0.5rem; color:#10b981\">Pivot Options:</strong>");
      parts.push("          <ul style=\"margin-left:1.5rem; font-size:0.85rem; color:#cbd5e1\">");
      mvp.pivotOptions.forEach(piv => {
        parts.push("            <li style=\"margin-bottom:0.3rem\">" + escapeHtml(piv) + "</li>");
      });
      parts.push("          </ul>");
      parts.push("        </div>");
      parts.push("      </div>");
    }

    // Embed MVP diagrams
    const mvpDiagrams = diagrams.filter(d => d.id === "mvp-flow" || d.id === "court-map");
    if (mvpDiagrams.length > 0) {
      parts.push("      <div class=\"card\">");
      parts.push("        <h2>Validation Journey Flow</h2>");
      mvpDiagrams.forEach((d) => {
        const match = d.source.match(/^```mermaid\n([\s\S]*?)\n```$/);
        const mermaidText = match ? match[1] : d.source;
        parts.push("        <h3 style=\"margin-top:1rem; font-size:1rem\">" + escapeHtml(d.title) + "</h3>");
        parts.push("        <div class=\"diagram-block\"><pre data-mermaid>" + escapeHtml(mermaidText) + "</pre></div>");
      });
      parts.push("      </div>");
    }
    parts.push("    </div>");
  }

  // --- TAB 5: SYNTHETIC USERS ---
  if (hasUsers) {
    parts.push("    <div class=\"tab-pane\" id=\"users-tab\">");
    parts.push("      " + renderSyntheticUsers(report));
    parts.push("    </div>");
  }

  // Footer Disclaimer
  parts.push("    <div class=\"disclaimer\">");
  parts.push("      <p>Report generated by <strong>IdeaGauntlet</strong>. Scores are diagnostic signals, not predictions.</p>");
  parts.push("      <p>Synthetic analysis is not a substitute for real user research.</p>");
  parts.push("    </div>");
  
  parts.push("  </div>");

  // Mermaid client-side rendering script
  parts.push("  <script src=\"https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js\"></script>");
  parts.push("  <script>");
  parts.push("    document.addEventListener('DOMContentLoaded', function() {");
  
  // Tab switcher script
  parts.push("      const tabBtns = document.querySelectorAll('.tab-btn');");
  parts.push("      const tabPanes = document.querySelectorAll('.tab-pane');");
  parts.push("      tabBtns.forEach(btn => {");
  parts.push("        btn.addEventListener('click', () => {");
  parts.push("          const tabId = btn.getAttribute('data-tab');");
  parts.push("          tabBtns.forEach(b => b.classList.remove('active'));");
  parts.push("          tabPanes.forEach(p => p.classList.remove('active'));");
  parts.push("          btn.classList.add('active');");
  parts.push("          const activePane = document.getElementById(tabId + '-tab');");
  parts.push("          if (activePane) activePane.classList.add('active');");
  parts.push("        });");
  parts.push("      });");

  // Mermaid rendering script
  parts.push("      if (typeof mermaid !== 'undefined') {");
  parts.push("        mermaid.initialize({ startOnLoad: false, theme: 'dark' });");
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

function renderScorecardBars(scores: any): string {
  const dimensions = [
    { key: "clarity", label: "Clarity", desc: "Is the idea specific and understandable?" },
    { key: "pain", label: "Pain", desc: "Is there a real painful problem?" },
    { key: "differentiation", label: "Differentiation", desc: "Is the approach meaningfully different?" },
    { key: "buildability", label: "Buildability", desc: "Can a small team test it quickly?" },
    { key: "distribution", label: "Distribution", desc: "Can it reach target users?" },
    { key: "monetization", label: "Monetization", desc: "Is there a credible path to revenue?" },
    { key: "evidence", label: "Evidence", desc: "What real evidence supports the idea?" },
  ];

  const items = dimensions.map(d => {
    const val = scores[d.key] ?? 5;
    let fillStyle = "linear-gradient(90deg, #6366f1, #818cf8)";
    if (val >= 8) fillStyle = "linear-gradient(90deg, #10b981, #34d399)";
    else if (val <= 4) fillStyle = "linear-gradient(90deg, #f59e0b, #ef4444)";

    return `
      <div class="score-item">
        <div class="score-info">
          <span>${d.label}</span>
          <span>${val}/10</span>
        </div>
        <div class="score-bar-bg">
          <div class="score-bar-fill" style="width: ${val * 10}%; background: ${fillStyle}"></div>
        </div>
        <p style="font-size: 0.725rem; color: var(--text-dim); margin-top: 0.25rem">${d.desc}</p>
      </div>
    `;
  }).join("");

  return `<div class="scores-grid">${items}</div>`;
}

function renderSyntheticUsers(report: GauntletReport): string {
  const users = report.enhancedSyntheticUsers ?? report.syntheticUsers;
  if (!users || users.length === 0) return "";

  const items = users.map((u) => {
    const wtp = u.willingnessToPay?.toLowerCase() ?? "none";
    const wtpClass = `wtp-${wtp}`;
    const segment = (u as any).segmentDescription ? `<p class="persona-field"><strong>Segment:</strong> ${escapeHtml((u as any).segmentDescription)}</p>` : "";
    const blocker = (u as any).adoptionBlocker ? `<p class="persona-field"><strong>Adoption Blocker:</strong> ${escapeHtml((u as any).adoptionBlocker)}</p>` : "";
    const trigger = (u as any).triggerEvent ?? (u as any).triggerToTry ?? "";
    const outcome = (u as any).goal ?? (u as any).desiredOutcome ?? "";
    
    return `
      <div class="persona-card">
        <div class="persona-header">
          <div class="persona-avatar">👤</div>
          <div class="persona-meta">
            <h3>${escapeHtml(u.name)}</h3>
            <span class="persona-archetype">${escapeHtml(u.archetype)}</span>
          </div>
        </div>
        <div class="persona-body">
          ${segment}
          <p class="persona-field"><strong>Current Workaround:</strong> ${escapeHtml(u.currentWorkaround)}</p>
          <p class="persona-field"><strong>Trigger to Try:</strong> ${escapeHtml(trigger)}</p>
          <p class="persona-field"><strong>Desired Outcome:</strong> ${escapeHtml(outcome)}</p>
          <p class="persona-field"><strong>Willingness to Pay:</strong> <span class="wtp-badge ${wtpClass}">${escapeHtml(wtp)}</span></p>
          ${blocker}
          <p class="persona-field"><strong>Likely Churn Reason:</strong> ${escapeHtml(u.likelyChurnReason)}</p>
          <p class="persona-quote">"${escapeHtml(u.quote)}"</p>
          <p class="persona-field" style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--accent-2)"><strong>Interview Question:</strong> ${escapeHtml(u.interviewQuestion)}</p>
        </div>
      </div>
    `;
  }).join("");

  let synthesisHtml = "";
  if (report.userSynthesis) {
    const s = report.userSynthesis;
    synthesisHtml = `
      <div class="card full-width">
        <h2>Objections \u0026 Segments Synthesis</h2>
        <div style="display: grid; grid-template-columns: 1fr; gap: 1.5rem; margin-top: 0.5rem;">
          <div style="background:rgba(11,15,25,0.3); padding:1rem; border-radius:12px; border:1px solid var(--surface-2)">
            <strong style="color:#ef4444; font-size:0.9rem">Recurring Objections:</strong>
            <ul style="margin-left: 1.25rem; font-size: 0.85rem; color:#cbd5e1; margin-top:0.4rem">
              ${s.recurringObjections.map(o => `<li>${escapeHtml(o)}</li>`).join("")}
            </ul>
          </div>
          <div style="background:rgba(11,15,25,0.3); padding:1rem; border-radius:12px; border:1px solid var(--surface-2)">
            <strong style="color:#10b981; font-size:0.9rem">Target Segments Profile:</strong>
            <ul style="margin-left: 1.25rem; font-size: 0.85rem; color:#cbd5e1; margin-top:0.4rem">
              <li><strong>Likely to care:</strong> ${s.segmentsLikelyToCare.map(escapeHtml).join(", ")}</li>
              <li><strong>Unlikely to care:</strong> ${s.segmentsUnlikelyToCare.map(escapeHtml).join(", ")}</li>
              ${s.surprisingSegments && s.surprisingSegments.length > 0 ? `<li><strong>Surprising segments:</strong> ${s.surprisingSegments.map(escapeHtml).join(", ")}</li>` : ""}
            </ul>
          </div>
          <div style="background:rgba(11,15,25,0.3); padding:1rem; border-radius:12px; border:1px solid var(--surface-2)">
            <strong style="color:var(--accent-2); font-size:0.9rem">Top User Interview Questions:</strong>
            <ol style="margin-left: 1.25rem; font-size: 0.85rem; color:#cbd5e1; margin-top:0.4rem">
              ${s.interviewQuestions.map(o => `<li>${escapeHtml(o)}</li>`).join("")}
            </ol>
          </div>
          ${s.fakeDoorTestIdeas && s.fakeDoorTestIdeas.length > 0 ? `
          <div style="background:rgba(11,15,25,0.3); padding:1rem; border-radius:12px; border:1px solid var(--surface-2)">
            <strong style="color:#e2e8f0; font-size:0.9rem">Fake Door Test Ideas:</strong>
            <ul style="margin-left: 1.25rem; font-size: 0.85rem; color:#cbd5e1; margin-top:0.4rem">
              ${s.fakeDoorTestIdeas.map(o => `<li>${escapeHtml(o)}</li>`).join("")}
            </ul>
          </div>` : ""}
        </div>
      </div>
    `;
  }

  return `
    ${synthesisHtml}
    <div class="personas-grid" style="margin-top:1.5rem">${items}</div>
  `;
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

    if (line.startsWith("### ")) html.push("<h3>" + inlineMd(escapeHtml(line.slice(4))) + "</h3>");
    else if (line.startsWith("## ")) html.push("<h2>" + inlineMd(escapeHtml(line.slice(3))) + "</h2>");
    else if (line.startsWith("# ")) html.push("<h1>" + inlineMd(escapeHtml(line.slice(2))) + "</h1>");
    else if (line.trim() === "---") { closeList(); html.push("<hr/>"); }
    else if (line.trim() === "") { closeList(); html.push("<br/>"); }
    else if (line.match(/^\d+\.\s/)) {
      // Ordered list item — open <ol> if not already open
      if (inUl) { html.push("</ul>"); inUl = false; }
      if (!inOl) { html.push("<ol>"); inOl = true; }
      html.push("<li>" + inlineMd(escapeHtml(line.replace(/^\d+\.\s/, ""))) + "</li>");
    } else if (line.startsWith("- ")) {
      // Unordered list item — open <ul> if not already open
      if (inOl) { html.push("</ol>"); inOl = false; }
      if (!inUl) { html.push("<ul>"); inUl = true; }
      html.push("<li>" + inlineMd(escapeHtml(line.slice(2))) + "</li>");
    } else {
      closeList();
      html.push("<p>" + inlineMd(escapeHtml(line)) + "</p>");
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
  const th = header.map((h) => "<th>" + inlineMd(escapeHtml(h)) + "</th>").join("");
  const tr = body
    .map((r) => "<tr>" + r.map((c, i) => "<td>" + (i < header.length ? inlineMd(escapeHtml(c)) : escapeHtml(c)) + "</td>").join("") + "</tr>")
    .join("");
  return "<table><thead><tr>" + th + "</tr></thead><tbody>" + tr + "</tbody></table>";
}

function inlineMd(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, (_, label, url) => {
      const cleanUrl = url.trim().toLowerCase().startsWith("javascript:") ? "#" : url;
      return `<a href="${cleanUrl}" target="_blank">${label}</a>`;
    });
}
