import { z } from "zod";

// ─── Literal union types ───────────────────────────────────────

export type IdeaStage = "napkin" | "pre-mvp" | "mvp" | "growth";
export type GauntletMode = "quick" | "court" | "users" | "mvp" | "compare";
export type Verdict =
  | "strong"
  | "promising_but_risky"
  | "unclear"
  | "weak"
  | "needs_real_evidence"
  | "pivot_recommended";
export type Severity = "low" | "medium" | "high" | "critical";
export type Confidence = "low" | "medium" | "high";
export type WillingnessToPay = "none" | "low" | "medium" | "high";
export type OnboardingChoice =
  | "ollama"
  | "configure_key"
  | "setup_agent_native";
export type IntegrationTarget =
  | "claude-skills"
  | "claude-agents"
  | "claude-commands"
  | "codex"
  | "cursor"
  | "mcp";

// ─── Zod schemas ───────────────────────────────────────────────

export const IdeaStageSchema = z.enum(["napkin", "pre-mvp", "mvp", "growth"]);

export const GauntletModeSchema = z.enum([
  "quick",
  "court",
  "users",
  "mvp",
  "compare",
]);

export const SeveritySchema = z.enum(["low", "medium", "high", "critical"]);

export const ConfidenceSchema = z.enum(["low", "medium", "high"]);

export const WillingnessToPaySchema = z.enum(["none", "low", "medium", "high"]);

export const VerdictSchema = z.enum([
  "strong",
  "promising_but_risky",
  "unclear",
  "weak",
  "needs_real_evidence",
  "pivot_recommended",
]);

export const IdeaInputSchema = z.object({
  title: z.string().optional(),
  idea: z.string(),
  targetUsers: z.array(z.string()).optional(),
  market: z.string().optional(),
  stage: IdeaStageSchema.optional(),
  constraints: z.record(z.unknown()).optional(),
  mode: GauntletModeSchema.optional(),
});

// ─── Core data types ───────────────────────────────────────────

export type IdeaInput = z.infer<typeof IdeaInputSchema>;

export interface Scorecard {
  clarity: number;
  pain: number;
  differentiation: number;
  buildability: number;
  distribution: number;
  monetization: number;
  evidence: number;
}

export interface Risk {
  title: string;
  severity: Severity;
  explanation: string;
  mitigation?: string;
}

export interface Assumption {
  title: string;
  whyItMatters: string;
  howToTest: string;
  confidence: Confidence;
}

export interface KillTest {
  title: string;
  method: string;
  timeframe: string;
  successSignal: string;
  killSignal: string;
}

export interface SyntheticPersona {
  name: string;
  archetype: string;
  goal: string;
  currentWorkaround: string;
  triggerToTry: string;
  primaryObjection: string;
  willingnessToPay: WillingnessToPay;
  likelyChurnReason: string;
  quote: string;
  interviewQuestion: string;
}

export interface CourtTurn {
  role: string;
  argument: string;
}

export interface CourtSession {
  transcript: CourtTurn[];
  verdict: string;
  unresolvedQuestions: string[];
}

export interface MVPPlan {
  goal: string;
  scope: string[];
  nonGoals: string[];
  timeline: string;
  metrics: string[];
}

export interface ComparedIdea {
  title: string;
  verdict: Verdict;
  score: number;
  riskiestAssumption: string;
  evidenceScore: number;
}

export interface ComparisonResult {
  ideas: ComparedIdea[];
  ranking: string[];
  fastestToValidate: string;
  highestUpside: string;
  recommendedPick: string;
}

export interface GauntletReport {
  id: string;
  createdAt: string;
  mode: GauntletMode;
  input: IdeaInput;
  verdict: Verdict;
  scores?: Scorecard;
  coreInsight?: string;
  strongestCase?: string;
  weakestAssumption?: string;
  risks?: Risk[];
  assumptions?: Assumption[];
  killTests?: KillTest[];
  syntheticUsers?: SyntheticPersona[];
  court?: CourtSession;
  comparison?: ComparisonResult;
  mvpPlan?: MVPPlan;
  nextActions?: string[];
  markdown: string;
}

// ─── Enhanced result types ────────────────────────────────────────

export interface EnhancedCourtDebate {
  ideaSnapshot: {
    idea: string;
    targetUser: string;
    market: string;
    stage: string;
    keyPromise: string;
  };
  assumptionsMap: Array<{
    assumption: string;
    riskLevel: "low" | "medium" | "high" | "critical";
    whyItMatters: string;
  }>;
  roleArguments: Array<{
    roleId: string;
    roleName: string;
    argument: string;
  }>;
  crossExamination: string;
  evidenceAudit: string;
  verdictDetail: string;
  killTests: KillTest[];
  scoresDetailed: Array<{
    dimension: string;
    score: number;
    reason: string;
  }>;
  nextActions: string[];
}

export interface EnhancedQuickReport {
  oneLineVerdict: string;
  topRisks: Risk[];
  topAssumptions: Assumption[];
  bestCase: string;
  worstCase: string;
  distributionRisk: string;
  monetizationRisk: string;
  buildabilityRisk: string;
  fastestValidationTest: {
    description: string;
    method: string;
    timeline: string;
    successSignal: string;
  };
  quickScores: Scorecard;
  nextStep: string;
}

export interface EnhancedPersona {
  name: string;
  archetype: string;
  segmentDescription: string;
  context: string;
  currentWorkaround: string;
  triggerEvent: string;
  desiredOutcome: string;
  primaryObjection: string;
  switchingCost: string;
  willingnessToPay: WillingnessToPay;
  adoptionBlocker: string;
  likelyChurnReason: string;
  quote: string;
  interviewQuestion: string;
}

export interface UserSynthesis {
  recurringObjections: string[];
  surprisingSegments: string[];
  segmentsLikelyToCare: string[];
  segmentsUnlikelyToCare: string[];
  interviewQuestions: string[];
  fakeDoorTestIdeas: string[];
}

export interface EnhancedMVPPlan {
  coreHypothesis: string;
  riskiestAssumptions: Array<{
    assumption: string;
    riskLevel: "low" | "medium" | "high" | "critical";
  }>;
  nonGoals: string[];
  mvpWedge: string;
  validationPlan: string[];
  experimentBacklog: string[];
  fakeDoorTest: string;
  conciergeTest: string;
  interviewScript: string[];
  successMetrics: Array<{
    metric: string;
    target: string;
  }>;
  killCriteria: string[];
  pivotOptions: string[];
  recommendedScope: string;
}

export interface EnhancedComparisonResult {
  comparisonMatrix: Array<{
    ideaTitle: string;
    criteria: Record<string, number>;
  }>;
  perIdeaStrengths: Array<{
    ideaTitle: string;
    strengths: string[];
  }>;
  perIdeaRisks: Array<{
    ideaTitle: string;
    risks: string[];
  }>;
  bestForFastValidation: {
    ideaTitle: string;
    reasoning: string;
  };
  bestForLongTermUpside: {
    ideaTitle: string;
    reasoning: string;
  };
  killTestsPerIdea: Array<{
    ideaTitle: string;
    killTests: string[];
  }>;
  recommendation: {
    pick: string;
    caveats: string[];
    reasoning: string;
  };
}

// Enhanced fields added via declaration merging — keeps original interface unchanged
export interface GauntletReport {
  courtDebate?: EnhancedCourtDebate;
  quickReport?: EnhancedQuickReport;
  enhancedSyntheticUsers?: EnhancedPersona[];
  userSynthesis?: UserSynthesis;
  enhancedMvpPlan?: EnhancedMVPPlan;
  enhancedComparison?: EnhancedComparisonResult;
}

// ─── Provider types ────────────────────────────────────────────

export interface CompletionOptions {
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMProvider {
  kind: "openai" | "ollama" | "custom";
  complete(prompt: string, options?: CompletionOptions): Promise<string>;
}
