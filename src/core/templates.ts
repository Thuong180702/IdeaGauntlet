/**
 * F-12: Idea Template Library — pre-built templates for common startup categories.
 * Usage: `idea-gauntlet quick --template b2b-saas "My idea here"`
 * The template fills in market, target users, and stage defaults.
 */

export interface IdeaTemplate {
  id: string;
  label: string;
  market: string;
  targetUsers: string[];
  stage: string;
  description: string;
}

const TEMPLATES: IdeaTemplate[] = [
  {
    id: "b2b-saas",
    label: "B2B SaaS",
    market: "B2B software",
    targetUsers: ["small business owners", "operations managers"],
    stage: "napkin",
    description: "Subscription software for business workflows",
  },
  {
    id: "devtool",
    label: "Developer Tool",
    market: "developer tools",
    targetUsers: ["software engineers", "DevOps teams"],
    stage: "napkin",
    description: "CLI, IDE plugin, or platform for developer productivity",
  },
  {
    id: "marketplace",
    label: "Marketplace",
    market: "consumer marketplace",
    targetUsers: ["buyers", "sellers"],
    stage: "pre-mvp",
    description: "Two-sided marketplace connecting supply and demand",
  },
  {
    id: "consumer-app",
    label: "Consumer App",
    market: "consumer mobile/web",
    targetUsers: ["general consumers"],
    stage: "napkin",
    description: "Mobile or web app for consumers",
  },
  {
    id: "ai-ml",
    label: "AI/ML Product",
    market: "AI/ML tools",
    targetUsers: ["data scientists", "knowledge workers"],
    stage: "napkin",
    description: "AI-powered tool or ML model product",
  },
  {
    id: "healthtech",
    label: "HealthTech",
    market: "healthcare technology",
    targetUsers: ["patients", "healthcare providers"],
    stage: "pre-mvp",
    description: "Healthcare/medical technology product",
  },
  {
    id: "fintech",
    label: "FinTech",
    market: "financial technology",
    targetUsers: ["consumers", "small businesses"],
    stage: "pre-mvp",
    description: "Payments, lending, or financial services product",
  },
  {
    id: "ecommerce",
    label: "E-commerce",
    market: "online retail",
    targetUsers: ["online shoppers", "DTC brands"],
    stage: "pre-mvp",
    description: "Online store, shopping platform, or commerce tool",
  },
];

export function getTemplate(id: string): IdeaTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function listTemplateIds(): { id: string; label: string }[] {
  return TEMPLATES.map((t) => ({ id: t.id, label: t.label }));
}

export function applyTemplate(ideaText: string, templateId: string): {
  idea: string;
  market?: string;
  targetUsers?: string[];
  stage?: string;
} | undefined {
  const template = getTemplate(templateId);
  if (!template) return undefined;
  return {
    idea: ideaText,
    market: template.market,
    targetUsers: template.targetUsers,
    stage: template.stage,
  };
}
