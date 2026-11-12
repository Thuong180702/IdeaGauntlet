/**
 * F-09: REST API server — exposes IdeaGauntlet as HTTP endpoints.
 * Start with: `idea-gauntlet serve --port 3000`
 * 
 * Endpoints:
 *   POST /api/quick   — body: { idea, targetUsers?, market?, stage? }
 *   POST /api/court    — body: { idea, ... }
 *   POST /api/users    — body: { idea, personas?, ... }
 *   POST /api/mvp      — body: { idea, ... }
 *   POST /api/compare   — body: { ideas: string[], ... }
 *   GET  /api/history   — list saved reports
 *   GET  /api/history/:id — get report by ID
 *   GET  /api/templates — list idea templates
 *   GET  /health        — health check
 */

import { createServer, type IncomingMessage } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { resolveProvider } from "../../providers/providerUtils.js";
import { runGauntlet } from "../../core/runGauntlet.js";
import { listReports, loadReport, saveReport } from "../../history/historyStore.js";
import { listTemplateIds } from "../../core/templates.js";

interface ServeOptions {
  port?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  /** SEC-1: Bearer token required for engine endpoints. Set via --api-token. */
  apiToken?: string;
  /** SEC-1: Explicit CORS origin (default: same-origin). Use "*" for dev only. */
  corsOrigin?: string;
  /** SEC-1: Bind host. Default 127.0.0.1 (localhost only). Use 0.0.0.0 for LAN. */
  host?: string;
}

export async function serveCommand(options: ServeOptions): Promise<void> {
  const port = parseInt(options.port ?? "3000", 10);

  const server = createServer(async (req, res) => {
    // SEC-1: CORS — restricted to explicit origin or same-origin.
    const origin = options.corsOrigin ?? "";
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // SEC-1: Auth check — Bearer token required for engine endpoints when apiToken set.
    const requireAuth = !!options.apiToken;
    const isPublicEndpoint = req.url === "/health" || req.url === "/api/templates";
    if (requireAuth && !isPublicEndpoint) {
      const auth = req.headers["authorization"] ?? "";
      if (!safeTokenMatch(String(auth), `Bearer ${options.apiToken}`)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized — provide Authorization: Bearer <token>" }));
        return;
      }
    }

    try {
      // Health check
      if (req.url === "/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        return;
      }

      // Templates
      if (req.url === "/api/templates" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(listTemplateIds()));
        return;
      }

      // History list
      if (req.url === "/api/history" && req.method === "GET") {
        const reports = listReports();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(reports));
        return;
      }

      // History by ID
      const histMatch = req.url?.match(/^\/api\/history\/([a-zA-Z0-9_-]+)$/);
      if (histMatch && req.method === "GET") {
        const report = loadReport(histMatch[1]);
        if (!report) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Report not found" }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(report));
        return;
      }

      // Engine endpoints
      const engineMatch = req.url?.match(/^\/api\/(quick|court|users|mvp|compare)$/);
      if (engineMatch && req.method === "POST") {
        const mode = engineMatch[1];
        const body = await readBody(req);

        const providerRes = resolveProvider({
          apiKey: options.apiKey,
          baseUrl: options.baseUrl,
          model: options.model,
        });

        if (!providerRes) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "No LLM provider configured. Set API key." }));
          return;
        }

        const idea = body.idea ?? "";
        if (!idea) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing 'idea' in request body" }));
          return;
        }

        const report = await runGauntlet({
          idea,
          targetUsers: body.targetUsers,
          market: body.market,
          stage: body.stage,
          founder: body.founder,
          mode: mode as any,
          provider: providerRes.provider,
          enableSearch: body.enableSearch !== false,
          compareIdeas: mode === "compare" ? body.ideas : undefined,
        });

        // Auto-save to history
        saveReport(report);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(report));
        return;
      }

      // 404
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found", path: req.url }));
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
  });

  const host = options.host ?? "127.0.0.1";
  if (!options.apiToken) {
    console.warn("⚠ SEC-1: No --api-token set. Engine endpoints are unauthenticated.");
  }
  server.listen(port, host, () => {
    console.log(`IdeaGauntlet API server running on http://${host}:${port}`);
    console.log(`Endpoints: /api/quick, /api/court, /api/users, /api/mvp, /api/compare, /api/history, /api/templates, /health`);
  });
}

/**
 * SEC-1: Constant-time bearer-token comparison.
 * A plain `!==` returns on the first differing byte, which leaks the token
 * prefix to an attacker who can time many requests.
 */
function safeTokenMatch(received: string, expected: string): boolean {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch, so length is checked first.
  // Length is not the secret here (the header shape is public), and the
  // decoy comparison keeps the reject path from returning noticeably early.
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

const MAX_BODY_BYTES = 10_000_000;

function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let settled = false;

    req.on("data", (chunk: Buffer) => {
      if (settled) return;
      // F-09: cap on *bytes*, not UTF-16 code units — a multi-byte body could
      // otherwise buffer well past the intended 10MB ceiling.
      totalBytes += chunk.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        settled = true;
        reject(new Error("Request body too large (max 10MB)"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (settled) return;
      settled = true;
      const data = Buffer.concat(chunks).toString("utf-8");
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    });
  });
}
