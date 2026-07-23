/**
 * F-08: PDF export — generates print-optimized HTML with @media print CSS.
 * User opens in browser → Ctrl+P → "Save as PDF".
 * ponytail: No Puppeteer dep (heavy). If needed later, add playwright-based PDF render.
 * → skipped: automated PDF generation, add when users need batch PDF.
 */

import type { GauntletReport } from "../core/types.js";
import { generateHtmlReport } from "./htmlReport.js";

export function generatePrintableHtml(report: GauntletReport): string {
  const html = generateHtmlReport(report);

  // Inject @media print CSS before </head>
  const printCss = `
  <style type="text/css" media="print">
    /* F-08: Print-optimized PDF export styles */
    @page {
      size: A4;
      margin: 15mm;
    }
    body {
      background: white !important;
      color: black !important;
      font-size: 11pt;
      line-height: 1.5;
    }
    /* Hide interactive elements */
    .tab-bar, .tab-button, .interactive, button, .nav, .sidebar {
      display: none !important;
    }
    /* Show all tabs when printing */
    .tab-content {
      display: block !important;
      page-break-inside: avoid;
    }
    /* Score bars — print-friendly monochrome */
    .score-bar-fill, .progressbar-fill {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    /* Avoid page breaks inside sections */
    h1, h2, h3 {
      page-break-after: avoid;
    }
    table {
      page-break-inside: avoid;
      width: 100%;
    }
    pre, code {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    /* Radial charts — keep colors for print */
    svg, canvas {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      max-width: 100%;
    }
    /* Remove shadows for print */
    * {
      box-shadow: none !important;
      text-shadow: none !important;
    }
    /* Add print header */
    .print-only {
      display: block !important;
    }
  </style>
  <style>.print-only { display: none; }</style>
  <div class="print-only" style="text-align:center; padding:20px; border-bottom:2px solid #333; margin-bottom:20px;">
    <h1>IdeaGauntlet Report</h1>
    <p>Generated: ${new Date().toISOString()}</p>
  </div>
  `;

  return html.replace("</head>", `${printCss}\n</head>`);
}
