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
