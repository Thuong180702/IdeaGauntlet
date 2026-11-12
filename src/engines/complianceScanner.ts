import type { LLMProvider, IdeaInput, ComplianceReport, ComplianceRequirement, Severity } from "../core/types.js";
import { requireAnalysis, toAnalysisFailure } from "../core/analysisError.js";
import { extractJSON } from "../utils/jsonRepair.js";
import { performResearch } from "../search/searchOrchestrator.js";
import type { ResearchBrief } from "../search/types.js";
import { warnIfError } from "../utils/warn.js";
import { withProgress } from "../utils/progress.js";
import { buildSafeUserMessage, IDEA_INJECTION_SYSTEM } from "../utils/promptGuard.js";

const COMMON_REGULATIONS = [
  "GDPR (EU General Data Protection Regulation)",
  "CCPA/CPRA (California Consumer Privacy Act)",
  "HIPAA (Health Insurance Portability and Accountability Act)",
  "EU AI Act (Artificial Intelligence Risk Classification)",
  "COPPA (Children's Online Privacy Protection Act)",
  "PCI-DSS (Payment Card Industry Data Security Standard)",
  "SOC 2 Type II (Enterprise Trust Services Criteria)",
  "FINRA / SEC (Financial Technology & Investment Advising)",
  "FERPA (Family Educational Rights and Privacy Act)",
];

/**
 * Regulatory & Compliance Scanner Engine
 *
 * Scans a product idea for regulatory landmines, privacy compliance obligations
 * (GDPR, HIPAA, EU AI Act, COPPA, FinTech), licensing needs, and data security checklists.
 */
export async function runComplianceScanner(
  idea: IdeaInput,
  provider: LLMProvider,
  options?: {
    regions?: string[];
    enableSearch?: boolean;
    research?: ResearchBrief;
  },
): Promise<ComplianceReport> {
  if (!idea?.idea?.trim()) {
    throw new Error("A non-empty product idea is required for compliance scanning.");
  }

  let research: ResearchBrief | undefined;
  if (options?.enableSearch !== false) {
    try {
      research = options?.research ?? await withProgress("Scanning regulatory landscape", () => performResearch(idea, "quick"));
    } catch (err: any) {
      warnIfError("complianceScanner: web research failed", err);
    }
  }

  const regions = options?.regions && options.regions.length > 0
    ? options.regions.join(", ")
    : "United States, European Union, and Global Internet Standards";

  const researchContext = research?.summary ?? "";

  const systemPrompt = `You are the Chief Regulatory & Compliance Officer in IdeaGauntlet.
Your job is to audit this product idea for legal, regulatory, privacy, and compliance risks across ${regions}.

Check against standard frameworks:
${COMMON_REGULATIONS.map((r) => `- ${r}`).join("\n")}

${researchContext}

${IDEA_INJECTION_SYSTEM}

Return a single JSON object with these keys:

- overallRiskLevel: "low" | "medium" | "high" | "critical"
  - low: Standard B2B/B2C SaaS with no sensitive data
  - medium: Stores PII, user files, or operates in EU/California
  - high: Health data, financial transactions, children's data, or autonomous AI agents
  - critical: Unlicensed financial services, medical diagnosis claims, or direct legal violations
- applicableFrameworks: array of strings (the specific laws/standards that apply to this product)
- requirements: array of objects ({
    regulation: string (name of law/standard),
    applicable: boolean,
    severity: "low" | "medium" | "high" | "critical",
    requirements: array of strings (specific operational obligations),
    penaltiesForNonCompliance: string (e.g. "Up to €20M or 4% global turnover under GDPR Article 83"),
    recommendedAction: string (concrete technical/legal step to stay compliant)
  })
- dataPrivacyChecklist: array of 4-6 strings (concrete engineering/privacy controls to implement before launch)
- estimatedComplianceTimeline: string (e.g. "2 weeks for standard privacy policy + cookie consent" or "3-6 months for HIPAA BAA")
- summary: string (3-4 sentences summarizing the regulatory landscape and whether this idea faces a regulatory moat or landmine)

Return ONLY valid JSON.`;

  const userMessage = buildSafeUserMessage(idea, [
    idea.targetUsers ? `Target users: ${idea.targetUsers.join(", ")}` : "",
    idea.market ? `Market: ${idea.market}` : "",
    idea.stage ? `Stage: ${idea.stage}` : "",
    `Target Operating Regions: ${regions}`,
    "",
    "Scan idea for legal and compliance obligations as JSON.",
  ]);

  try {
    const response = await provider.complete(userMessage, {
      system: systemPrompt,
      temperature: 0.2,
      maxTokens: 3500,
    });
    const parsed = requireAnalysis(extractJSON<any>(response), "Compliance scan", ["overallRiskLevel", "requirements"]);

    const requirements: ComplianceRequirement[] = (parsed.requirements ?? []).map((r: any) => ({
      regulation: r.regulation ?? "Regulatory Requirement",
      applicable: Boolean(r.applicable),
      severity: (r.severity ?? "medium") as Severity,
      requirements: Array.isArray(r.requirements) ? r.requirements : [],
      penaltiesForNonCompliance: r.penaltiesForNonCompliance ?? "Fines and potential operational injunctions",
      recommendedAction: r.recommendedAction ?? "Consult legal counsel before processing sensitive data",
    }));

    return {
      overallRiskLevel: (parsed.overallRiskLevel ?? "low") as Severity,
      applicableFrameworks: Array.isArray(parsed.applicableFrameworks) ? parsed.applicableFrameworks : [],
      requirements,
      dataPrivacyChecklist: Array.isArray(parsed.dataPrivacyChecklist) ? parsed.dataPrivacyChecklist : [],
      estimatedComplianceTimeline: parsed.estimatedComplianceTimeline ?? "1-2 weeks for standard SaaS",
      summary: parsed.summary ?? "Compliance scan completed.",
    };
  } catch (err) {
    // No placeholder result: a made-up finding is worse than an explicit failure.
    throw toAnalysisFailure("Compliance scan", err);
  }
}

export function formatComplianceReport(report: ComplianceReport): string {
  const lines: string[] = [];
  lines.push("# ⚖️ Regulatory & Compliance Risk Report\n");

  const riskBadge: Record<Severity, string> = {
    low: "🟢 LOW RISK (Standard SaaS)",
    medium: "🟡 MEDIUM RISK (PII / Privacy Regs)",
    high: "🔴 HIGH RISK (Regulated Industry)",
    critical: "🚨 CRITICAL RISK (Immediate Legal Exposure)",
  };
  lines.push(`**Overall Compliance Risk:** ${riskBadge[report.overallRiskLevel]}\n`);
  lines.push(`${report.summary}\n`);

  if (report.applicableFrameworks.length > 0) {
    lines.push(`**Applicable Frameworks:** ${report.applicableFrameworks.join(", ")}`);
    lines.push(`**Estimated Compliance Timeline:** ${report.estimatedComplianceTimeline}\n`);
  }

  if (report.requirements.length > 0) {
    lines.push("## 📜 Regulatory Framework Audit\n");
    for (const req of report.requirements) {
      const icon = req.severity === "critical" ? "🚨" : req.severity === "high" ? "🔴" : req.severity === "medium" ? "🟡" : "🟢";
      lines.push(`### ${icon} ${req.regulation} (${req.severity.toUpperCase()})`);
      lines.push(`**Action Required:** ${req.recommendedAction}`);
      if (req.requirements.length > 0) {
        lines.push("**Operational Checklist:**");
        for (const item of req.requirements) lines.push(`- [ ] ${item}`);
      }
      lines.push(`⚠️ **Penalties:** *${req.penaltiesForNonCompliance}*\n`);
    }
  }

  if (report.dataPrivacyChecklist.length > 0) {
    lines.push("## 🔒 Pre-Launch Data Privacy Checklist\n");
    for (const item of report.dataPrivacyChecklist) {
      lines.push(`- [ ] ${item}`);
    }
    lines.push("");
  }

  lines.push("---\n*Compliance scanner provided for informational purposes; does not constitute formal legal counsel.*\n");
  return lines.join("\n");
}
