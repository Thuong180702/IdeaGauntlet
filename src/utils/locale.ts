/**
 * Minimal i18n / locale framework.
 *
 * Supports `IDEAGAUNTLET_LANG` env var and `--lang` CLI flag.
 * Falls back to English if no translation found.
 *
 * Usage in CLI:
 *   idea-gauntlet quick "idea" --lang vi
 * Usage in env:
 *   export IDEAGAUNTLET_LANG=vi
 */

export type Locale = "en" | "vi";

const currentLocale: Locale = resolveLocale();

function resolveLocale(): Locale {
  const raw = process.env.IDEAGAUNTLET_LANG ?? "en";
  if (raw === "vi") return "vi";
  return "en";
}

export function getLocale(): Locale {
  return currentLocale;
}

export function isVietnamese(): boolean {
  return currentLocale === "vi";
}

/**
 * Translate a known UI string key.
 * For unknown keys, returns the key itself (graceful fallback).
 */
const translations: Record<Locale, Record<string, string>> = {
  en: {},
  vi: {
    "cli.no_provider": "Chưa cấu hình provider cho CLI. Cần API key, --ollama, hoặc chạy trong agent-native mode.",
    "cli.provider_error": "Lỗi provider",
    "cli.report_written": "Báo cáo đã ghi vào",
    "cli.report_already_exists": "đã tồn tại. Dùng --force để ghi đè.",
    "cli.path_traversal": "Phát hiện path traversal. Dùng đường dẫn tuyệt đối hoặc trong thư mục làm việc.",
    "cli.error": "Lỗi",
    "cli.onboarding_title": "IdeaGauntlet — Chọn cách chạy",
    "cli.onboarding_ollama": "Dùng Ollama local (miễn phí, cần cài Ollama)",
    "cli.onboarding_key": "Nhập API key (OpenAI / OpenRouter / Groq...)",
    "cli.onboarding_agent": "Cài agent-native cho Claude Code / Codex / Cursor",
    "cli.enter_api_key": "Nhập API key: ",
    "cli.install_complete": "✓ IdeaGauntlet đã cài xong.",
    "cli.integrations": "Tích hợp",
    "cli.installed": "đã cài",
    "cli.updated": "đã cập nhật",
    "cli.up_to_date": "đã sẵn sàng",
    "cli.unchanged": "không đổi (file hiện có khác)",
    "cli.tools_skipped": "Tool bỏ qua (không phát hiện)",
    "cli.ask_naturally": "Giờ bạn có thể hỏi Claude/Codex/Cursor:",
    "cli.use_idea_gauntlet": "Dùng IdeaGauntlet stress-test ý tưởng này",
    "cli.check_integrations": "Chạy `idea-gauntlet status` để kiểm tra tích hợp.",
    "cli.uninstall_first": "Chạy `idea-gauntlet uninstall` trước khi npm uninstall để gỡ file.",
    "cli.postinstall_error": "IdeaGauntlet postinstall:",
    "cli.retry_install": "Chạy `idea-gauntlet install` để thử lại cài đặt tích hợp.",
    "doctor.title": "IdeaGauntlet Doctor — Kiểm tra cấu hình",
    "doctor.node_version": "Node.js phiên bản",
    "doctor.api_key": "API key",
    "doctor.api_key_set": "✓ Đã cấu hình",
    "doctor.api_key_missing": "✗ Chưa cấu hình (cần cho CLI mode)",
    "doctor.base_url": "Base URL",
    "doctor.model": "Model",
    "doctor.locale": "Ngôn ngữ",
    "doctor.provider": "Provider",
    "doctor.no_provider": "Không phát hiện provider — dùng agent-native mode",
    "mcp.no_provider": "Chưa cấu hình LLM provider. Đặt IDEAGAUNTLET_API_KEY, cấu hình OpenAI-compatible provider, hoặc dùng --ollama.",
    "mcp.idea_required": "Cần ý tưởng (idea)",
    "mcp.ideas_required": "Cần mảng ý tưởng (ideas array)",
    "mcp.report_id_required": "Cần report id",
    "mcp.report_not_found": "Không tìm thấy báo cáo",
    "mcp.report_saved": "Báo cáo đã lưu vào",
    "mcp.unknown_tool": "Tool không xác định",
  },
};

export function t(key: string, ...args: string[]): string {
  const dict = translations[currentLocale] ?? translations.en;
  let value = dict[key] ?? translations.en[key] ?? key;
  // Simple positional substitution: {0}, {1}, ...
  for (let i = 0; i < args.length; i++) {
    value = value.replace(`{${i}}`, args[i]);
  }
  return value;
}
