/**
 * SVG Radar Chart generator — renders 7 scoring dimensions as a radar chart.
 * No external dependencies — pure SVG string generation.
 *
 * Usage:
 *   const svg = generateRadarChart({ clarity: 6, pain: 5, ... });
 *   // → SVG string embeddable in HTML or Markdown (base64)
 */

export interface RadarChartInput {
  clarity: number;
  pain: number;
  differentiation: number;
  buildability: number;
  distribution: number;
  monetization: number;
  evidence: number;
}

const DIMENSIONS: { key: keyof RadarChartInput; label: string }[] = [
  { key: "clarity", label: "Clarity" },
  { key: "pain", label: "Pain" },
  { key: "differentiation", label: "Differentiation" },
  { key: "buildability", label: "Buildability" },
  { key: "distribution", label: "Distribution" },
  { key: "monetization", label: "Monetization" },
  { key: "evidence", label: "Evidence" },
];

const SIZE = 400;
const CENTER = SIZE / 2;
const RADIUS = 140;
const MAX_VALUE = 10;
const RING_COUNT = 5;

export function generateRadarChart(scores: RadarChartInput, title = "Idea Score Card"): string {
  const n = DIMENSIONS.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  // Compute polygon points for score polygon
  const scorePoints = DIMENSIONS.map((dim, i) => {
    const value = scores[dim.key] ?? 0;
    const radius = (value / MAX_VALUE) * RADIUS;
    const angle = startAngle + i * angleStep;
    const x = CENTER + radius * Math.cos(angle);
    const y = CENTER + radius * Math.sin(angle);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  // Ring polygons (grid)
  const rings = Array.from({ length: RING_COUNT }, (_, ringIdx) => {
    const ringRadius = (RADIUS * (ringIdx + 1)) / RING_COUNT;
    const points = DIMENSIONS.map((_, i) => {
      const angle = startAngle + i * angleStep;
      const x = CENTER + ringRadius * Math.cos(angle);
      const y = CENTER + ringRadius * Math.sin(angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return `<polygon points="${points}" fill="none" stroke="#e2e8f0" stroke-width="1" />`;
  }).join("\n    ");

  // Axis lines + labels
  const axes = DIMENSIONS.map((dim, i) => {
    const angle = startAngle + i * angleStep;
    const endX = CENTER + RADIUS * Math.cos(angle);
    const endY = CENTER + RADIUS * Math.sin(angle);
    const labelR = RADIUS + 25;
    const labelX = CENTER + labelR * Math.cos(angle);
    const labelY = CENTER + labelR * Math.sin(angle);

    const value = scores[dim.key] ?? 0;
    const scoreColor = value >= 7 ? "#10b981" : value >= 4 ? "#f59e0b" : "#ef4444";

    return [
      `<line x1="${CENTER}" y1="${CENTER}" x2="${endX.toFixed(1)}" y2="${endY.toFixed(1)}" stroke="#cbd5e1" stroke-width="1" />`,
      `<text x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="Inter, sans-serif" font-size="12" font-weight="600" fill="#334155">${dim.label}</text>`,
      `<text x="${labelX.toFixed(1)}" y="${(labelY + 14).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="${scoreColor}">${value}/${MAX_VALUE}</text>`,
    ].join("\n    ");
  }).join("\n    ");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="#ffffff" rx="16" />

  <text x="${CENTER}" y="30" text-anchor="middle" font-family="Inter, sans-serif" font-size="16" font-weight="700" fill="#1e293b">${title}</text>

  <g>
    ${rings}
  </g>

  <g>
    ${axes}
  </g>

  <polygon points="${scorePoints}" fill="rgba(99, 102, 241, 0.15)" stroke="#6366f1" stroke-width="2" />

  ${DIMENSIONS.map((dim, i) => {
    const value = scores[dim.key] ?? 0;
    const radius = (value / MAX_VALUE) * RADIUS;
    const angle = startAngle + i * angleStep;
    const x = CENTER + radius * Math.cos(angle);
    const y = CENTER + radius * Math.sin(angle);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#6366f1" stroke="#fff" stroke-width="1.5" />`;
  }).join("\n    ")}
</svg>`;

  return svg;
}

/**
 * Convert SVG to base64 data URI for embedding in Markdown or HTML.
 */
export function svgToDataUri(svg: string): string {
  const encoded = encodeURIComponent(svg);
  return `data:image/svg+xml,${encoded}`;
}
