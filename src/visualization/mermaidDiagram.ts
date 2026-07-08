import type { GauntletReport } from "../core/types.js";

/**
 * Generate Mermaid diagrams from report data.
 * - MVP validation flowchart
 * - Timeline Gantt chart
 * - Court debate mindmap
 */

export function generateMvpFlowchart(report: GauntletReport): string {
  const plan = report.enhancedMvpPlan;
  if (!plan || !plan.validationPlan || plan.validationPlan.length === 0) {
    return "```mermaid\nflowchart TD\n  A[No validation plan available]\n```";
  }

  const steps = plan.validationPlan;
  const killCriteria = plan.killCriteria ?? [];
  const killText = killCriteria.length > 0
    ? killCriteria.map((k) => k.slice(0, 50)).join(" / ")
    : "Kill criteria not defined";

  const lines: string[] = ["```mermaid", "flowchart TD"];
  lines.push('  Start["Start Validation"]');

  steps.forEach((step, i) => {
    const cleanStep = step.replace(/["\[\]]/g, "").slice(0, 60);
    lines.push("  Step" + (i + 1) + '["' + cleanStep + '"]');
    if (i === 0) lines.push("  Start --> Step1");
    else lines.push("  Step" + i + " --> Step" + (i + 1));
  });

  const lastStep = steps.length;
  lines.push('  Decision{"Pass or Kill?"}');
  lines.push("  Step" + lastStep + " --> Decision");
  lines.push('  Success["Continue Building"]');
  lines.push('  Decision -->|Pass| Success');
  lines.push('  Kill["Kill: ' + killText + '"]');
  lines.push('  Decision -->|Kill| Kill');

  if (plan.pivotOptions && plan.pivotOptions.length > 0) {
    lines.push("  Kill --> Pivot");
    lines.push('  Pivot{"Pivot?"}');
    plan.pivotOptions.forEach((opt, i) => {
      const cleanOpt = opt.replace(/["\[\]]/g, "").slice(0, 60);
      lines.push("  PivotOpt" + (i + 1) + '["' + cleanOpt + '"]');
      lines.push("  Pivot --> PivotOpt" + (i + 1));
    });
  }

  lines.push("```");
  return lines.join("\n");
}

export function generateMvpTimeline(report: GauntletReport): string {
  const plan = report.enhancedMvpPlan;
  if (!plan || !plan.validationPlan || plan.validationPlan.length === 0) {
    return "```mermaid\ngantt\n  title No validation plan available\n```";
  }

  const steps = plan.validationPlan;
  const lines: string[] = [
    "```mermaid", "gantt",
    '  title ' + (report.input?.idea?.slice(0, 50) ?? "Idea Validation Timeline"),
    "  dateFormat X",
    "  axisFormat %s",
  ];

  let currentDay = 0;
  steps.forEach((step, i) => {
    const cleanStep = step.replace(/["\[\]]/g, "").slice(0, 40);
    const dayMatch = step.match(/Day\s*(\d+)\s*[-\u2013]\s*(\d+)|Day\s*(\d+)/i);
    let duration = 1;
    let startDay = currentDay;

    if (dayMatch) {
      if (dayMatch[1] && dayMatch[2]) {
        startDay = parseInt(dayMatch[1]) - 1;
        duration = parseInt(dayMatch[2]) - parseInt(dayMatch[1]) + 1;
      } else if (dayMatch[3]) {
        startDay = parseInt(dayMatch[3]) - 1;
        duration = 1;
      }
    } else {
      duration = 2;
    }

    currentDay = startDay + duration;
    lines.push("  section Phase " + (i + 1));
    lines.push("  " + cleanStep + " :" + startDay + ", " + duration + "d");
  });

  lines.push("```");
  return lines.join("\n");
}

export function generateCourtMindmap(report: GauntletReport): string {
  const debate = report.courtDebate;
  if (!debate || !debate.roleArguments || debate.roleArguments.length === 0) {
    return "```mermaid\nmindmap\n  root((No debate data))\n```";
  }

  const ideaText = (report.input?.idea?.slice(0, 30) ?? "Idea").replace(/["\[\]]/g, "");
  const lines: string[] = ["```mermaid", "mindmap"];
  lines.push("  root((" + ideaText + "))");

  debate.roleArguments.forEach((role) => {
    const cleanName = role.roleName.replace(/["\[\]]/g, "");
    lines.push("    " + cleanName);
    const sentences = role.argument.split(".");
    const keyPoints = sentences.slice(0, 2).map((s) =>
      s.trim().replace(/["\[\]]/g, "").slice(0, 50),
    );
    keyPoints.forEach((point) => {
      if (point.length > 5) lines.push("      " + point);
    });
  });

  lines.push("```");
  return lines.join("\n");
}
