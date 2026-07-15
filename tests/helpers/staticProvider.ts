import type { CompletionOptions, LLMProvider } from "../../src/core/types.js";

export class StaticProvider implements LLMProvider {
  kind = "custom" as const;
  private callCount = 0;

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    const combined = `${options?.system ?? ""}\n${prompt}`;
    this.callCount++;

    // ─── Court 2.0 — Multi-turn phase detection ──────────────────
    // Phase 1: Opening statements — system includes role mandate
    if (combined.includes("Court debate") && combined.includes("Your stance:") && combined.includes("opening statement")) {
      // Extract role name from system
      const roleMatch = combined.match(/You are (.+?) in an IdeaGauntlet/);
      const roleName = roleMatch?.[1] ?? "Unknown Role";
      const roleId = roleName.toLowerCase().replace(/\s+/g, "-");
      return `${roleName} opening: This idea faces significant challenges in my area of scrutiny. ${prompt.slice(0, 100)}`;
    }

    // Phase 2: Cross-examination — judge identifies conflicts
    if (combined.includes("Cross-examine") && combined.includes("OPENING STATEMENTS")) {
      return JSON.stringify({
        keyConflicts: [
          { roles: ["Market Skeptic", "Business Defender"], conflict: "Market Skeptic says no WTP, defender says $5-10/mo viable", significance: "high" },
          { roles: ["Product Skeptic", "User Advocate"], conflict: "Onboarding friction vs user need", significance: "medium" },
        ],
        openQuestions: ["Is there real willingness to pay?", "Can onboarding be simplified enough?"],
      });
    }

    // Phase 3: Rebuttals — skeptic responds to cross-exam
    if (combined.includes("REBUTTAL phase")) {
      const roleMatch = combined.match(/You are (.+?) in an IdeaGauntlet/);
      const roleName = roleMatch?.[1] ?? "Unknown Role";
      return `${roleName} rebuttal: The opposing arguments have merit but miss key evidence. ${prompt.slice(0, 80)}`;
    }

    // Phase 4: Final verdict — judge produces final JSON
    if (combined.includes("VERDICT phase") || (combined.includes("Court debate") && combined.includes("verdictDetail"))) {
      return JSON.stringify({
        ideaSnapshot: {
          idea: "A focus-room app for remote workers",
          targetUser: "Remote workers, students, freelancers",
          market: "Productivity tools for distributed teams",
          stage: "napkin",
          keyPromise: "Structured deep work through synthetic pair accountability",
        },
        assumptionsMap: [
          { assumption: "Users will feel accountable to an AI partner", riskLevel: "critical", whyItMatters: "Core value depends on perceived accountability" },
          { assumption: "Users will return after first session", riskLevel: "high", whyItMatters: "Retention drives habit formation" },
        ],
        roleArguments: [
          { roleId: "market-skeptic", roleName: "Market Skeptic", argument: "Demand for focus tools is high but willingness to pay is low. Most users use free timers or study-with-me videos." },
          { roleId: "distribution-skeptic", roleName: "Distribution Skeptic", argument: "Acquisition relies on content marketing in a crowded productivity space. CAC may exceed LTV for paid acquisition." },
          { roleId: "product-skeptic", roleName: "Product Skeptic", argument: "Onboarding requires user to commit to a session before experiencing value — high friction for first use." },
          { roleId: "technical-skeptic", roleName: "Technical Skeptic", argument: "Real-time pairing and accountability features require reliable WebRTC infrastructure. Small team operational burden is significant." },
          { roleId: "business-defender", roleName: "Business Defender", argument: "Focus rooms solve a genuine pain for remote workers. A modest subscription ($5-10/mo) is viable if retention exceeds 30% at 90 days." },
          { roleId: "user-advocate", roleName: "User Advocate", argument: "Users current workaround (coworking cafes, body-doubling Discord servers) is free and social. The product must be significantly better." },
          { roleId: "judge", roleName: "Judge", argument: "The idea has promise but the critical assumption (accountability to AI) is untested. A fake-door test should precede any build." },
        ],
        crossExamination: "The strongest disagreement is between the Market Skeptic (no WTP) and Business Defender ($5-10/mo viable). This is the key assumption to test.",
        evidenceAudit: "No direct evidence supports the idea. Assumed: users want AI accountability. Unknown: WTP, retention, acquisition cost.",
        killTests: [
          { title: "Fake-door WTP test", method: "Landing page with pricing tiers", timeframe: "1 week", successSignal: "5% click-through to payment", killSignal: "<1% CTR" },
          { title: "Single-session prototype", method: "Manual concierge test with 10 users", timeframe: "2 weeks", successSignal: "6/10 complete session", killSignal: "<3/10 complete" },
        ],
        scoresDetailed: [
          { dimension: "Clarity", score: 7, reason: "The idea is understandable but the exact mechanic (AI vs human pairing) is ambiguous." },
          { dimension: "Pain", score: 6, reason: "Focus is a real problem but current free workarounds reduce urgency." },
          { dimension: "Urgency", score: 4, reason: "Users have existing coping strategies — no crisis driving adoption." },
          { dimension: "Differentiation", score: 5, reason: "AI body-doubling is novel but adjacent to existing focus tools." },
          { dimension: "Distribution", score: 3, reason: "Crowded productivity space with high CAC." },
          { dimension: "Monetization", score: 4, reason: "WTP uncertain; free alternatives exist." },
          { dimension: "Buildability", score: 6, reason: "Core timer + pairing is buildable but real-time infra is non-trivial." },
          { dimension: "Retention", score: 3, reason: "No clear retention loop beyond habit formation." },
          { dimension: "Evidence", score: 2, reason: "No real user evidence yet." },
          { dimension: "Overall", score: 5, reason: "Promising concept with critical untested assumptions." },
        ],
        verdictDetail: "Promising but high-risk. The core assumption (accountability to AI) must be validated before building. Recommend fake-door test first.",
        nextActions: [
          "Run a fake-door WTP test with 3 pricing tiers",
          "Interview 10 remote workers about current focus routines",
          "Build a single-session manual concierge prototype",
        ],
      });
    }

    // ─── Legacy court mode (single-call) — backward compat ─────────
    if (combined.includes("Court Mode")) {
      return JSON.stringify({
        ideaSnapshot: {
          idea: "A focus-room app for remote workers",
          targetUser: "Remote workers, students, freelancers",
          market: "Productivity tools for distributed teams",
          stage: "napkin",
          keyPromise: "Structured deep work through synthetic pair accountability",
        },
        assumptionsMap: [
          { assumption: "Users will feel accountable to an AI partner", riskLevel: "critical", whyItMatters: "Core value depends on perceived accountability" },
          { assumption: "Users will return after first session", riskLevel: "high", whyItMatters: "Retention drives habit formation" },
        ],
        roleArguments: [
          { roleId: "market-skeptic", roleName: "Market Skeptic", argument: "Demand for focus tools is high but willingness to pay is low. Most users use free timers or study-with-me videos." },
          { roleId: "distribution-skeptic", roleName: "Distribution Skeptic", argument: "Acquisition relies on content marketing in a crowded productivity space. CAC may exceed LTV for paid acquisition." },
          { roleId: "product-skeptic", roleName: "Product Skeptic", argument: "Onboarding requires user to commit to a session before experiencing value — high friction for first use." },
          { roleId: "technical-skeptic", roleName: "Technical Skeptic", argument: "Real-time pairing and accountability features require reliable WebRTC infrastructure. Small team operational burden is significant." },
          { roleId: "business-defender", roleName: "Business Defender", argument: "Focus rooms solve a genuine pain for remote workers. A modest subscription ($5-10/mo) is viable if retention exceeds 30% at 90 days." },
          { roleId: "user-advocate", roleName: "User Advocate", argument: "Users current workaround (coworking cafes, body-doubling Discord servers) is free and social. The product must be significantly better." },
          { roleId: "judge", roleName: "Judge", argument: "The idea has promise but the critical assumption (accountability to AI) is untested. A fake-door test should precede any build." },
        ],
        crossExamination: "The strongest disagreement is between the Market Skeptic (no WTP) and Business Defender ($5-10/mo viable). This is the key assumption to test.",
        evidenceAudit: "No direct evidence supports the idea. Assumed: users want AI accountability. Unknown: WTP, retention, acquisition cost.",
        killTests: [
          { title: "Fake-door WTP test", method: "Landing page with pricing tiers", timeframe: "1 week", successSignal: "5% click-through to payment", killSignal: "<1% CTR" },
          { title: "Single-session prototype", method: "Manual concierge test with 10 users", timeframe: "2 weeks", successSignal: "6/10 complete session", killSignal: "<3/10 complete" },
        ],
        scoresDetailed: [
          { dimension: "Clarity", score: 7, reason: "The idea is understandable but the exact mechanic (AI vs human pairing) is ambiguous." },
          { dimension: "Pain", score: 6, reason: "Focus is a real problem but current free workarounds reduce urgency." },
          { dimension: "Urgency", score: 4, reason: "Users have existing coping strategies — no crisis driving adoption." },
          { dimension: "Differentiation", score: 5, reason: "AI body-doubling is novel but adjacent to existing focus tools." },
          { dimension: "Distribution", score: 3, reason: "Crowded productivity space with high CAC." },
          { dimension: "Monetization", score: 4, reason: "WTP uncertain; free alternatives exist." },
          { dimension: "Buildability", score: 6, reason: "Core timer + pairing is buildable but real-time infra is non-trivial." },
          { dimension: "Retention", score: 3, reason: "No clear retention loop beyond habit formation." },
          { dimension: "Evidence", score: 2, reason: "No real user evidence yet." },
          { dimension: "Overall", score: 5, reason: "Promising concept with critical untested assumptions." },
        ],
        verdictDetail: "Promising but high-risk. The core assumption (accountability to AI) must be validated before building. Recommend fake-door test first.",
        nextActions: [
          "Run a fake-door WTP test with 3 pricing tiers",
          "Interview 10 remote workers about current focus routines",
          "Build a single-session manual concierge prototype",
        ],
      });
    }

    // Quick mode
    if (combined.includes("Quick Critique") || combined.includes("Quick")) {
      return JSON.stringify({
        oneLineVerdict: "Promising concept with critical untested assumptions around retention and willingness to pay.",
        topRisks: [
          { title: "Low retention after novelty", severity: "high", explanation: "Users may try once and not return.", mitigation: "Measure 7-day return rate." },
        ],
        topAssumptions: [
          { title: "Users want synthetic social presence", whyItMatters: "Core value depends on it", howToTest: "Run a fake-door session test", confidence: "low" },
        ],
        bestCase: "Remote workers adopt focus rooms as a daily routine, creating a new category of AI-accountability productivity tools.",
        worstCase: "Users try once, feel no accountability, and return to free alternatives like study-with-me videos.",
        distributionRisk: "High CAC in crowded productivity space with low differentiation for paid acquisition.",
        monetizationRisk: "Users expect free focus tools; converting to paid requires demonstrated ROI.",
        buildabilityRisk: "Real-time pairing infra is complex for a small team; WebRTC scaling is non-trivial.",
        fastestValidationTest: {
          description: "Fake-door landing page with timer feature mockup",
          method: "Static page with CTA to 'start a focus session'",
          timeline: "2 days",
          successSignal: "40% click-through to session start",
        },
        scores: { clarity: 6, pain: 5, differentiation: 5, buildability: 6, distribution: 3, monetization: 3, evidence: 2 },
        nextStep: "Run a fake-door test with a simple timer page and measure engagement.",
      });
    }

    // Users mode
    if (combined.includes("Synthetic User Generator")) {
      return JSON.stringify({
        users: [
          {
            name: "Alex Chen",
            archetype: "Busy Student",
            segmentDescription: "University students preparing for exams",
            context: "Final-year engineering student with 3 exams in 2 weeks",
            currentWorkaround: "Study-with-me videos on YouTube",
            triggerEvent: "Exam week stress and inability to focus at home",
            desiredOutcome: "Complete 4 focused study sessions per day",
            primaryObjection: "AI presence may not feel real enough to create accountability",
            switchingCost: "Low — can switch back to free YouTube videos instantly",
            willingnessToPay: "low",
            adoptionBlocker: "No budget for paid productivity tools as a student",
            likelyChurnReason: "After exams pass, no recurring need",
            quote: "I would try it if it helps me start studying. Not sure I'd pay.",
            interviewQuestion: "What would make you feel accountable to finish a study session?",
          },
        ],
        synthesis: {
          recurringObjections: ["Uncertainty about AI accountability", "Prefer free alternatives"],
          surprisingSegments: ["Freelancers working across time zones"],
          segmentsLikelyToCare: ["Remote workers", "Students during exam periods"],
          segmentsUnlikelyToCare: ["People in open-plan offices", "Retirees"],
          interviewQuestions: [
            "What do you do when you cannot focus?",
            "Have you ever paid for a focus or productivity tool?",
          ],
          fakeDoorTestIdeas: [
            "Landing page offering 'focus sessions with a virtual partner'",
            "Discord bot that pairs people for silent work sessions",
          ],
          overallWillingnessToPayScore: 4,
          adoptionLikelihoodScore: 6,
          differentiationScore: 5,
        },
      });
    }

    // MVP mode
    if (combined.includes("MVP Planner")) {
      return JSON.stringify({
        coreHypothesis: "Users will complete more focused work sessions with a synthetic accountability partner than alone.",
        riskiestAssumptions: [
          { assumption: "Users feel accountability to an AI partner", riskLevel: "critical" },
          { assumption: "Users will pay for focus accountability", riskLevel: "high" },
        ],
        nonGoals: ["Payments integration", "Mobile app", "Team dashboards", "Social features"],
        mvpWedge: "A single-room focus timer with a simulated companion presence and session tracking.",
        validationPlan: [
          "Day 1-2: Build fake-door landing page",
          "Day 3-5: Interview 10 target users",
          "Day 6-10: Build single-session prototype",
          "Day 11-14: Run prototype with 10 users",
        ],
        experimentBacklog: ["A/B test timer-only vs companion presence", "Pricing page conversion test"],
        fakeDoorTest: "Landing page with 'Start a focus session' CTA, measure CTR and email capture.",
        conciergeTest: "Manually pair users in a Discord voice channel for 50-minute silent sessions, observe completion rate.",
        interviewScript: [
          "What do you currently do when you need to focus deeply?",
          "What makes you stop a focus session early?",
        ],
        successMetrics: [
          { metric: "Session completion rate", target: ">60%" },
          { metric: "Users requesting follow-up", target: ">3 of 10" },
        ],
        killCriteria: [
          "Less than 40% session completion rate",
          "Zero users willing to pay after prototype",
          "Negative feedback on companion presence",
        ],
        pivotOptions: [
          "Human pairing instead of AI companion",
          "Focus timer without companion (simple productivity tool)",
          "Team accountability feature for small remote teams",
        ],
        recommendedScope: "Single-room focus timer with simulated companion. No auth, no payments, no mobile.",
        timeline: "10 days",
      });
    }

    // Compare mode
    if (combined.includes("Comparison") || combined.includes("compare")) {
      return JSON.stringify({
        comparisonMatrix: [
          {
            ideaTitle: "Focus Room App",
            criteria: { clarity: 7, pain: 6, urgency: 4, marketAccessibility: 5, distribution: 3, monetization: 4, differentiation: 5, buildComplexity: 6, timeToValidate: 8, evidence: 2 },
          },
          {
            ideaTitle: "SaaS Inbox for Sellers",
            criteria: { clarity: 8, pain: 8, urgency: 7, marketAccessibility: 6, distribution: 5, monetization: 7, differentiation: 6, buildComplexity: 4, timeToValidate: 5, evidence: 3 },
          },
        ],
        perIdeaStrengths: [
          { ideaTitle: "Focus Room App", strengths: ["Low build complexity", "Fast to validate", "Novel category"] },
          { ideaTitle: "SaaS Inbox for Sellers", strengths: ["Clear pain point", "Higher WTP", "Stickier retention"] },
        ],
        perIdeaRisks: [
          { ideaTitle: "Focus Room App", risks: ["Low retention", "Low WTP", "Crowded market"] },
          { ideaTitle: "SaaS Inbox for Sellers", risks: ["High build complexity", "Integration dependencies", "Longer validation cycle"] },
        ],
        bestForFastValidation: { ideaTitle: "Focus Room App", reasoning: "Can be tested with a landing page in 2 days. No complex integrations needed." },
        bestForLongTermUpside: { ideaTitle: "SaaS Inbox for Sellers", reasoning: "Higher WTP, stickier retention, clearer monetization path." },
        killTestsPerIdea: [
          { ideaTitle: "Focus Room App", killTests: ["Fake-door WTP test", "10-user prototype completion rate"] },
          { ideaTitle: "SaaS Inbox for Sellers", killTests: ["API integration feasibility", "Seller interview pain validation"] },
        ],
        recommendation: {
          pick: "Focus Room App",
          caveats: ["Only if the fake-door test shows >5% conversion", "If WTP is zero, pivot immediately"],
          reasoning: "Focus Room validates faster with less build cost. If the core assumption holds, it's worth pursuing. The SaaS Inbox is higher upside but requires more investment to test.",
        },
      });
    }

    // Default fallback for other calls
    return "Generic analysis response for testing.";
  }
}
