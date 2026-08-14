import { describe, it, expect } from "vitest";
import { isNewerVersion, formatCliUpdateBanner, formatMcpUpdateNotice, detectLanguageFromText, withUpdateNotice } from "../../src/utils/updateChecker.js";

describe("updateChecker", () => {
  describe("isNewerVersion", () => {
    it("detects newer patch versions", () => {
      expect(isNewerVersion("0.4.1", "0.4.2")).toBe(true);
      expect(isNewerVersion("0.4.2", "0.4.1")).toBe(false);
    });

    it("detects newer minor versions", () => {
      expect(isNewerVersion("0.4.1", "0.5.0")).toBe(true);
      expect(isNewerVersion("0.5.0", "0.4.9")).toBe(false);
    });

    it("detects newer major versions", () => {
      expect(isNewerVersion("0.9.9", "1.0.0")).toBe(true);
      expect(isNewerVersion("1.0.0", "0.9.9")).toBe(false);
    });

    it("returns false on equal versions", () => {
      expect(isNewerVersion("0.5.0", "0.5.0")).toBe(false);
      expect(isNewerVersion("v0.5.0", "0.5.0")).toBe(false);
    });
  });

  describe("detectLanguageFromText", () => {
    it("detects Vietnamese diacritics", () => {
      expect(detectLanguageFromText("Ứng dụng quản lý thời gian")).toBe("vi");
      expect(detectLanguageFromText("Một sản phẩm SaaS cho người bán hàng")).toBe("vi");
    });

    it("defaults to English for English text", () => {
      expect(detectLanguageFromText("A focus room app for remote workers")).toBe("en");
      expect(detectLanguageFromText("SaaS inbox for e-commerce sellers")).toBe("en");
    });
  });

  describe("formatCliUpdateBanner", () => {
    it("formats English banner with copy-ready commands", () => {
      const banner = formatCliUpdateBanner({ current: "0.4.1", latest: "0.5.0" }, "en");
      expect(banner).toContain("Update available: 0.4.1 → 0.5.0");
      expect(banner).toContain("npm i -g idea-gauntlet@latest");
      expect(banner).toContain("npx idea-gauntlet@latest");
    });

    it("formats Vietnamese banner with copy-ready commands", () => {
      const banner = formatCliUpdateBanner({ current: "0.4.1", latest: "0.5.0" }, "vi");
      expect(banner).toContain("Đã có phiên bản mới: 0.4.1 → 0.5.0");
      expect(banner).toContain("npm i -g idea-gauntlet@latest");
      expect(banner).toContain("npx idea-gauntlet@latest");
    });
  });

  describe("formatMcpUpdateNotice", () => {
    it("formats English notice for AI chat", () => {
      const notice = formatMcpUpdateNotice({ current: "0.4.1", latest: "0.5.0" }, "en");
      expect(notice).toContain("IdeaGauntlet Update Available");
      expect(notice).toContain("`npm i -g idea-gauntlet@latest`");
      expect(notice).toContain("`npx -y idea-gauntlet@latest serve`");
    });

    it("formats Vietnamese notice for AI chat", () => {
      const notice = formatMcpUpdateNotice({ current: "0.4.1", latest: "0.5.0" }, "vi");
      expect(notice).toContain("Đã có bản cập nhật IdeaGauntlet mới");
      expect(notice).toContain("`npm i -g idea-gauntlet@latest`");
      expect(notice).toContain("`npx -y idea-gauntlet@latest serve`");
    });
  });
});
