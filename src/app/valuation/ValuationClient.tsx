"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  formatNumber,
  perColor,
  pbrColor,
  dvdYldColor,
  compositeColor,
  formatPer,
  formatPbr,
} from "@/lib/format";
import type { ValuationItem } from "./page";

type Tab = "undervalued" | "overvalued";
type Market = "ALL" | "KOSPI" | "KOSDAQ";
type SortKey =
  | "per"
  | "pbr"
  | "dvdYld"
  | "closePrice"
  | "composite";

function calcCompositeScores(items: ValuationItem[]) {
  // PER > 0인 종목만 대상
  const valid = items.filter((i) => i.per !== null && i.per > 0);
  if (valid.length === 0) return new Map<string, number>();

  // PER 퍼센타일 (낮을수록 높은 점수)
  const sortedPer = [...valid].sort((a, b) => a.per! - b.per!);
  const perRank = new Map<string, number>();
  sortedPer.forEach((item, idx) => {
    perRank.set(item.ticker, ((valid.length - idx) / valid.length) * 100);
  });

  // PBR 퍼센타일 (낮을수록 높은 점수)
  const validPbr = valid.filter((i) => i.pbr !== null && i.pbr > 0);
  const sortedPbr = [...validPbr].sort((a, b) => a.pbr! - b.pbr!);
  const pbrRank = new Map<string, number>();
  sortedPbr.forEach((item, idx) => {
    pbrRank.set(item.ticker, ((validPbr.length - idx) / validPbr.length) * 100);
  });

  // 배당수익률 퍼센타일 (높을수록 높은 점수)
  const validDvd = valid.filter((i) => i.dvdYld !== null && i.dvdYld > 0);
  const sortedDvd = [...validDvd].sort((a, b) => a.dvdYld! - b.dvdYld!);
  const dvdRank = new Map<string, number>();
  sortedDvd.forEach((item, idx) => {
    dvdRank.set(item.ticker, ((idx + 1) / validDvd.length) * 100);
  });

  // 복합점수 = PER 40% + PBR 40% + 배당수익률 20%
  const scores = new Map<string, number>();
  for (const item of valid) {
    const perScore = perRank.get(item.ticker) ?? 0;
    const pbrScore = pbrRank.get(item.ticker) ?? 50; // PBR 없으면 중간값
    const dvdScore = dvdRank.get(item.ticker) ?? 0;
    scores.set(
      item.ticker,
      Math.round(perScore * 0.4 + pbrScore * 0.4 + dvdScore * 0.2)
    );
  }

  return scores;
}

export function ValuationClient({
  data,
  tradeDate,
}: {
  data: ValuationItem[];
  tradeDate: string;
}) {
  const [tab, setTab] = useState<Tab>("undervalued");
  const [market, setMarket] = useState<Market>("ALL");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("composite");
  const [sortAsc, setSortAsc] = useState(false);

  const compositeScores = useMemo(() => calcCompositeScores(data), [data]);

  // 업종 목록 추출
  const sectors = useMemo(() => {
    const s = new Set<string>();
    data.forEach((item) => {
      if (item.sector) s.add(item.sector);
    });
    return Array.from(s).sort();
  }, [data]);
  const [selectedSector, setSelectedSector] = useState<string>("ALL");

  const hasActiveFilter =
    search.length > 0 || market !== "ALL" || selectedSector !== "ALL";
  const DISPLAY_LIMIT = 100;

  const filtered = useMemo(() => {
    const result = data
      .filter((item) => {
        // 탭 필터
        if (tab === "undervalued") {
          if (item.per === null || item.per <= 0) return false;
        }
        // 시장 필터
        if (market !== "ALL" && item.market !== market) return false;
        // 업종 필터
        if (selectedSector !== "ALL" && item.sector !== selectedSector)
          return false;
        // 검색 필터
        if (search) {
          const q = search.toLowerCase();
          if (
            !item.name.toLowerCase().includes(q) &&
            !item.ticker.toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      })
      .sort((a, b) => {
        let aVal: number;
        let bVal: number;

        if (sortKey === "composite") {
          aVal = compositeScores.get(a.ticker) ?? -1;
          bVal = compositeScores.get(b.ticker) ?? -1;
        } else if (sortKey === "closePrice") {
          aVal = a.closePrice;
          bVal = b.closePrice;
        } else {
          aVal = a[sortKey] ?? (sortAsc ? Infinity : -Infinity);
          bVal = b[sortKey] ?? (sortAsc ? Infinity : -Infinity);
        }

        // null/적자 처리: PER 정렬 시 null/적자는 맨 뒤
        if (sortKey === "per") {
          if ((a.per === null || a.per <= 0) && b.per !== null && b.per > 0)
            return 1;
          if ((b.per === null || b.per <= 0) && a.per !== null && a.per > 0)
            return -1;
        }

        const diff = aVal - bVal;
        return sortAsc ? diff : -diff;
      });

    if (!hasActiveFilter && result.length > DISPLAY_LIMIT)
      return result.slice(0, DISPLAY_LIMIT);
    return result;
  }, [
    data,
    tab,
    market,
    selectedSector,
    search,
    sortKey,
    sortAsc,
    compositeScores,
    hasActiveFilter,
  ]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      // PER/PBR 기본: 오름차순(저평가), 배당/복합: 내림차순
      setSortAsc(key === "per" || key === "pbr");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col)
      return <span className="text-zinc-600 ml-1">↕</span>;
    return (
      <span className="text-blue-400 ml-1">{sortAsc ? "↑" : "↓"}</span>
    );
  }

  return (
    <div>
      {/* Date Badge */}
      <div className="flex flex-wrap gap-3 mb-6 text-xs">
        <div>
          <span className="text-zinc-500">기준일</span>
          <span className="ml-1.5 font-mono bg-zinc-800 px-2 py-0.5 rounded">
            {tradeDate}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(
          [
            { key: "undervalued", label: "저평가" },
            { key: "overvalued", label: "고평가" },
          ] as { key: Tab; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              if (key === "undervalued") {
                setSortKey("composite");
                setSortAsc(false);
              } else {
                setSortKey("per");
                setSortAsc(false);
              }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key
                ? key === "undervalued"
                  ? "bg-green-600 text-white"
                  : "bg-red-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              종목 검색
            </label>
            <input
              type="text"
              placeholder="종목명 또는 코드"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Market */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">시장</label>
            <div className="flex gap-1">
              {(["ALL", "KOSPI", "KOSDAQ"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMarket(m)}
                  className={`flex-1 px-2 py-1.5 rounded text-xs transition-colors ${
                    market === m
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {m === "ALL" ? "전체" : m}
                </button>
              ))}
            </div>
          </div>

          {/* Sector */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">업종</label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">전체 업종</option>
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-zinc-500">
          {filtered.length}종목
          {!hasActiveFilter &&
            filtered.length === DISPLAY_LIMIT &&
            ` (상위 ${DISPLAY_LIMIT}개 표시 - 검색하면 전체에서 찾습니다)`}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th className="text-left py-3 px-2 w-10">#</th>
              <th className="text-left py-3 px-2">종목</th>
              <th className="text-left py-3 px-2 hidden sm:table-cell">
                시장
              </th>
              <th
                className="text-right py-3 px-2 cursor-pointer select-none hover:text-zinc-200"
                onClick={() => handleSort("closePrice")}
              >
                종가
                <SortIcon col="closePrice" />
              </th>
              <th
                className="text-right py-3 px-2 cursor-pointer select-none hover:text-zinc-200"
                onClick={() => handleSort("per")}
              >
                PER
                <SortIcon col="per" />
              </th>
              <th
                className="text-right py-3 px-2 cursor-pointer select-none hover:text-zinc-200"
                onClick={() => handleSort("pbr")}
              >
                PBR
                <SortIcon col="pbr" />
              </th>
              <th
                className="text-right py-3 px-2 cursor-pointer select-none hover:text-zinc-200 hidden md:table-cell"
                onClick={() => handleSort("dvdYld")}
              >
                배당수익률
                <SortIcon col="dvdYld" />
              </th>
              <th className="text-left py-3 px-2 hidden lg:table-cell">
                업종
              </th>
              {tab === "undervalued" && (
                <th
                  className="text-right py-3 px-2 cursor-pointer select-none hover:text-zinc-200"
                  onClick={() => handleSort("composite")}
                >
                  복합점수
                  <SortIcon col="composite" />
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, i) => {
              const score = compositeScores.get(item.ticker) ?? null;
              return (
                <tr
                  key={item.ticker}
                  className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
                >
                  <td className="py-2.5 px-2 text-zinc-500">{i + 1}</td>
                  <td className="py-2.5 px-2">
                    <Link
                      href={`/stock/${item.ticker}`}
                      className="hover:text-blue-400 transition-colors"
                    >
                      <span className="font-medium">{item.name}</span>
                      <span className="text-zinc-500 text-xs ml-1.5">
                        {item.ticker}
                      </span>
                    </Link>
                  </td>
                  <td className="py-2.5 px-2 hidden sm:table-cell">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        item.market === "KOSPI"
                          ? "bg-blue-900/30 text-blue-400"
                          : "bg-purple-900/30 text-purple-400"
                      }`}
                    >
                      {item.market}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right text-zinc-300">
                    {item.closePrice > 0
                      ? `${formatNumber(item.closePrice)}원`
                      : "-"}
                  </td>
                  <td
                    className={`py-2.5 px-2 text-right ${perColor(item.per)}`}
                  >
                    {formatPer(item.per)}
                  </td>
                  <td
                    className={`py-2.5 px-2 text-right ${pbrColor(item.pbr)}`}
                  >
                    {formatPbr(item.pbr)}
                  </td>
                  <td
                    className={`py-2.5 px-2 text-right hidden md:table-cell ${dvdYldColor(
                      item.dvdYld
                    )}`}
                  >
                    {item.dvdYld !== null && item.dvdYld > 0
                      ? `${item.dvdYld.toFixed(2)}%`
                      : "-"}
                  </td>
                  <td className="py-2.5 px-2 text-zinc-500 text-xs hidden lg:table-cell">
                    {item.sector || "-"}
                  </td>
                  {tab === "undervalued" && (
                    <td
                      className={`py-2.5 px-2 text-right font-mono ${compositeColor(
                        score
                      )}`}
                    >
                      {score !== null ? score : "-"}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-10 text-zinc-500">
          조건에 맞는 종목이 없습니다.
        </div>
      )}
    </div>
  );
}
