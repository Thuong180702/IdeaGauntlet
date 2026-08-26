import { z } from "zod";
import type { ResearchBrief, CompetitorLandscape, NicheOpportunity } from "../search/types.js";

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

/**
 * Where a score's grounding actually came from.
 *
 * - `sourced`   — backed by at least one citation that was matched against the
 *                 retrieved research brief.
 * - `judgment`  — the model's prior. Not worthless, but not evidence.
 *
 * A model may not self-certify as `sourced`: the claim is verified against the
 * brief, and downgraded when the citation cannot be found. See `verifyScoreProvenance`.
 */
export type ScoreBasis = "sourced" | "judgment";

/**
 * Grounded justification for a single score dimension.
 * `evidence` cites what supports the number; `sensitivity` says what would move it.
 */
export interface ScoreRubricEntry {
  /** Concrete grounding for this score (idea/competitor/research), not generic. */
  evidence: string;
  /** One sentence: what would push this score up ~2 and what would push it down ~2. */
  sensitivity: string;
  /** Set by `verifyScoreProvenance` — never trusted straight from the model. */
  basis?: ScoreBasis;
  /** Claimed citations that were matched against the research brief. */
  citations?: string[];
  /** Claimed citations that could NOT be found in the brief. Surfaced, not hidden. */
  unverifiedCitations?: string[];
}

/**
 * How much of a scorecard is actually evidence-backed.
 *
 * This exists so a report can never imply more grounding than it has: a reader
 * sees at a glance how many dimensions rest on retrieved sources versus the
 * model's prior, and how many claimed citations did not survive verification.
 */
export interface CalibrationSummary {
  /** Dimensions assessed in this mode. */
  assessedCount: number;
  /** Dimensions with at least one verified citation. */
  sourcedCount: number;
  /** Dimensions resting on model judgment alone. */
  judgmentCount: number;
  /** Claimed citations that were not found in the research brief. */
  droppedCitationCount: number;
  /** True when the run had no research brief at all. */
  researchUnavailable: boolean;
  /** One-line, plain-language reading of the numbers above. */
  note: string;
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
    /** What would move this score up/down ~2 points. */
    sensitivity?: string;
  }>;
  nextActions: string[];
  competitorLandscape?: CompetitorLandscape;
  nicheOpportunities?: NicheOpportunity[];
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
  competitorAnalysis?: CompetitorLandscape;
  nicheOpportunities?: NicheOpportunity[];
  timingRisk?: {
    window: string;
    urgency: string;
    whatChangesIfDelayed: string;
  };
  defensibility?: {
    moatType: string;
    strength: string;
    timeline: string;
  };
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
  competitiveWedge?: string;
  nicheStrategy?: { niche: string; whyUnderserved: string; howToReach: string };
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
  competitorLandscapePerIdea?: Array<{ ideaTitle: string; landscape: CompetitorLandscape }>;
  nicheOpportunitiesPerIdea?: Array<{ ideaTitle: string; niches: NicheOpportunity[] }>;
}

export interface MarketSizing {
  tam: string;
  sam: string;
  som: string;
  cagr?: string;
  assumptions: string[];
  methodology: string;
  sourcesCited?: string[];
  confidence: Confidence;
}

export interface UnitEconomics {
  cacEstimate: string;
  ltvEstimate: string;
  ltvToCacRatio: string;
  paybackPeriodMonths: string;
  grossMarginEstimate: string;
  pricingStrategy: string;
  sustainabilityVerdict: "healthy" | "risky" | "unviable" | "unclear";
  keyRisks: string[];
}

export interface AntiPatternResult {
  patternId: string;
  name: string;
  matched: boolean;
  severity: Severity;
  explanation: string;
  preventionAdvice: string;
}

export interface AntiPatternReport {
  detectedPatterns: AntiPatternResult[];
  overallRiskLevel: Severity;
  summary: string;
}

// Enhanced fields added via declaration merging — keeps original interface unchanged
// ─── Assumption ledger (falsifiability) ───────────────────────────

/** What happens to the idea if this assumption turns out false. */
export type AssumptionCriticality = "fatal" | "major" | "minor";

/** The cheapest experiment that could disprove one assumption. */
export interface AssumptionTest {
  /** Concrete method — "fake-door landing page", "20 cold DMs", not "do research". */
  method: string;
  /** Calendar days to run it. */
  timeboxDays: number;
  /** Rough out-of-pocket cost in USD. 0 is legitimate. */
  costUsd: number;
  /** How much data makes the result readable, e.g. "40 visitors" or "12 interviews". */
  sampleSize?: string;
}

export interface LedgerAssumption {
  /** Stable slug, used by `testOrder`. */
  id: string;
  /** The belief stated so it can be false — not a topic. */
  statement: string;
  criticality: AssumptionCriticality;
  /** How sure the founder can currently be, before running the test. */
  confidence: Confidence;
  /** What breaks downstream if this is false. */
  whyItMatters: string;
  test: AssumptionTest;
  /** The threshold that declares the assumption dead. Must name a number. */
  killThreshold: string;
  /** What a passing result looks like. */
  surviveSignal: string;
  /**
   * Computed in code, never taken from the model: criticality x uncertainty x
   * cheapness. Higher means test it sooner.
   */
  priority: number;
}

export interface AssumptionLedger {
  assumptions: LedgerAssumption[];
  /** Statement of the assumption that is both most fatal and least certain. */
  riskiestAssumption: string;
  /** Assumption ids, cheapest-decisive-test first. */
  testOrder: string[];
  /** Sum of timeboxes across the ledger. */
  totalTimeboxDays: number;
  totalCostUsd: number;
  /** Days and dollars to resolve every `fatal` assumption. */
  fatalTimeboxDays: number;
  fatalCostUsd: number;
  summary: string;
}

export interface GauntletReport {
  courtDebate?: EnhancedCourtDebate;
  quickReport?: EnhancedQuickReport;
  enhancedSyntheticUsers?: EnhancedPersona[];
  userSynthesis?: UserSynthesis;
  enhancedMvpPlan?: EnhancedMVPPlan;
  enhancedComparison?: EnhancedComparisonResult;
  marketSizing?: MarketSizing;
  unitEconomics?: UnitEconomics;
  antiPatterns?: AntiPatternReport;
  /** Grounded rubric (evidence + sensitivity) per scored dimension. */
  scoreRubric?: Partial<Record<keyof Scorecard, ScoreRubricEntry>>;
  /** How much of the scorecard is evidence-backed vs model judgment. */
  calibration?: CalibrationSummary;
  /** Falsifiable assumptions with kill thresholds and a test order. */
  assumptionLedger?: AssumptionLedger;
  /** Dimensions this mode does not evaluate — shown as "not assessed", never faked. */
  unassessedDimensions?: (keyof Scorecard)[];
  /** One punchy, quotable sentence — the sharpest takeaway (drives the share card). */
  brutalTakeaway?: string;
  /** Web research brief gathered before LLM analysis. */
  webResearch?: ResearchBrief;
  /** P0-3: True when LLM parse failed or research failed — report may be incomplete. */
  partial?: boolean;
  /** P0-3: Human-readable warnings (e.g. "web research failed", "LLM returned malformed JSON"). */
  warnings?: string[];
  /** Phase 2: GTM Strategy */
  gtmStrategy?: GTMStrategy;
  /** Phase 2: Competitive Intelligence Deep Dive */
  competitiveIntelligence?: CompetitiveIntelligence;
  /** Phase 2: Revenue Model Explorer */
  revenueModel?: RevenueModel;
  /** Phase 2: Founder-Market Fit */
  founderMarketFit?: FounderMarketFit;
  /** Phase 3: AI-Simulated User Interview */
  userInterviewSession?: UserInterviewSession;
  /** Phase 3: Pitch Deck Generator */
  pitchDeck?: PitchDeck;
  /** Phase 3: Idea Evolution Coach */
  ideaEvolution?: IdeaEvolution;
  /** Phase 3: Regulatory & Compliance Scanner */
  complianceReport?: ComplianceReport;
}

// ─── Phase 2 Types ────────────────────────────────────────────────────────────

export interface GTMChannel {
  name: string;
  type: "organic" | "paid" | "partnership" | "community" | "product_led";
  priority: "primary" | "secondary" | "experimental";
  estimatedCAC: string;
  timeToFirstCustomer: string;
  rationale: string;
  risks: string[];
}

export interface GTMLaunchMilestone {
  week: string;
  action: string;
  goal: string;
  successSignal: string;
}

export interface GTMStrategy {
  targetSegment: string;
  positioningStatement: string;
  channels: GTMChannel[];
  first100CustomersStrategy: string;
  launchPlaybook: GTMLaunchMilestone[];
  budgetAllocation: { channel: string; percentage: number; note: string }[];
  keyMetrics: string[];
  biggestGTMRisk: string;
  confidence: Confidence;
}

export interface CompetitorProfile {
  name: string;
  url?: string;
  type: "direct" | "indirect" | "substitut";
  estimatedARR?: string;
  fundingStatus?: string;
  strengths: string[];
  weaknesses: string[];
  positioning: string;
  pricing?: string;
  targetSegment?: string;
}

export interface CompetitiveIntelligence {
  competitors: CompetitorProfile[];
  positioningMap: {
    xAxis: string;
    yAxis: string;
    positions: Array<{ name: string; x: number; y: number }>;
  };
  strategicWindows: string[];
  attackVectors: string[];
  defensiveStrategies: string[];
  marketTiming: string;
  summary: string;
}

export interface RevenueModelOption {
  model: string;
  fitScore: number; // 1-10
  rationale: string;
  pros: string[];
  cons: string[];
  pricingRecommendation: string;
  revenueProjectionY1: string;
  revenueProjectionY3: string;
  whenToStartCharging: string;
  comparablePricing: string[];
}

export interface RevenueModel {
  recommendedModel: string;
  options: RevenueModelOption[];
  monetizationTimeline: string;
  pricingTiers: Array<{ name: string; price: string; targetSegment: string; features: string[] }>;
  keyRevenueRisks: string[];
  confidence: Confidence;
}

export interface FounderMarketFit {
  backgroundSummary: string;
  domainExpertiseScore: number; // 1-10
  networkAdvantageScore: number; // 1-10
  executionRiskScore: number; // 1-10 (higher = riskier)
  expertiseGaps: string[];
  unfairAdvantages: string[];
  recommendedCoFounderProfile: string;
  firstHireRecommendations: string[];
  fitVerdict: "strong_fit" | "moderate_fit" | "weak_fit" | "needs_cofounder";
  fitSummary: string;
}

// ─── Phase 3 Types ────────────────────────────────────────────────────────────

export interface InterviewTurn {
  speaker: "founder" | "persona";
  message: string;
}

export interface UserInterviewSession {
  persona: {
    name: string;
    role: string;
    companyOrContext: string;
    archetype: string;
    currentWorkaround: string;
    painLevel: number; // 1-10
  };
  dialogue: InterviewTurn[];
  keyInsights: string[];
  uncoveredNeeds: string[];
  objectionAnalysis: string;
  wouldBuyVerdict: "definitely" | "maybe" | "unlikely" | "no";
  maxWillingnessToPay: string;
  goldenQuote: string;
}

export interface PitchDeckSlide {
  slideNumber: number;
  title: string;
  headline: string;
  bulletPoints: string[];
  visualConcept: string;
  speakerNotes: string;
}

export interface PitchDeck {
  template: "yc" | "sequoia" | "a16z";
  companyName: string;
  oneLinePitch: string;
  slides: PitchDeckSlide[];
  elevatorPitch: string;
  whyNowNarrative: string;
}

export interface IdeaVariant {
  variantName: string;
  angle: string;
  oneSentencePitch: string;
  coreChange: string;
  whyThisWorksBetter: string;
  estimatedScoreDeltas: Partial<Record<keyof Scorecard, number>>;
  newTargetCustomer: string;
  risks: string[];
}

export interface IdeaEvolution {
  originalIdea: string;
  primaryBottleneck: string;
  oneBigChangeRecommendation: string;
  variants: IdeaVariant[];
  suggestedExperiment: string;
}

export interface ComplianceRequirement {
  regulation: string;
  applicable: boolean;
  severity: Severity;
  requirements: string[];
  penaltiesForNonCompliance: string;
  recommendedAction: string;
}

export interface ComplianceReport {
  overallRiskLevel: Severity;
  applicableFrameworks: string[];
  requirements: ComplianceRequirement[];
  dataPrivacyChecklist: string[];
  estimatedComplianceTimeline: string;
  summary: string;
}

// ─── Provider types ────────────────────────────────────────────

export interface CompletionOptions {
  system?: string;
  temperature?: number;
  maxTokens?: number;
  /** AbortSignal for timeout/cancellation. */
  signal?: AbortSignal;
  /** Streaming callback — invoked on each token chunk if supported by provider. */
  onToken?: (chunk: string) => void;
  /** Retry configuration override. */
  retry?: RetryConfig;
}

export interface RetryConfig {
  /** Maximum retry attempts. Default 3. */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff. Default 1000. */
  baseDelayMs?: number;
  /** Maximum delay cap in ms. Default 30000. */
  maxDelayMs?: number;
  /** HTTP status codes that should trigger a retry. Default [429, 500, 502, 503, 504]. */
  retryOnStatuses?: number[];
}

export const DEFAULT_RETRY: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryOnStatuses: [429, 500, 502, 503, 504],
};

export interface LLMProvider {
  kind: "openai" | "ollama" | "claude" | "custom";
  complete(prompt: string, options?: CompletionOptions): Promise<string>;
  // W-10: Optional early key validation — quick test call to fail before engine runs.
  validateKey?(): Promise<boolean>;
}
