import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { homedir, tmpdir } from "node:os";
import { getLocale, type Locale } from "./locale.js";

export interface UpdateCheckResult {
  hasUpdate: boolean;
  current: string;
  latest: string;
}

interface CacheData {
  latestVersion: string;
  lastChecked: number;
}

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const DEFAULT_TIMEOUT_MS = 1500;

function getCacheFilePath(): string {
  try {
    const dir = join(homedir() || tmpdir(), ".idea-gauntlet");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return join(dir, "update-cache.json");
  } catch {
    return join(tmpdir(), ".idea-gauntlet-update-cache.json");
  }
}

/**
 * Compare two semver strings (e.g. "0.4.1" and "0.5.0").
 * Returns true if latest > current.
 */
export function isNewerVersion(current: string, latest: string): boolean {
  if (!current || !latest) return false;
  const clean = (v: string) => v.replace(/^v/, "").trim();
  const cParts = clean(current).split(".").map((n) => parseInt(n, 10) || 0);
  const lParts = clean(latest).split(".").map((n) => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(cParts.length, lParts.length, 3); i++) {
    const c = cParts[i] ?? 0;
    const l = lParts[i] ?? 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

/**
 * Read current package version from local package.json.
 */
export function getCurrentVersion(): string {
  try {
    // Attempt reading from nearest package.json
    const pkgPath = resolve(new URL(".", import.meta.url).pathname.replace(/^\/([A-Z]:)/i, "$1"), "../../package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      if (pkg.version) return pkg.version;
    }
  } catch {
    // Fallback if bundled
  }
  return "0.5.0";
}

/**
 * Fetch latest version from npm registry with timeout and caching.
 */
export async function fetchLatestVersion(timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string | null> {
  const cacheFile = getCacheFilePath();

  // 1. Check local cache
  try {
    if (existsSync(cacheFile)) {
      const raw = readFileSync(cacheFile, "utf-8");
      const cache: CacheData = JSON.parse(raw);
      if (cache.latestVersion && Date.now() - cache.lastChecked < CHECK_INTERVAL_MS) {
        return cache.latestVersion;
      }
    }
  } catch {
    // Ignore cache read error
  }

  // 2. Fetch from registry
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch("https://registry.npmjs.org/idea-gauntlet/latest", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = (await res.json()) as { version?: string };
      if (data.version) {
        try {
          const cacheContent: CacheData = {
            latestVersion: data.version,
            lastChecked: Date.now(),
          };
          writeFileSync(cacheFile, JSON.stringify(cacheContent), "utf-8");
        } catch {
          // Ignore cache write error
        }
        return data.version;
      }
    }
  } catch {
    // Timeout or network error — fail silently
  }

  return null;
}

/**
 * Check if a newer version of IdeaGauntlet is available.
 */
export async function checkForUpdate(currentVer?: string): Promise<UpdateCheckResult> {
  const current = currentVer ?? getCurrentVersion();
  const latest = await fetchLatestVersion();
  if (!latest) {
    return { hasUpdate: false, current, latest: current };
  }
  const hasUpdate = isNewerVersion(current, latest);
  return { hasUpdate, current, latest };
}

/**
 * Detect language from user input text (auto-detect Vietnamese diacritics or environment locale).
 */
export function detectLanguageFromText(text?: string): Locale {
  if (getLocale() === "vi") return "vi";
  if (!text) return "en";
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/i.test(text)) {
    return "vi";
  }
  return "en";
}

/**
 * Format CLI notification banner in the user's language.
 */
export function formatCliUpdateBanner(info: { current: string; latest: string }, lang?: Locale): string {
  const locale = lang ?? getLocale();
  const isVi = locale === "vi";

  const title = isVi
    ? `Đã có phiên bản mới: ${info.current} → ${info.latest}`
    : `Update available: ${info.current} → ${info.latest}`;

  const cmdText = isVi
    ? `Chạy lệnh để cập nhật: npm i -g idea-gauntlet@latest`
    : `Run: npm i -g idea-gauntlet@latest`;

  const npxText = isVi
    ? `Hoặc dùng trực tiếp:   npx idea-gauntlet@latest`
    : `Or run with npx:      npx idea-gauntlet@latest`;

  const width = Math.max(title.length, cmdText.length, npxText.length) + 4;
  const border = "─".repeat(width);

  const pad = (s: string) => s + " ".repeat(Math.max(0, width - s.length - 2));

  return `
\x1b[36m╭${border}╮\x1b[0m
\x1b[36m│\x1b[0m  \x1b[1m\x1b[33m${pad(title)}\x1b[0m\x1b[36m│\x1b[0m
\x1b[36m│\x1b[0m  \x1b[32m${pad(cmdText)}\x1b[0m\x1b[36m│\x1b[0m
\x1b[36m│\x1b[0m  \x1b[90m${pad(npxText)}\x1b[0m\x1b[36m│\x1b[0m
\x1b[36m╰${border}╯\x1b[0m`;
}

/**
 * Format Markdown update notice for AI Chat / MCP contexts (Claude / Cursor / Codex).
 */
export function formatMcpUpdateNotice(info: { current: string; latest: string }, lang?: Locale): string {
  const locale = lang ?? getLocale();
  const isVi = locale === "vi";

  if (isVi) {
    return [
      "",
      "---",
      `> 💡 **Đã có bản cập nhật IdeaGauntlet mới:** \`v${info.latest}\` *(bản hiện tại: \`v${info.current}\`)*`,
      `> - **Lệnh cập nhật:** \`npm i -g idea-gauntlet@latest\``,
      `> - **Cấu hình MCP tự động mới nhất:** \`npx -y idea-gauntlet@latest serve\``,
    ].join("\n");
  }

  return [
    "",
    "---",
    `> 💡 **IdeaGauntlet Update Available:** \`v${info.latest}\` *(current: \`v${info.current}\`)*`,
    `> - **Upgrade Command:** \`npm i -g idea-gauntlet@latest\``,
    `> - **Auto-updating MCP Configuration:** \`npx -y idea-gauntlet@latest serve\``,
  ].join("\n");
}

/**
 * Helper to append update notice to text response if an update is available.
 */
export async function withUpdateNotice(text: string, contextText?: string): Promise<string> {
  try {
    const update = await checkForUpdate();
    if (update.hasUpdate) {
      const lang = detectLanguageFromText(contextText ?? text);
      return text + formatMcpUpdateNotice(update, lang);
    }
  } catch {
    // Ignore update check failure
  }
  return text;
}
