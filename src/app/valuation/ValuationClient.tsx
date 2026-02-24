"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  formatNumber,
  upsideBgColor,
  formatFairValue,
  qualityGrade,
  qualityGradeBadgeColor,
  roeColor,
  operatingMarginColor,
} from "@/lib/format";
import { calcSectorAverages, calcFairValue } from "@/lib/fairValue";
import type { FairValueResult, SectorAvg, FinancialData } from "@/lib/fairValue";
import type { ValuationItem } from "./page";

type RankingTab = "undervalued" | "overvalued";
type Market = "ALL" | "KOSPI" | "KOSDAQ";
type SortKey = "upside" | "grade" | "price" | "fairValue" | "roe" | "operatingMargin";
type SortDir = "asc" | "desc";

const GRADE_ORDER: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, F: 5 };

function toFinancialData(item: ValuationItem): FinancialData | null {
  if (item.roe === null && item.debtRatio === null && item.operatingMargin === null &&
      item.revenueGrowth === null && item.cashFromOps === null) {
    return null;
  }
  return {
    roe: item.roe,
    debtRatio: item.debtRatio,
    operatingMargin: item.operatingMargin,
    revenueGrowth: item.revenueGrowth,
    cashFromOps: item.cashFromOps,
  };
}

type EnrichedItem = ValuationItem & {
  fv: FairValueResult | null;
  sectorAvg: SectorAvg | null;
};

function MiniBar({ pct }: { pct: number }) {
  const absPct = Math.min(Math.abs(pct), 500);
  const width = Math.max(4, (absPct / 500) * 100);
  const color = pct >= 0 ? "bg-green-500" : "bg-red-500";
  return (
    <div className="w-16 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export function ValuationClient({
  data,
  tradeDate,
}: {
  data: ValuationItem[];
  tradeDate: string;
}) {
  const [tab, setTab] = useState<RankingTab>("undervalued");
  const [market, setMarket] = useState<Market>("ALL");
  const [search, setSearch] = useState("");
  const [selectedSector, setSelectedSector] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("upside");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir(key === "grade" ? "asc" : "desc");
    }
  };

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === "desc" ? "↓" : "↑") : "↕";

  const sectorAverages = useMemo(() => calcSectorAverages(data), [data]);

  const enrichedData = useMemo<EnrichedItem[]>(() => {
    return data.map((item) => {
      const sa = item.sector ? sectorAverages.get(item.sector) ?? null : null;
      const fin = toFinancialData(item);
      const fv = sa
        ? calcFairValue(item.eps, item.bps, item.closePrice, sa, fin, item.sector)
        : null;
      return { ...item, fv, sectorAvg: sa };
    });
  }, [data, sectorAverages]);

  const sectors = useMemo(() => {
    const s = new Set<string>();
    data.forEach((item) => { if (item.sector) s.add(item.sector); });
    return Array.from(s).sort();
  }, [data]);

  const hasActiveFilter = search.length > 0 || market !== "ALL" || selectedSector !== "ALL";
  const DISPLAY_LIMIT = 100;

  const ranked = useMemo(() => {
    // 적정가 있는 종목만
    let result = enrichedData.filter((item) => item.fv !== null);

    // 필터
    if (market !== "ALL") result = result.filter((item) => item.market === market);
    if (selectedSector !== "ALL") result = result.filter((item) => item.sector === selectedSector);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((item) =>
        item.name.toLowerCase().includes(q) || item.ticker.toLowerCase().includes(q)
      );
    }

    // 신뢰도 판별 (품질 데이터 없으면서 극단값인 종목은 후순위)
    const hasQuality = (item: EnrichedItem) => item.fv!.qualityScore >= 0;
    const isExtreme = (item: EnrichedItem) => Math.abs(item.fv!.upsidePct) >= 400;
    const isReliable = (item: EnrichedItem) => hasQuality(item) || !isExtreme(item);

    const getGradeOrder = (item: EnrichedItem) => {
      if (item.fv!.qualityScore < 0) return 99; // 등급 없음 → 최하위
      const g = qualityGrade(item.fv!.qualityMultiplier);
      return GRADE_ORDER[g] ?? 99;
    };

    const dir = sortDir === "desc" ? -1 : 1;

    result.sort((a, b) => {
      // 항상 신뢰도 높은 종목 우선
      const aR = isReliable(a), bR = isReliable(b);
      if (aR !== bR) return aR ? -1 : 1;

      if (sortKey === "upside") {
        const diff = a.fv!.upsidePct - b.fv!.upsidePct;
        // 기본: 저평가 탭은 desc(큰 게 위), 고평가 탭은 asc(작은 게 위)
        return tab === "undervalued" ? -diff * dir : diff * dir;
      }
      if (sortKey === "grade") {
        const diff = getGradeOrder(a) - getGradeOrder(b);
        if (diff !== 0) return diff * dir;
        // 같은 등급 내에서는 upside 순
        return tab === "undervalued"
          ? b.fv!.upsidePct - a.fv!.upsidePct
          : a.fv!.upsidePct - b.fv!.upsidePct;
      }
      if (sortKey === "price") return (a.closePrice - b.closePrice) * dir;
      if (sortKey === "fairValue") return (a.fv!.fairValue - b.fv!.fairValue) * dir;
      if (sortKey === "roe") return ((a.roe ?? -9999) - (b.roe ?? -9999)) * dir;
      if (sortKey === "operatingMargin") return ((a.operatingMargin ?? -9999) - (b.operatingMargin ?? -9999)) * dir;
      return 0;
    });

    if (!hasActiveFilter && result.length > DISPLAY_LIMIT)
      return result.slice(0, DISPLAY_LIMIT);
    return result;
  }, [enrichedData, tab, market, selectedSector, search, hasActiveFilter, sortKey, sortDir]);

  const totalWithFV = useMemo(() => enrichedData.filter((i) => i.fv !== null).length, [enrichedData]);

  return (
    <div>
      {/* Date + Stats */}
      <div className="flex flex-wrap items-center gap-4 mb-6 text-xs">
        <div>
          <span className="text-zinc-500">기준일</span>
          <span className="ml-1.5 font-mono bg-zinc-800 px-2 py-0.5 rounded">{tradeDate}</span>
        </div>
        <div>
          <span className="text-zinc-500">분석 대상</span>
          <span className="ml-1.5 text-zinc-300">{totalWithFV.toLocaleString()}종목</span>
        </div>
      </div>

      {/* Ranking Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab("undervalued")}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            tab === "undervalued"
              ? "bg-green-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          저평가 TOP
        </button>
        <button
          onClick={() => setTab("overvalued")}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            tab === "overvalued"
              ? "bg-red-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          고평가 TOP
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder="종목명 또는 코드 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:border-blue-500"
        />
        <div className="flex gap-1">
          {(["ALL", "KOSPI", "KOSDAQ"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMarket(m)}
              className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                market === m
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {m === "ALL" ? "전체" : m}
            </button>
          ))}
        </div>
        <select
          value={selectedSector}
          onChange={(e) => setSelectedSector(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">전체 업종</option>
          {sectors.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Disclaimer */}
      <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-lg px-4 py-2.5 mb-5 text-xs text-yellow-200/80">
        품질 조정 적정가는 업종 평균 PER·PBR과 재무 건전성을 종합한 참고치이며, 투자 판단의 근거로 사용하지 마십시오.
      </div>

      {/* Count */}
      <div className="text-sm text-zinc-500 mb-3">
        {ranked.length}종목
        {!hasActiveFilter && ranked.length === DISPLAY_LIMIT && ` (상위 ${DISPLAY_LIMIT}개 표시)`}
      </div>

      {/* ===== Ranking Table ===== */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
              <th className="text-left py-3 px-2 w-10">#</th>
              <th className="text-left py-3 px-2">종목</th>
              <th className="text-right py-3 px-2 cursor-pointer select-none hover:text-zinc-300 transition-colors" onClick={() => toggleSort("price")}>
                현재가{sortIndicator("price")}
              </th>
              <th className="text-right py-3 px-2 cursor-pointer select-none hover:text-zinc-300 transition-colors" onClick={() => toggleSort("fairValue")}>
                적정가{sortIndicator("fairValue")}
              </th>
              <th className="text-right py-3 px-2 cursor-pointer select-none hover:text-zinc-300 transition-colors" onClick={() => toggleSort("upside")}>
                {tab === "undervalued" ? "저평가" : "고평가"}{sortIndicator("upside")}
              </th>
              <th className="text-center py-3 px-2 hidden sm:table-cell w-20"></th>
              <th className="text-center py-3 px-2 hidden md:table-cell cursor-pointer select-none hover:text-zinc-300 transition-colors" onClick={() => toggleSort("grade")}>
                등급{sortIndicator("grade")}
              </th>
              <th className="text-right py-3 px-2 hidden lg:table-cell cursor-pointer select-none hover:text-zinc-300 transition-colors" onClick={() => toggleSort("roe")}>
                ROE{sortIndicator("roe")}
              </th>
              <th className="text-right py-3 px-2 hidden lg:table-cell cursor-pointer select-none hover:text-zinc-300 transition-colors" onClick={() => toggleSort("operatingMargin")}>
                영업이익률{sortIndicator("operatingMargin")}
              </th>
              <th className="text-left py-3 px-2 hidden xl:table-cell">업종</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((item, i) => {
              const fv = item.fv!;
              const grade = fv.qualityScore >= 0
                ? qualityGrade(fv.qualityMultiplier)
                : null;
              const unreliable = !grade && (fv.fairValue / item.closePrice >= 5 || item.closePrice / fv.fairValue >= 5);

              return (
                <tr
                  key={item.ticker}
                  className={`border-b border-zinc-800/50 hover:bg-zinc-900/80 transition-colors ${unreliable ? "opacity-50" : ""}`}
                >
                  {/* Rank */}
                  <td className="py-3 px-2 text-zinc-500 font-mono text-xs">
                    {i + 1}
                  </td>

                  {/* Stock name */}
                  <td className="py-3 px-2">
                    <Link
                      href={`/stock/${item.ticker}`}
                      className="hover:text-blue-400 transition-colors"
                    >
                      <span className="font-medium">{item.name}</span>
                      <span className="text-zinc-500 text-xs ml-1.5 hidden sm:inline">{item.ticker}</span>
                    </Link>
                    <div className="flex items-center gap-1.5 mt-0.5 sm:hidden">
                      <span className="text-[10px] text-zinc-600 font-mono">{item.ticker}</span>
                      <span className={`text-[10px] px-1 rounded ${
                        item.market === "KOSPI" ? "bg-blue-900/30 text-blue-400" : "bg-purple-900/30 text-purple-400"
                      }`}>{item.market}</span>
                    </div>
                  </td>

                  {/* Current price */}
                  <td className="py-3 px-2 text-right text-zinc-300 tabular-nums">
                    {formatNumber(item.closePrice)}
                  </td>

                  {/* Fair value */}
                  <td className="py-3 px-2 text-right text-zinc-300 tabular-nums">
                    {formatFairValue(fv.fairValue)}
                  </td>

                  {/* Upside % */}
                  <td className="py-3 px-2 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${upsideBgColor(fv.upsidePct)}`}>
                      {(() => {
                        const ratio = fv.fairValue / item.closePrice;
                        if (ratio >= 2) return `${ratio.toFixed(1)}배 저렴`;
                        if (ratio <= 0.5) return `${(1 / ratio).toFixed(1)}배 비쌈`;
                        const pct = fv.upsidePct;
                        return `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`;
                      })()}
                    </span>
                  </td>

                  {/* Mini bar */}
                  <td className="py-3 px-2 hidden sm:table-cell">
                    <MiniBar pct={fv.upsidePct} />
                  </td>

                  {/* Quality grade */}
                  <td className="py-3 px-2 text-center hidden md:table-cell">
                    {grade ? (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${qualityGradeBadgeColor(grade)}`}>
                        {grade}
                      </span>
                    ) : unreliable ? (
                      <span className="text-[10px] text-yellow-600" title="재무 데이터 미확인 · 신뢰도 낮음">주의</span>
                    ) : (
                      <span className="text-zinc-600">-</span>
                    )}
                  </td>

                  {/* ROE */}
                  <td className={`py-3 px-2 text-right hidden lg:table-cell text-xs ${roeColor(item.roe)}`}>
                    {item.roe !== null ? `${item.roe.toFixed(1)}%` : "-"}
                  </td>

                  {/* Operating margin */}
                  <td className={`py-3 px-2 text-right hidden lg:table-cell text-xs ${operatingMarginColor(item.operatingMargin)}`}>
                    {item.operatingMargin !== null ? `${item.operatingMargin.toFixed(1)}%` : "-"}
                  </td>

                  {/* Sector */}
                  <td className="py-3 px-2 text-xs text-zinc-500 hidden xl:table-cell">
                    {item.sector || "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {ranked.length === 0 && (
        <div className="text-center py-10 text-zinc-500">
          조건에 맞는 종목이 없습니다.
        </div>
      )}
    </div>
  );
}
