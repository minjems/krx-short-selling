export function formatNumber(n: number): string {
  return n.toLocaleString("ko-KR");
}

export function formatBillions(value: number): string {
  const billions = value / 100_000_000;
  if (Math.abs(billions) >= 10000) {
    return `${(billions / 10000).toFixed(1)}조`;
  }
  if (Math.abs(billions) >= 1) {
    return `${Math.round(billions).toLocaleString("ko-KR")}억`;
  }
  return `${Math.round(value / 10000).toLocaleString("ko-KR")}만`;
}

export function ratioColor(ratio: number): string {
  if (ratio >= 20) return "text-red-400 font-semibold";
  if (ratio >= 10) return "text-orange-400";
  if (ratio >= 5) return "text-yellow-400";
  return "text-zinc-300";
}

export function netValueColor(value: number): string {
  if (value > 0) return "text-red-400 font-semibold";
  if (value < 0) return "text-blue-400 font-semibold";
  return "text-zinc-400";
}

export const INVESTOR_LABELS: Record<string, string> = {
  "8000": "개인",
  "9000": "외국인",
  "7050": "기관",
};

// --- 밸류에이션 관련 ---

export function perColor(per: number | null): string {
  if (per === null || per <= 0) return "text-zinc-500";
  if (per < 8) return "text-green-400 font-semibold";
  if (per < 15) return "text-zinc-300";
  if (per < 30) return "text-orange-400";
  return "text-red-400 font-semibold";
}

export function pbrColor(pbr: number | null): string {
  if (pbr === null || pbr <= 0) return "text-zinc-500";
  if (pbr < 0.7) return "text-green-400 font-semibold";
  if (pbr < 1.0) return "text-green-300";
  if (pbr < 2.0) return "text-zinc-300";
  return "text-red-400";
}

export function dvdYldColor(yld: number | null): string {
  if (yld === null || yld <= 0) return "text-zinc-500";
  if (yld >= 5) return "text-green-400 font-semibold";
  if (yld >= 3) return "text-green-300";
  if (yld >= 1) return "text-zinc-300";
  return "text-zinc-500";
}

export function compositeColor(score: number | null): string {
  if (score === null) return "text-zinc-500";
  if (score >= 80) return "text-green-400 font-semibold";
  if (score >= 60) return "text-green-300";
  if (score >= 40) return "text-zinc-300";
  if (score >= 20) return "text-orange-400";
  return "text-red-400 font-semibold";
}

export function formatPer(per: number | null): string {
  if (per === null) return "-";
  if (per < 0) return `${per.toFixed(2)} (적자)`;
  return per.toFixed(2);
}

export function formatPbr(pbr: number | null): string {
  if (pbr === null) return "-";
  return pbr.toFixed(2);
}

// --- 적정가 관련 ---

export function upsideColor(pct: number): string {
  if (pct >= 30) return "text-green-400 font-semibold";
  if (pct > 0) return "text-green-400";
  if (pct > -30) return "text-red-400";
  return "text-red-400 font-semibold";
}

export function upsideBgColor(pct: number): string {
  if (pct >= 30) return "bg-green-900/40 text-green-300";
  if (pct > 0) return "bg-green-900/30 text-green-400";
  if (pct > -30) return "bg-red-900/30 text-red-400";
  return "bg-red-900/40 text-red-300";
}

export function formatUpside(pct: number, fairValue?: number, closePrice?: number): string {
  if (fairValue && closePrice && closePrice > 0) {
    const ratio = fairValue / closePrice;
    if (ratio >= 2) return `${ratio.toFixed(1)}배 저렴`;
    if (ratio <= 0.5) return `${(1 / ratio).toFixed(1)}배 비쌈`;
  }
  if (pct > 0) return `+${pct.toFixed(0)}% 저평가`;
  if (pct < 0) return `${pct.toFixed(0)}% 고평가`;
  return "적정 수준";
}

export function formatFairValue(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}

// --- 품질 등급 관련 ---

export type QualityGrade = "A" | "B" | "C" | "D" | "F";

export function qualityGrade(multiplier: number): QualityGrade {
  if (multiplier >= 1.2) return "A";
  if (multiplier >= 1.1) return "B";
  if (multiplier >= 1.0) return "C";
  if (multiplier >= 0.9) return "D";
  return "F";
}

export function qualityGradeColor(grade: QualityGrade): string {
  switch (grade) {
    case "A": return "bg-green-900/40 text-green-300 border-green-700/50";
    case "B": return "bg-green-900/20 text-green-400 border-green-800/50";
    case "C": return "bg-zinc-800 text-zinc-300 border-zinc-700";
    case "D": return "bg-orange-900/20 text-orange-400 border-orange-800/50";
    case "F": return "bg-red-900/20 text-red-400 border-red-800/50";
  }
}

export function qualityGradeBadgeColor(grade: QualityGrade): string {
  switch (grade) {
    case "A": return "bg-green-600 text-white";
    case "B": return "bg-green-700 text-green-100";
    case "C": return "bg-zinc-600 text-zinc-200";
    case "D": return "bg-orange-700 text-orange-100";
    case "F": return "bg-red-700 text-red-100";
  }
}

export function roeColor(roe: number | null): string {
  if (roe === null) return "text-zinc-500";
  if (roe >= 20) return "text-green-400 font-semibold";
  if (roe >= 10) return "text-green-300";
  if (roe >= 5) return "text-zinc-300";
  if (roe >= 0) return "text-orange-400";
  return "text-red-400";
}

export function operatingMarginColor(margin: number | null): string {
  if (margin === null) return "text-zinc-500";
  if (margin >= 20) return "text-green-400 font-semibold";
  if (margin >= 10) return "text-green-300";
  if (margin >= 5) return "text-zinc-300";
  if (margin >= 0) return "text-orange-400";
  return "text-red-400";
}

export function debtRatioColor(ratio: number | null): string {
  if (ratio === null) return "text-zinc-500";
  if (ratio < 50) return "text-green-400 font-semibold";
  if (ratio < 100) return "text-green-300";
  if (ratio < 150) return "text-zinc-300";
  if (ratio < 200) return "text-orange-400";
  return "text-red-400";
}

export function revenueGrowthColor(growth: number | null): string {
  if (growth === null) return "text-zinc-500";
  if (growth >= 30) return "text-green-400 font-semibold";
  if (growth >= 10) return "text-green-300";
  if (growth >= 0) return "text-zinc-300";
  if (growth >= -10) return "text-orange-400";
  return "text-red-400";
}
