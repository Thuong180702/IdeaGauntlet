import type { SearchResult, PageContent, CompetitorLandscape, NicheOpportunity, NicheType } from "./types.js";

/**
 * Niche opportunity detector — finds gaps in competitor coverage
 * where a new entrant can wedge in despite a saturated market.
 *
 * 8 gap types detected:
 * 1. Feature gaps (user complaints)
 * 2. Underserved segments (for X not covered)
 * 3. Pricing gaps (all expensive → freemium; all free → premium)
 * 4. Use case gaps ("alternative to X for Y")
 * 5. Geographic gaps ("not available in region")
 * 6. Integration/platform gaps (no API, no mobile, no Slack)
 * 7. Workflow/automation gaps (manual, tedious, clunky)
 * 8. Industry-vertical gaps (healthcare, legal, education not targeted)
 */

const COMPLAINT_TRIGGERS = [
  "i wish", "frustrating", "missing", "doesn't support", "can't do",
  "no option", "hard to", "too expensive", "overpriced", "lack of",
  "not enough", "would be great if", "if only", "no support for",
  "doesn't work with", "incompatible", "not available in",
  "no api", "no integration", "no mobile app", "no slack",
  "too many steps", "manual process", "tedious", "clunky",
  "no automation", "repetitive", "batch",
];

const NICHE_SEGMENTS = [
  "for startups", "for small business", "for freelancers", "for students",
  "for developers", "for designers", "for creators", "for non-profit",
  "for remote workers", "for solo founders", "for beginners",
  "for advanced users", "for power users", "for agencies",
  "for individuals", "for teams", "for enterprise",
];

const INTEGRATION_TRIGGERS = [
  "no api", "no integration", "no mobile app", "no slack",
  "no zapier", "no webhook", "no cli", "no sdk",
  "doesn't integrate", "no rest api", "no graphql",
  "no mobile", "desktop only", "browser only",
];

const WORKFLOW_TRIGGERS = [
  "too many steps", "manual process", "tedious", "clunky",
  "no automation", "repetitive", "batch", "time consuming",
  "copy paste", "spreadsheet", "workaround", "painstaking",
  "boring", "grunt work", "busywork",
];

const VERTICAL_HINTS = [
  "healthcare", "medical", "education", "legal", "finance",
  "real estate", "construction", "manufacturing", "logistics",
  "agriculture", "hospitality", "retail", "ecommerce", "fintech",
  "government", "nonprofit", "insurance", "pharmaceutical",
  "automotive", "energy", "telecom", "media", "gaming",
];

export function detectNiches(
  idea: string,
  competitorLandscape: CompetitorLandscape,
  searchResults: SearchResult[],
  pageContents?: PageContent[],
): NicheOpportunity[] {
  const niches: NicheOpportunity[] = [];
  const seen = new Set<string>();
  const landscape = competitorLandscape;

  const addUnique = (list: NicheOpportunity[]) => {
    for (const n of list) {
      const key = n.description.toLowerCase().slice(0, 80);
      if (!seen.has(key)) { seen.add(key); niches.push(n); }
    }
  };

  // All text combined for scanning
  const allSnippets = searchResults.map((r) => `${r.title} ${r.snippet ?? ""}`);
  const allPageText = pageContents?.map((p) => p.text.slice(0, 1000)) ?? [];
  const combinedText = [...allSnippets, ...allPageText].join(" ").toLowerCase();

  addUnique(findComplaintGaps(searchResults, pageContents));
  addUnique(findUnderservedSegments(landscape, searchResults, pageContents));
  addUnique(findPricingGaps(landscape));
  addUnique(findUseCaseGaps(searchResults, pageContents));
  addUnique(findGeographicGaps(searchResults, pageContents));
  addUnique(findIntegrationGaps(landscape, searchResults, pageContents));
  addUnique(findWorkflowGaps(landscape, searchResults, pageContents));
  addUnique(findIndustryVerticalGaps(landscape, searchResults, pageContents));

  return niches.slice(0, 12);
}

// ─── Feature gap detection ────────────────────────────────────

function findComplaintGaps(
  searchResults: SearchResult[],
  pageContents?: PageContent[],
): NicheOpportunity[] {
  const niches: NicheOpportunity[] = [];
  const complaints: string[] = [];

  for (const result of searchResults) {
    const snippetLower = (result.snippet ?? "").toLowerCase();
    for (const trigger of COMPLAINT_TRIGGERS) {
      const idx = snippetLower.indexOf(trigger);
      if (idx !== -1) {
        complaints.push(result.snippet.slice(Math.max(0, idx), idx + 120).trim());
      }
    }
  }

  if (pageContents) {
    for (const page of pageContents) {
      const textLower = page.text.toLowerCase();
      for (const trigger of COMPLAINT_TRIGGERS) {
        let idx = textLower.indexOf(trigger);
        while (idx !== -1 && complaints.length < 20) {
          complaints.push(page.text.slice(Math.max(0, idx), idx + 150).trim());
          idx = textLower.indexOf(trigger, idx + 1);
        }
      }
    }
  }

  const unique: string[] = [];
  for (const c of complaints) {
    if (!unique.some((u) => u.slice(0, 40) === c.slice(0, 40))) {
      unique.push(c);
    }
  }

  for (const complaint of unique.slice(0, 3)) {
    niches.push({
      type: "feature_gap",
      description: `Users complain: "${complaint.slice(0, 150)}". Building a solution that directly addresses this complaint could differentiate from existing competitors.`,
      evidence: complaint,
      wedgeIdea: `Focus your MVP on solving exactly this problem that existing tools don't handle well: ${complaint.slice(0, 100)}`,
      whyNow: "This is an active complaint from real users. If the pain is real, they will switch.",
    });
  }

  return niches;
}

// ─── Underserved segment detection ────────────────────────────

function findUnderservedSegments(
  landscape: CompetitorLandscape,
  searchResults: SearchResult[],
  pageContents?: PageContent[],
): NicheOpportunity[] {
  const niches: NicheOpportunity[] = [];
  const mentionedSegments = new Set<string>();

  const allText = [
    ...landscape.competitors.map((c) => `${c.name} ${c.notes ?? ""} ${(c.features ?? []).join(" ")}`),
    ...searchResults.map((r) => r.snippet ?? ""),
    ...(pageContents?.map((p) => p.text.slice(0, 500)) ?? []),
  ].join(" ").toLowerCase();

  for (const segment of NICHE_SEGMENTS) {
    if (allText.includes(segment)) {
      mentionedSegments.add(segment);
    }
  }

  for (const segment of NICHE_SEGMENTS) {
    if (!mentionedSegments.has(segment)) {
      niches.push({
        type: "underserved_segment",
        description: `No competitor appears to specifically target "${segment}". This segment may be underserved by existing solutions.`,
        evidence: `Searched for "${segment}" across ${landscape.competitors.length} competitors and ${searchResults.length} results -- no match found.`,
        wedgeIdea: `Build specifically for ${segment}. Tailor the onboarding, pricing, and features to their exact needs rather than making a generic tool.`,
        whyNow: "General tools fail niche segments because they optimize for the average user. A focused tool can win by making this segment feel seen.",
      });
    }
  }

  return niches.slice(0, 4);
}

// ─── Pricing gap detection ────────────────────────────────────

function findPricingGaps(
  landscape: CompetitorLandscape,
): NicheOpportunity[] {
  const niches: NicheOpportunity[] = [];
  const pricingTexts = landscape.competitors
    .map((c) => c.pricing ?? "")
    .filter(Boolean);

  if (pricingTexts.length === 0) return niches;

  const allPaid = pricingTexts.every((p) =>
    /\$|subscription|enterprise|premium|pro\b/i.test(p)
  );
  const allFree = pricingTexts.every((p) =>
    /free|open.?source|no cost/i.test(p)
  );

  if (allPaid && pricingTexts.length >= 2) {
    const prices = pricingTexts
      .map((p) => {
        const match = p.match(/\$(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : null;
      })
      .filter((p): p is number => p !== null);

    const minPrice = prices.length > 0 ? Math.min(...prices) : null;

    niches.push({
      type: "pricing_gap",
      description: `All found competitors charge for their solution${minPrice ? ` (starting at $${minPrice}/mo or more)` : ""}. There may be room for a freemium or lower-cost entry.`,
      evidence: `Pricing found: ${pricingTexts.slice(0, 3).join(" | ")}`,
      wedgeIdea: "Offer a generous free tier or free-forever plan that covers the core use case. Monetize through premium features, volume, or adjacent services.",
      whyNow: "Price-sensitive users are locked out by existing pricing. A free tier can capture them and upsell later.",
    });
  }

  if (allFree && pricingTexts.length >= 2) {
    niches.push({
      type: "pricing_gap",
      description: "All found competitors are free or open-source. A premium, vertical-specific product could win where free tools lack depth.",
      evidence: `Pricing found: ${pricingTexts.slice(0, 3).join(" | ")}`,
      wedgeIdea: "Build a premium, vertical-specific version with features free tools don't have -- enterprise support, compliance, integrations, or industry-specific workflows.",
      whyNow: "Free tools serve the general case. Professional users with specific needs will pay for depth.",
    });
  }

  return niches;
}

// ─── Use case gap detection ───────────────────────────────────

function findUseCaseGaps(
  searchResults: SearchResult[],
  pageContents?: PageContent[],
): NicheOpportunity[] {
  const niches: NicheOpportunity[] = [];
  const useCaseHints: string[] = [];

  const allText = [
    ...searchResults.map((r) => `${r.title} ${r.snippet}`),
    ...(pageContents?.map((p) => p.text.slice(0, 500)) ?? []),
  ].join(" ").toLowerCase();

  const altMatches = allText.match(/alternative\s+to\s+\w+\s+for\s+([\w\s]{3,40})/g);
  if (altMatches) {
    for (const match of altMatches.slice(0, 3)) {
      const useCase = match.replace(/alternative\s+to\s+\w+\s+for\s+/, "").trim();
      if (useCase.length > 5) {
        useCaseHints.push(useCase);
      }
    }
  }

  const wishMatches = allText.match(/(?:wish|want|need).{0,20}(?:for|to)\s+([\w\s]{3,40})/g);
  if (wishMatches) {
    for (const match of wishMatches.slice(0, 3)) {
      useCaseHints.push(match.trim());
    }
  }

  for (const hint of [...new Set(useCaseHints)].slice(0, 3)) {
    niches.push({
      type: "use_case_gap",
      description: `Users mention they want to use a solution for "${hint}". This use case may not be well-served by existing competitors.`,
      evidence: `Found in search results: "${hint}"`,
      wedgeIdea: `Build specifically for the use case: ${hint}. Customize the workflow, onboarding, and integrations for this exact scenario.`,
      whyNow: "When users adapt a general tool to a specific use case, they feel friction. A purpose-built tool eliminates that friction.",
    });
  }

  return niches;
}

// ─── Geographic gap detection ──────────────────────────────────

function findGeographicGaps(
  searchResults: SearchResult[],
  pageContents?: PageContent[],
): NicheOpportunity[] {
  const niches: NicheOpportunity[] = [];

  const allText = [
    ...searchResults.map((r) => `${r.title} ${r.snippet}`),
    ...(pageContents?.map((p) => p.text.slice(0, 500)) ?? []),
  ].join(" ").toLowerCase();

  const geoTriggers = ["not available in", "coming to", "only in", "us only", "europe only", "asia"];
  const geoHints: string[] = [];

  for (const trigger of geoTriggers) {
    const idx = allText.indexOf(trigger);
    if (idx !== -1) {
      geoHints.push(allText.slice(Math.max(0, idx), idx + 80).trim());
    }
  }

  for (const hint of [...new Set(geoHints)].slice(0, 2)) {
    niches.push({
      type: "geographic_gap",
      description: `Geographic limitation detected: "${hint}". Competitors may not serve certain regions.`,
      evidence: hint,
      wedgeIdea: "Focus on the underserved region first. Localize the product, integrate local payment methods, and build local support.",
      whyNow: "Users in underserved regions need the solution but can't access it. Being first in a region creates a moat.",
    });
  }

  return niches;
}

// ─── Integration/platform gap detection ─────────────────────────

function findIntegrationGaps(
  landscape: CompetitorLandscape,
  searchResults: SearchResult[],
  pageContents?: PageContent[],
): NicheOpportunity[] {
  const niches: NicheOpportunity[] = [];
  const integrationComplaints: string[] = [];

  const allText = [
    ...searchResults.map((r) => `${r.title} ${r.snippet ?? ""}`),
    ...(pageContents?.map((p) => p.text.slice(0, 1000)) ?? []),
  ].join(" ").toLowerCase();

  for (const trigger of INTEGRATION_TRIGGERS) {
    const idx = allText.indexOf(trigger);
    if (idx !== -1) {
      const context = allText.slice(Math.max(0, idx), idx + 100).trim();
      integrationComplaints.push(context);
    }
  }

  // Check if competitors mention API/mobile/integration features
  const competitorIntegrations = new Set<string>();
  for (const c of landscape.competitors) {
    for (const f of c.features ?? []) {
      const fLower = f.toLowerCase();
      if (fLower.includes("api") || fLower.includes("integration") || fLower.includes("mobile")) {
        competitorIntegrations.add(fLower);
      }
    }
  }

  // If no competitor mentions API/mobile, that is a gap
  if (competitorIntegrations.size === 0 && integrationComplaints.length === 0) {
    niches.push({
      type: "integration_gap",
      description: "No competitor appears to offer APIs, mobile apps, or third-party integrations. This is a significant platform gap.",
      evidence: `Checked ${landscape.competitors.length} competitors -- none mention API, mobile, or integration features.`,
      wedgeIdea: "Build with a first-class API and mobile app from day one. Offer Slack/Zapier/webhook integrations to embed into existing workflows.",
      whyNow: "Modern users expect API access and mobile support. SaaS tools without integrations get replaced by those that have them.",
    });
  }

  // If users complain about specific missing integrations
  for (const complaint of [...new Set(integrationComplaints)].slice(0, 2)) {
    niches.push({
      type: "integration_gap",
      description: `Users complain about missing integration: "${complaint.slice(0, 120)}". Building this integration could differentiate.`,
      evidence: complaint,
      wedgeIdea: "Prioritize the missing integration in your MVP. Even a simple webhook or Zapier connector can win users who need it.",
      whyNow: "Integration complaints mean users have the problem but can't solve it with existing tools. Fill the gap and they switch.",
    });
  }

  return niches.slice(0, 3);
}

// ─── Workflow/automation gap detection ─────────────────────────

function findWorkflowGaps(
  landscape: CompetitorLandscape,
  searchResults: SearchResult[],
  pageContents?: PageContent[],
): NicheOpportunity[] {
  const niches: NicheOpportunity[] = [];
  const workflowComplaints: string[] = [];

  const allText = [
    ...searchResults.map((r) => `${r.title} ${r.snippet ?? ""}`),
    ...(pageContents?.map((p) => p.text.slice(0, 1000)) ?? []),
  ].join(" ").toLowerCase();

  for (const trigger of WORKFLOW_TRIGGERS) {
    const idx = allText.indexOf(trigger);
    if (idx !== -1) {
      const context = allText.slice(Math.max(0, idx), idx + 120).trim();
      workflowComplaints.push(context);
    }
  }

  for (const complaint of [...new Set(workflowComplaints)].slice(0, 2)) {
    niches.push({
      type: "workflow_gap",
      description: `Users report workflow friction: "${complaint.slice(0, 130)}". Automating this workflow could differentiate.`,
      evidence: complaint,
      wedgeIdea: "Build automated workflows that eliminate the manual steps. Focus on the 3-step automation that saves the most time.",
      whyNow: "Manual work is the #1 reason users switch tools. If competitors require manual steps, automation is your wedge.",
    });
  }

  return niches.slice(0, 2);
}

// ─── Industry-vertical gap detection ───────────────────────────

function findIndustryVerticalGaps(
  landscape: CompetitorLandscape,
  searchResults: SearchResult[],
  pageContents?: PageContent[],
): NicheOpportunity[] {
  const niches: NicheOpportunity[] = [];

  const allText = [
    ...landscape.competitors.map((c) => `${c.name} ${c.notes ?? ""} ${(c.features ?? []).join(" ")}`),
    ...searchResults.map((r) => `${r.title} ${r.snippet ?? ""}`),
    ...(pageContents?.map((p) => p.text.slice(0, 500)) ?? []),
  ].join(" ").toLowerCase();

  // Find verticals NOT mentioned by competitors
  const uncoveredVerticals: string[] = [];
  for (const v of VERTICAL_HINTS) {
    if (!allText.includes(v)) {
      uncoveredVerticals.push(v);
    }
  }

  // Suggest top 3 uncovered verticals as niche opportunities
  for (const vertical of uncoveredVerticals.slice(0, 3)) {
    niches.push({
      type: "industry_vertical_gap",
      description: `No competitor appears to specifically target the "${vertical}" industry. This vertical may be underserved.`,
      evidence: `Searched for "${vertical}" across ${landscape.competitors.length} competitors and ${searchResults.length} results -- no match found.`,
      wedgeIdea: `Build a version specifically for ${vertical}. Include industry-specific compliance, terminology, templates, and integrations that general tools lack.`,
      whyNow: `General tools don't understand ${vertical}-specific workflows. A vertical-specific product can charge a premium and build deeper moats.`,
    });
  }

  return niches.slice(0, 3);
}
