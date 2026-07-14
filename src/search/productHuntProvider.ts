/**
 * Product Hunt provider — searches via the public Product Hunt API.
 * Zero-token, structured JSON results (no HTML parsing).
 *
 * API: https://www.producthunt.com/frontend/graphql
 * We use the public search endpoint that returns structured product data.
 */

import type { WebSearchProvider, SearchResult } from "./types.js";

const PH_SEARCH_URL = "https://www.producthunt.com/frontend/graphql";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export class ProductHuntProvider implements WebSearchProvider {
  kind = "custom" as const;

  async search(query: string, maxResults = 5): Promise<SearchResult[]> {
    // Product Hunt GraphQL search
    const gqlQuery = `
      query SEARCH_PRODUCTS($query: String!, $first: Int) {
        search(query: $query, type: PRODUCT, first: $first) {
          edges {
            node {
              ... on Product {
                name
                tagline
                slug
                website
                votesCount
                description
              }
            }
          }
        }
      }`;

    try {
      const response = await fetch(PH_SEARCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        body: JSON.stringify({
          query: gqlQuery,
          variables: { query, first: maxResults * 2 },
          operationName: "SEARCH_PRODUCTS",
        }),
      });

      if (!response.ok) return [];

      const data = (await response.json()) as any;
      const edges = data?.data?.search?.edges ?? [];

      return edges.slice(0, maxResults).map((edge: any) => {
        const product = edge.node;
        const url = product.website || `https://www.producthunt.com/products/${product.slug}`;
        return {
          title: `${product.name} — ${product.tagline}`,
          url,
          snippet: product.description?.slice(0, 200) || product.tagline || "",
        };
      });
    } catch {
      return [];
    }
  }
}
