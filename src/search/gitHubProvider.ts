/**
 * GitHub provider — searches repositories via the public GitHub API.
 * Zero-token, structured JSON results.
 *
 * For software/tech ideas, GitHub repos reveal open-source competitors,
 * their popularity, and active development signals.
 */

import type { WebSearchProvider, SearchResult } from "./types.js";
import { warnIfError } from "../utils/warn.js";

const GH_API_URL = "https://api.github.com/search/repositories";

export class GitHubProvider implements WebSearchProvider {
  kind = "custom" as const;

  async search(query: string, maxResults = 5): Promise<SearchResult[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        sort: "stars",
        order: "desc",
        per_page: String(Math.min(maxResults, 10)),
      });

      const response = await fetch(`${GH_API_URL}?${params}`, {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "IdeaGauntlet/1.0",
        },
      });

      if (!response.ok) return [];

      const data = (await response.json()) as any;
      const items = data?.items ?? [];

      return items.slice(0, maxResults).map((repo: any) => ({
        title: `${repo.full_name} ★${repo.stargazers_count} — ${repo.description?.slice(0, 120) ?? ""}`,
        url: repo.html_url,
        snippet: `${repo.description ?? ""} | Stars: ${repo.stargazers_count} | Forks: ${repo.forks_count} | Lang: ${repo.language ?? "N/A"} | Updated: ${repo.updated_at?.slice(0, 10) ?? "N/A"}`,
      }));
    } catch (err: any) {
      warnIfError(`gitHub: search "${query}" failed`, err);
      return [];
    }
  }
}
