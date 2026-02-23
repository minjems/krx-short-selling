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
