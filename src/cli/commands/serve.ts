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

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { resolveProvider } from "../../providers/providerUtils.js";
import { runGauntlet } from "../../core/runGauntlet.js";
import { listReports, loadReport, saveReport } from "../../history/historyStore.js";
import { listTemplateIds } from "../../core/templates.js";

interface ServeOptions {
  port?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export async function serveCommand(options: ServeOptions): Promise<void> {
  const port = parseInt(options.port ?? "3000", 10);

  const server = createServer(async (req, res) => {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
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

  server.listen(port, () => {
    console.log(`IdeaGauntlet API server running on http://localhost:${port}`);
    console.log(`Endpoints: /api/quick, /api/court, /api/users, /api/mvp, /api/compare, /api/history, /api/templates, /health`);
  });
}

function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      // F-09: Prevent body too large (10MB).
      if (data.length > 10_000_000) {
        reject(new Error("Request body too large (max 10MB)"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}
