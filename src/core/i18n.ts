/**
 * F-10: Multi-language prompt support.
 * Translates system prompt headers to target language.
 * LLM still receives English structure but responds in target language.
 */

const SUPPORTED_LANGUAGES = [
  "en", "vi", "es", "fr", "de", "ja", "zh", "ko", "pt", "it", "ru", "ar",
] as const;

export type SupportedLang = typeof SUPPORTED_LANGUAGES[number];

interface LangLabels {
  reportHeader: string;
  scorecard: string;
  overall: string;
  confidence: string;
  verdict: string;
  risks: string;
  competitors: string;
  nicheOpportunities: string;
  brutalTakeaway: string;
  recommendations: string;
  summary: string;
  evidence: string;
  assumptions: string;
  promptLangInstruction: string;
}

const LABELS: Record<SupportedLang, LangLabels> = {
  en: {
    reportHeader: "IdeaGauntlet Report", scorecard: "Scorecard", overall: "Overall",
    confidence: "Confidence", verdict: "Verdict", risks: "Key Risks",
    competitors: "Competitor Landscape", nicheOpportunities: "Niche Opportunities",
    brutalTakeaway: "Brutal Takeaway", recommendations: "Recommendations",
    summary: "Summary", evidence: "Evidence", assumptions: "Assumptions",
    promptLangInstruction: "Respond entirely in English.",
  },
  vi: {
    reportHeader: "Báo Cáo IdeaGauntlet", scorecard: "Bảng Điểm", overall: "Tổng Quát",
    confidence: "Độ Tin Cậy", verdict: "Phán Quyết", risks: "Rủi Ro Chính",
    competitors: "Cảnh Quan Cạnh Tranh", nicheOpportunities: "Cơ Hội Ngách",
    brutalTakeaway: "Nhận Xét Thẳng Thắn", recommendations: "Khuyến Nghị",
    summary: "Tóm Tắt", evidence: "Bằng Chứng", assumptions: "Giả Định",
    promptLangInstruction: "Trả lời hoàn toàn bằng tiếng Việt.",
  },
  es: {
    reportHeader: "Informe IdeaGauntlet", scorecard: "Tarjeta de Puntuación", overall: "General",
    confidence: "Confianza", verdict: "Veredicto", risks: "Riesgos Clave",
    competitors: "Panorama Competitivo", nicheOpportunities: "Oportunidades de Nicho",
    brutalTakeaway: "Conclusión Directa", recommendations: "Recomendaciones",
    summary: "Resumen", evidence: "Evidencia", assumptions: "Suposiciones",
    promptLangInstruction: "Responde completamente en español.",
  },
  fr: {
    reportHeader: "Rapport IdeaGauntlet", scorecard: "Carte de Score", overall: "Global",
    confidence: "Confiance", verdict: "Verdict", risks: "Risques Clés",
    competitors: "Paysage Concurrentiel", nicheOpportunities: "Opportunités de Niche",
    brutalTakeaway: "Conclusion Directe", recommendations: "Recommandations",
    summary: "Résumé", evidence: "Preuves", assumptions: "Hypothèses",
    promptLangInstruction: "Réponds entièrement en français.",
  },
  de: {
    reportHeader: "IdeaGauntlet Bericht", scorecard: "Bewertungskarte", overall: "Gesamt",
    confidence: "Konfidenz", verdict: "Urteil", risks: "Hauptursachen",
    competitors: "Wettbewerbsumfeld", nicheOpportunities: "Nischenmöglichkeiten",
    brutalTakeaway: "Schonungslose Einschätzung", recommendations: "Empfehlungen",
    summary: "Zusammenfassung", evidence: "Beweise", assumptions: "Annahmen",
    promptLangInstruction: "Antworte vollständig auf Deutsch.",
  },
  ja: {
    reportHeader: "IdeaGauntletレポート", scorecard: "スコアカード", overall: "総合",
    confidence: "信頼度", verdict: "評決", risks: "主なリスク",
    competitors: "競合環境", nicheOpportunities: "ニッチ機会",
    brutalTakeaway: "厳しい結論", recommendations: "推奨事項",
    summary: "要約", evidence: "証拠", assumptions: "前提",
    promptLangInstruction: "完全に日本語で回答してください。",
  },
  zh: {
    reportHeader: "IdeaGauntlet报告", scorecard: "评分卡", overall: "总体",
    confidence: "置信度", verdict: "裁决", risks: "主要风险",
    competitors: "竞争格局", nicheOpportunities: "细分机会",
    brutalTakeaway: "残酷总结", recommendations: "建议",
    summary: "摘要", evidence: "证据", assumptions: "假设",
    promptLangInstruction: "请完全用中文回答。",
  },
  ko: {
    reportHeader: "IdeaGauntlet 보고서", scorecard: "점수표", overall: "종합",
    confidence: "신뢰도", verdict: "평결", risks: "주요 위험",
    competitors: "경쟁 환경", nicheOpportunities: "틈새 기회",
    brutalTakeaway: "직설적 평가", recommendations: "권장사항",
    summary: "요약", evidence: "증거", assumptions: "가정",
    promptLangInstruction: "완전히 한국어로 대답하세요.",
  },
  pt: {
    reportHeader: "Relatório IdeaGauntlet", scorecard: "Cartão de Pontuação", overall: "Geral",
    confidence: "Confiança", verdict: "Veredito", risks: "Riscos Principais",
    competitors: "Panorama Competitivo", nicheOpportunities: "Oportunidades de Nicho",
    brutalTakeaway: "Conclusão Direta", recommendations: "Recomendações",
    summary: "Resumo", evidence: "Evidências", assumptions: "Suposições",
    promptLangInstruction: "Responda completamente em português.",
  },
  it: {
    reportHeader: "Rapporto IdeaGauntlet", scorecard: "Scheda Punteggio", overall: "Generale",
    confidence: "Fiducia", verdict: "Verdetto", risks: "Rischi Chiave",
    competitors: "Panoramica Competitiva", nicheOpportunities: "Opportunità di Nicchia",
    brutalTakeaway: "Conclusione Diretta", recommendations: "Raccomandazioni",
    summary: "Riepilogo", evidence: "Prove", assumptions: "Supposizioni",
    promptLangInstruction: "Rispondi completamente in italiano.",
  },
  ru: {
    reportHeader: "Отчёт IdeaGauntlet", scorecard: "Оценочная карта", overall: "Общий",
    confidence: "Доверие", verdict: "Вердикт", risks: "Ключевые риски",
    competitors: "Конкурентная среда", nicheOpportunities: "Нишевые возможности",
    brutalTakeaway: "Прямой вывод", recommendations: "Рекомендации",
    summary: "Сводка", evidence: "Доказательства", assumptions: "Предположения",
    promptLangInstruction: "Отвечайте полностью на русском языке.",
  },
  ar: {
    reportHeader: "تقرير IdeaGauntlet", scorecard: "بطاقة النقاط", overall: "الإجمالي",
    confidence: "الثقة", verdict: "الحكم", risks: "المخاطر الرئيسية",
    competitors: "المشهد التنافسي", nicheOpportunities: "فرص متخصصة",
    brutalTakeaway: "خلاصة مباشرة", recommendations: "توصيات",
    summary: "ملخص", evidence: "أدلة", assumptions: "افتراضات",
    promptLangInstruction: "أجب بالكامل باللغة العربية.",
  },
};

export function getLangLabels(lang: string): LangLabels {
  const normalized = lang.toLowerCase().slice(0, 2);
  if (SUPPORTED_LANGUAGES.includes(normalized as SupportedLang)) {
    return LABELS[normalized as SupportedLang];
  }
  return LABELS.en;
}

export function isSupportedLang(lang: string): boolean {
  return SUPPORTED_LANGUAGES.includes(lang.toLowerCase().slice(0, 2) as SupportedLang);
}

export function listSupportedLanguages(): string[] {
  return [...SUPPORTED_LANGUAGES];
}

/**
 * Prepend language instruction to a system prompt.
 * This tells the LLM to respond in the target language.
 */
export function withLanguagePrompt(systemPrompt: string, lang?: string): string {
  if (!lang || lang === "en") return systemPrompt;
  const labels = getLangLabels(lang);
  return `${systemPrompt}\n\n${labels.promptLangInstruction}`;
}
