/**
 * F-13: Team collaboration — multiple users submit, vote, and comment on ideas.
 * Stored in .idea-gauntlet/team.json.
 * ponytail: No server needed for basic flow. Add WebSocket sync when team grows.
 * → skipped: real-time sync, add when multi-user concurrent editing needed.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

export interface TeamVote {
  userId: string;
  score: number; // 1-10
  comment?: string;
  timestamp: string;
}

export interface TeamReview {
  ideaText: string;
  votes: TeamVote[];
  comments: { userId: string; text: string; timestamp: string }[];
  consensusScore?: number;
  status: "open" | "reviewed" | "archived";
}

interface TeamStore {
  reviews: Record<string, TeamReview>; // keyed by idea hash
}

const STORE_PATH = ".idea-gauntlet/team.json";

function getStorePath(): string {
  return resolve(process.cwd(), STORE_PATH);
}

function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16);
}

function loadStore(): TeamStore {
  const path = getStorePath();
  if (!existsSync(path)) return { reviews: {} };
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as TeamStore;
  } catch {
    return { reviews: {} };
  }
}

function saveStore(store: TeamStore): void {
  const dir = resolve(process.cwd(), ".idea-gauntlet");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(getStorePath(), JSON.stringify(store, null, 2), "utf-8");
}

export function submitIdea(ideaText: string, userId: string): TeamReview {
  const store = loadStore();
  const hash = simpleHash(ideaText);
  if (!store.reviews[hash]) {
    store.reviews[hash] = {
      ideaText,
      votes: [],
      comments: [],
      status: "open",
    };
  }
  store.reviews[hash].ideaText = ideaText;
  saveStore(store);
  return store.reviews[hash];
}

export function voteOnIdea(ideaText: string, userId: string, score: number, comment?: string): TeamVote {
  if (score < 1 || score > 10) throw new Error("Score must be 1-10");
  const store = loadStore();
  const hash = simpleHash(ideaText);
  if (!store.reviews[hash]) {
    submitIdea(ideaText, userId);
  }
  const review = store.reviews[hash];

  // Replace existing vote from same user
  review.votes = review.votes.filter((v) => v.userId !== userId);
  const vote: TeamVote = {
    userId,
    score,
    comment,
    timestamp: new Date().toISOString(),
  };
  review.votes.push(vote);

  // Update consensus
  review.consensusScore = Math.round(
    review.votes.reduce((a, v) => a + v.score, 0) / review.votes.length,
  );

  saveStore(store);
  return vote;
}

export function commentOnIdea(ideaText: string, userId: string, text: string): void {
  const store = loadStore();
  const hash = simpleHash(ideaText);
  if (!store.reviews[hash]) {
    submitIdea(ideaText, userId);
  }
  store.reviews[hash].comments.push({
    userId,
    text,
    timestamp: new Date().toISOString(),
  });
  saveStore(store);
}

export function listIdeas(): TeamReview[] {
  const store = loadStore();
  return Object.values(store.reviews);
}

export function getReview(ideaText: string): TeamReview | null {
  const store = loadStore();
  const hash = simpleHash(ideaText);
  return store.reviews[hash] ?? null;
}

export function updateStatus(ideaText: string, status: TeamReview["status"]): void {
  const store = loadStore();
  const hash = simpleHash(ideaText);
  if (store.reviews[hash]) {
    store.reviews[hash].status = status;
    saveStore(store);
  }
}

export function formatTeamReview(review: TeamReview): string {
  const lines: string[] = [];
  lines.push("# Team Review\n");
  lines.push(`**Idea:** ${review.ideaText.slice(0, 80)}...`);
  lines.push(`**Status:** ${review.status}\n`);

  if (review.votes.length > 0) {
    lines.push("## Votes\n");
    lines.push("| User | Score | Comment | Timestamp |");
    lines.push("|---|---|---|---|");
    for (const v of review.votes) {
      lines.push(`| ${v.userId} | ${v.score}/10 | ${v.comment ?? ""} | ${v.timestamp} |`);
    }
    lines.push(`\n**Consensus:** ${review.consensusScore}/10 (${review.votes.length} votes)\n`);
  }

  if (review.comments.length > 0) {
    lines.push("## Comments\n");
    for (const c of review.comments) {
      lines.push(`> **${c.userId}** (${c.timestamp}): ${c.text}`);
    }
  }

  return lines.join("\n");
}
