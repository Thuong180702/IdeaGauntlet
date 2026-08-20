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
    if (combined.includes("Quick Critique") || combined.includes("Immune Engine") || combined.includes("oneLineVerdict")) {
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

    // Market sizing mode
    if (combined.includes("Market Sizing") || combined.includes("Sizing Analyst")) {
      return JSON.stringify({
        tam: "$15B global market",
        sam: "$2.5B remote worker segment",
        som: "$25M early addressable beachhead",
        cagr: "12.5%",
        assumptions: ["10M remote knowledge workers", "$20/mo willingness to pay"],
        methodology: "Top-down research brief calibration + bottom-up user arithmetic",
        sourcesCited: ["Gartner remote work report 2024"],
        confidence: "medium",
      });
    }

    // Anti-pattern detector
    if (combined.includes("Anti-Pattern") || combined.includes("Startup Failure Mode") || combined.includes("anti_patterns") || combined.includes("startup traps")) {
      return JSON.stringify({
        detectedPatterns: [
          {
            patternId: "feature_not_product",
            name: "Feature Not a Product",
            matched: true,
            severity: "medium",
            explanation: "Could be absorbed by Slack or Zoom",
            preventionAdvice: "Build proprietary workflow integrations and deep analytics",
          },
          {
            patternId: "vitamin_not_painkiller",
            name: "Vitamin vs. Painkiller",
            matched: false,
            severity: "low",
            explanation: "Addresses genuine procrastination distress",
            preventionAdvice: "Keep proving measurable time saved",
          },
        ],
        overallRiskLevel: "medium",
        summary: "Primary trap to avoid is feature absorption by existing remote suite platforms.",
      });
    }

    // Unit economics mode
    if (combined.includes("Unit Economics Specialist") || (combined.includes("Unit Economics") && (combined.includes("cacEstimate") || combined.includes("LTV to CAC") || combined.includes("LTV")))) {
      return JSON.stringify({
        cacEstimate: "$150-$250 via SEO & ProductHunt",
        ltvEstimate: "$900 ($30/mo * 30 months)",
        ltvToCacRatio: "4.5x",
        paybackPeriodMonths: "5 months",
        grossMarginEstimate: "82%",
        pricingStrategy: "Tiered subscription with team add-on",
        sustainabilityVerdict: "healthy",
        keyRisks: ["Ad cost inflation in productivity keywords"],
      });
    }

    // Compare mode
    if (combined.includes("Comparison Matrix") || combined.includes("Comparison Analyst") || combined.includes("compareIdeas") || (combined.includes("criteria") && combined.includes("comparisonMatrix"))) {
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

    // GTM mode
    if (combined.includes("Go-To-Market (GTM) Strategy Director") || combined.includes("GTM Strategy")) {
      return JSON.stringify({
        targetSegment: "Remote-first tech workers and freelance software engineers",
        positioningStatement: "For remote workers struggling with focus, IdeaGauntlet is the virtual co-working space that provides AI accountability, unlike passive study timers.",
        channels: [
          {
            name: "ProductHunt & Indie Hackers launch",
            type: "community",
            priority: "primary",
            estimatedCAC: "$20-$50",
            timeToFirstCustomer: "1-2 weeks",
            rationale: "Highly receptive early adopter audience for productivity tools",
            risks: ["Spike-and-decay traffic pattern"],
          },
          {
            name: "SEO Content (deep work techniques)",
            type: "organic",
            priority: "secondary",
            estimatedCAC: "$0-$30",
            timeToFirstCustomer: "2-3 months",
            rationale: "High intent search traffic for focus and productivity",
            risks: ["Slow ramp up"],
          },
        ],
        first100CustomersStrategy: "Engage directly with productivity communities on Reddit and Discord with free beta invites.",
        launchPlaybook: [
          { week: "Week 1", action: "Landing page live with waitlist", goal: "Collect 200 emails", successSignal: "15% conversion on page" },
          { week: "Week 2-4", action: "Private beta with 50 users", goal: "Measure weekly retention", successSignal: ">40% 7-day retention" },
        ],
        budgetAllocation: [
          { channel: "Community & Content", percentage: 60, note: "Founder time and seed content" },
          { channel: "Paid Ads", percentage: 40, note: "Targeted search ads for validation" },
        ],
        keyMetrics: ["DAU/MAU ratio", "Weekly focus sessions completed", "Paid conversion rate"],
        biggestGTMRisk: "High early churn due to novelty wearing off",
        confidence: "high",
      });
    }

    // Competitive intelligence mode
    if (combined.includes("Competitive Intelligence Director") || combined.includes("Competitive Intelligence")) {
      return JSON.stringify({
        competitors: [
          {
            name: "Focusmate",
            url: "https://focusmate.com",
            type: "direct",
            estimatedARR: "$3M",
            fundingStatus: "Bootstrapped",
            strengths: ["Strong community", "Established brand", "Simple UX"],
            weaknesses: ["Requires video on (awkward for some)", "No AI matching"],
            positioning: "Virtual coworking with human accountability partners",
            pricing: "$5-$10/month",
            targetSegment: "Freelancers and students",
          },
          {
            name: "Centred",
            url: "https://centred.app",
            type: "indirect",
            estimatedARR: "$1M",
            fundingStatus: "Seed $1.5M",
            strengths: ["Task management integration", "Audio coaching"],
            weaknesses: ["Complex desktop app", "Higher battery drain"],
            positioning: "Flow state operating system for individuals",
            pricing: "$12/month",
            targetSegment: "Knowledge workers",
          },
        ],
        positioningMap: {
          xAxis: "Price: Low → High",
          yAxis: "Automation: Manual → AI-Powered",
          positions: [
            { name: "Focusmate", x: 3, y: 2 },
            { name: "Centred", x: 7, y: 6 },
            { name: "Our Product", x: 4, y: 8 },
          ],
        },
        strategicWindows: ["Surge in remote work burnout creates appetite for automated accountability tools"],
        attackVectors: ["Offer audio-only and AI-simulated options to capture users uncomfortable with video"],
        defensiveStrategies: ["Build proprietary focus session interaction datasets to train custom pacing models"],
        marketTiming: "Optimal — post-remote adoption with persistent focus fatigue.",
        summary: "Market is ripe for AI-assisted focus rooms that eliminate human partner scheduling friction.",
      });
    }

    // Revenue model mode
    if (combined.includes("Revenue Model Strategist") || combined.includes("Revenue Model")) {
      return JSON.stringify({
        recommendedModel: "subscription_saas",
        options: [
          {
            model: "subscription_saas",
            fitScore: 9,
            rationale: "High recurring daily usage makes monthly/annual subscription the natural monetization fit.",
            pros: ["Predictable recurring revenue", "High LTV potential with daily habits"],
            cons: ["Need high retention to combat churn"],
            pricingRecommendation: "$10/mo or $80/yr",
            revenueProjectionY1: "$120K ARR (1,000 subscribers)",
            revenueProjectionY3: "$1.5M ARR (12,500 subscribers)",
            whenToStartCharging: "After 3 free completed sessions",
            comparablePricing: ["Focusmate ($9.99/mo)", "Brain.fm ($6.99/mo)"],
          },
          {
            model: "freemium",
            fitScore: 8,
            rationale: "Free tier with 3 sessions/week drives viral word of mouth.",
            pros: ["Low top-of-funnel friction", "Organic referral loop"],
            cons: ["Server costs for free tier users"],
            pricingRecommendation: "Free (3 sessions/wk) → $12/mo unlimited",
            revenueProjectionY1: "$90K ARR",
            revenueProjectionY3: "$1.2M ARR",
            whenToStartCharging: "Immediate freemium gating",
            comparablePricing: ["Forest App (free with in-app purchase)"],
          },
        ],
        monetizationTimeline: "Launch with 14-day free trial, transition to 3 free sessions/week freemium tier at scale.",
        pricingTiers: [
          { name: "Free", price: "$0/mo", targetSegment: "Casual focusers", features: ["3 sessions/week", "Standard audio", "Basic stats"] },
          { name: "Pro", price: "$10/mo", targetSegment: "Daily remote workers", features: ["Unlimited sessions", "AI accountability bot", "Advanced analytics", "Integrations"] },
          { name: "Teams", price: "$25/seat/mo", targetSegment: "Distributed companies", features: ["Private company rooms", "Manager dashboards", "SSO"] },
        ],
        keyRevenueRisks: ["Willingness to pay may drop if free substitutes improve", "App store fee margins on mobile"],
        confidence: "high",
      });
    }

    // Founder-market fit mode
    if (combined.includes("Founder-Market Fit Analyst") || combined.includes("FOUNDER BACKGROUND")) {
      return JSON.stringify({
        backgroundSummary: "Technical founder with 8 years in distributed systems and 3 years working remotely as an engineering lead.",
        domainExpertiseScore: 8,
        networkAdvantageScore: 6,
        executionRiskScore: 3,
        expertiseGaps: ["Growth marketing and B2C user acquisition experience", "Paid advertising optimization"],
        unfairAdvantages: ["Deep understanding of remote worker daily pain points", "Can build the core real-time WebRTC infrastructure solo"],
        recommendedCoFounderProfile: "Growth/marketing co-founder with experience scaling consumer subscription apps or B2B developer tools.",
        firstHireRecommendations: [
          "Community & Content Lead to build early user loops",
          "UI/UX Designer to optimize onboarding friction",
          "Full-stack Engineer once MVP scales",
        ],
        fitVerdict: "strong_fit",
        fitSummary: "Strong technical fit to build the product rapidly. Primary risk is marketing and distribution, which can be mitigated with a growth advisor or co-founder.",
      });
    }

    // User interview mode
    if (combined.includes("Customer Discovery & User Research Lead") || combined.includes("customer discovery interview")) {
      return JSON.stringify({
        persona: {
          name: "Jordan Lee",
          role: "Senior Backend Engineer",
          companyOrContext: "Fully remote Series B SaaS (80 employees)",
          archetype: "Distracted Remote Engineer",
          currentWorkaround: "Noise-cancelling headphones and Pomodoro timer app",
          painLevel: 8,
        },
        dialogue: [
          { speaker: "founder", message: "What is the hardest part about staying focused while working from home?" },
          { speaker: "persona", message: "It's the context switching between Slack, PR reviews, and actual coding. I lose momentum and end up browsing Twitter." },
          { speaker: "founder", message: "Have you tried body-doubling tools like Focusmate?" },
          { speaker: "persona", message: "I tried it once, but having video on with a stranger felt awkward and high pressure." },
          { speaker: "founder", message: "What if it was audio-only or with an intelligent bot accountability partner?" },
          { speaker: "persona", message: "That would be 10x better. Lower social anxiety, but still has that subtle presence that stops me from tabbing out." },
        ],
        keyInsights: [
          "Video anxiety is a major barrier to existing co-working tools",
          "Engineers need deep work protection without social friction",
          "Would readily expense a focus tool on their team learning & wellness budget",
        ],
        uncoveredNeeds: [
          "Slack status auto-sync during focus blocks",
          "GitHub PR commit integration to show tangible progress",
        ],
        objectionAnalysis: "Reluctance to install heavy desktop agents or turn on webcam.",
        wouldBuyVerdict: "definitely",
        maxWillingnessToPay: "$15/month personal, or $30/month company expensed",
        goldenQuote: "If you remove the awkward camera pressure and let me just get into flow, I'd use this every single morning.",
      });
    }

    // Pitch generator mode
    if (combined.includes("World-Class Pitch Coach and Venture Partner") || combined.includes("pitch deck")) {
      return JSON.stringify({
        template: "yc",
        companyName: "FocusGauntlet",
        oneLinePitch: "Virtual AI focus rooms for the 100M remote knowledge workers struggling with daily distraction.",
        elevatorPitch: "FocusGauntlet provides instant, zero-friction virtual coworking rooms with AI accountability partners. We help remote engineers and knowledge workers double their deep work hours without the awkwardness of video calls.",
        whyNowNarrative: "Remote work is permanent, but distributed teams suffer from rampant asynchronous interruptions. Generative AI agents now make high-quality simulated accountability possible at zero marginal cost.",
        slides: [
          {
            slideNumber: 1,
            title: "The Problem",
            headline: "Remote workers lose 3.5 hours every day to context-switching and lack of structure.",
            bulletPoints: ["100M+ remote and hybrid knowledge workers globally", "Passive tools (timers, blockers) fail after 3 days", "Human body-doubling creates scheduling & webcam friction"],
            visualConcept: "Graph showing productivity collapse during fragmented remote workdays",
            speakerNotes: "The promise of remote work was autonomy, but the reality is continuous distraction. Current tools fail because they lack social presence.",
          },
          {
            slideNumber: 2,
            title: "The Solution",
            headline: "Instant virtual focus rooms with AI-assisted pacing and accountability.",
            bulletPoints: ["Join silent focus sprints in 1 click", "AI pacing agent checks in at start and finish", "Integrates seamlessly with Slack and GitHub"],
            visualConcept: "Clean mock-up of 50-minute sprint room UI",
            speakerNotes: "FocusGauntlet provides the psychological benefits of working in a quiet library with peers, on demand.",
          },
          {
            slideNumber: 3,
            title: "Market Size & Traction",
            headline: "$12B TAM across distributed tech, freelance, and creative teams.",
            bulletPoints: ["$1.8B initial SAM in tech and startup knowledge workers", "42% week-4 user retention in private beta", "$10/mo SaaS pricing validated by 500 waitlist signups"],
            visualConcept: "TAM/SAM/SOM concentric circles + cohort retention curve",
            speakerNotes: "We are capturing the tech sector wedge first, expanding to all knowledge workers.",
          },
        ],
      });
    }

    // Evolution coach mode
    if (combined.includes("Startup Pivot & Idea Evolution Strategist") || combined.includes("Idea Evolution")) {
      return JSON.stringify({
        originalIdea: "A focus room app for remote workers",
        primaryBottleneck: "Consumer focus apps have high early churn and low standalone willingness to pay.",
        oneBigChangeRecommendation: "Pivot from individual B2C subscriptions to an engineering team 'Deep Work Shield' sold to tech leads.",
        variants: [
          {
            variantName: "The B2B Deep Work Shield",
            angle: "B2B Team SaaS",
            oneSentencePitch: "Calendar-integrated deep work protection platform that synchronizes engineering focus sprints across distributed squads.",
            coreChange: "Sold as a team utility with Slack auto-mute and Jira task integration rather than a solo timer.",
            whyThisWorksBetter: "Unlocks B2B budgets ($25/dev/month), team network effects reduce churn, clear ROI on engineering output.",
            estimatedScoreDeltas: { monetization: 4, distribution: 2, pain: 2 },
            newTargetCustomer: "Engineering managers and CTOs at 20-200 person tech companies",
            risks: ["Requires OAuth calendar permissions", "Longer B2B sales cycle"],
          },
          {
            variantName: "The Open-Source Local-First Protocol",
            angle: "Developer Community Wedge",
            oneSentencePitch: "Local-first, privacy-respecting focus room CLI and desktop client with self-hosted team relay servers.",
            coreChange: "Developer-first distribution via CLI/Homebrew with cloud sync upsell.",
            whyThisWorksBetter: "Zero CAC organic developer word-of-mouth on HackerNews and GitHub.",
            estimatedScoreDeltas: { distribution: 3, buildability: 1, monetization: -1 },
            newTargetCustomer: "Software developers, privacy advocates, open-source contributors",
            risks: ["Monetization delay", "Community management overhead"],
          },
          {
            variantName: "The ADHD & Neurodivergent Flow Companion",
            angle: "High-Urgency Vertical Niche",
            oneSentencePitch: "Specialized body-doubling and task scaffolding workspace designed with neurodiversity coaches.",
            coreChange: "Laser-focused on users with acute executive dysfunction who have 5x higher willingness to pay.",
            whyThisWorksBetter: "Extreme urgency, passionate word-of-mouth community, insurance/HSA reimbursement potential.",
            estimatedScoreDeltas: { pain: 3, retention: 3, differentiation: 2 },
            newTargetCustomer: "Adults with ADHD and executive function challenges",
            risks: ["Higher customer support touch", "Clinical framing expectations"],
          },
        ],
        suggestedExperiment: "Run 2 contrasting landing pages: 'Team Focus Shield' ($25/seat) vs 'ADHD Flow Companion' ($19/mo) with a 50-person email capture goal.",
      });
    }

    // Compliance scanner mode
    if (combined.includes("Chief Regulatory & Compliance Officer") || combined.includes("compliance obligations")) {
      return JSON.stringify({
        overallRiskLevel: "medium",
        applicableFrameworks: ["GDPR (EU)", "CCPA/CPRA (California)", "EU AI Act (Transparency Obligations)"],
        requirements: [
          {
            regulation: "GDPR / CCPA",
            applicable: true,
            severity: "medium",
            requirements: [
              "Maintain explicit consent records for audio/session recording",
              "Implement self-serve data export and deletion (Right to be Forgotten)",
              "Publish transparent Privacy Policy detailing subprocessors",
            ],
            penaltiesForNonCompliance: "Fines up to €20M or 4% of annual global turnover",
            recommendedAction: "Use standard data processing agreements (DPAs) with cloud and AI providers.",
          },
          {
            regulation: "EU AI Act (Minimal/Transparency Risk)",
            applicable: true,
            severity: "low",
            requirements: [
              "Disclose to users that they are interacting with an AI agent",
              "Ensure AI persona does not make deceptive claims about human identity",
            ],
            penaltiesForNonCompliance: "Administrative fines for non-disclosure under Article 50",
            recommendedAction: "Display clear 'AI Accountability Partner' badge in all session rooms.",
          },
        ],
        dataPrivacyChecklist: [
          "End-to-end encryption for WebRTC audio/video streams",
          "Automated ephemeral data purge for room chat logs after 24 hours",
          "GDPR-compliant cookie banner and consent tracking",
          "Zero training data retention agreements with LLM providers",
        ],
        estimatedComplianceTimeline: "2-3 weeks for baseline privacy architecture and policy drafting",
        summary: "Product has low-to-medium compliance exposure. Key requirement is clear AI disclosure and standard GDPR user data deletion controls.",
      });
    }

    // Default fallback for other calls
    return "Generic analysis response for testing.";
  }
}
