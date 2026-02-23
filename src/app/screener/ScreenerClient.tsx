"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type ScreenerItem = {
  ticker: string;
  name: string;
  market: string;
  shortVolume: number;
  totalVolume: number;
  shortRatio: number;
  closePrice: number;
  balanceRatio: number | null;
};

type SortKey = "shortRatio" | "balanceRatio" | "shortVolume" | "totalVolume" | "closePrice";

export function ScreenerClient({
  data,
  tradeDate,
  balanceDate,
}: {
  data: ScreenerItem[];
  tradeDate: string;
  balanceDate: string | null;
}) {
  const [market, setMarket] = useState<"ALL" | "KOSPI" | "KOSDAQ">("ALL");
  const [minShortRatio, setMinShortRatio] = useState(0);
  const [maxShortRatio, setMaxShortRatio] = useState(100);
  const [minBalanceRatio, setMinBalanceRatio] = useState(0);
  const [maxBalanceRatio, setMaxBalanceRatio] = useState(100);
  const [sortKey, setSortKey] = useState<SortKey>("shortRatio");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");

  const hasActiveFilter = search.length > 0 || market !== "ALL" || minShortRatio > 0 || maxShortRatio < 100 || minBalanceRatio > 0 || maxBalanceRatio < 100;
  const DISPLAY_LIMIT = 100;

  const filtered = useMemo(() => {
    const result = data
      .filter((item) => {
        if (market !== "ALL" && item.market !== market) return false;
        if (item.shortRatio < minShortRatio || item.shortRatio > maxShortRatio) return false;
        if (minBalanceRatio > 0 || maxBalanceRatio < 100) {
          if (item.balanceRatio === null) return false;
          if (item.balanceRatio < minBalanceRatio || item.balanceRatio > maxBalanceRatio) return false;
        }
        if (search) {
          const q = search.toLowerCase();
          if (!item.name.toLowerCase().includes(q) && !item.ticker.toLowerCase().includes(q)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const aVal = a[sortKey] ?? -1;
        const bVal = b[sortKey] ?? -1;
        const diff = (aVal as number) - (bVal as number);
        return sortAsc ? diff : -diff;
      });

    // 필터/검색이 없으면 상위 N개만 표시
    if (!hasActiveFilter) return result.slice(0, DISPLAY_LIMIT);
    return result;
  }, [data, market, minShortRatio, maxShortRatio, minBalanceRatio, maxBalanceRatio, sortKey, sortAsc, search, hasActiveFilter]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-zinc-600 ml-1">↕</span>;
    return <span className="text-blue-400 ml-1">{sortAsc ? "↑" : "↓"}</span>;
  }

  function formatNumber(n: number): string {
    return n.toLocaleString("ko-KR");
  }

  function ratioColor(ratio: number): string {
    if (ratio >= 20) return "text-red-400 font-semibold";
    if (ratio >= 10) return "text-orange-400";
    if (ratio >= 5) return "text-yellow-400";
    return "text-zinc-300";
  }

  return (
    <div>
      {/* Date Badges */}
      <div className="flex flex-wrap gap-3 mb-6 text-xs">
        <div>
          <span className="text-zinc-500">거래량 기준일</span>
          <span className="ml-1.5 font-mono bg-zinc-800 px-2 py-0.5 rounded">{tradeDate}</span>
        </div>
        {balanceDate && (
          <div>
            <span className="text-zinc-500">잔고 기준일</span>
            <span className="ml-1.5 font-mono bg-zinc-800 px-2 py-0.5 rounded">{balanceDate}</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">종목 검색</label>
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

          {/* Short Ratio Range */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">공매도 비중 (%)</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                value={minShortRatio}
                onChange={(e) => setMinShortRatio(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:border-blue-500"
              />
              <span className="text-zinc-500 text-xs">~</span>
              <input
                type="number"
                min={0}
                max={100}
                value={maxShortRatio}
                onChange={(e) => setMaxShortRatio(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Balance Ratio Range */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">잔고비율 (%)</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                value={minBalanceRatio}
                onChange={(e) => setMinBalanceRatio(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:border-blue-500"
              />
              <span className="text-zinc-500 text-xs">~</span>
              <input
                type="number"
                min={0}
                max={100}
                value={maxBalanceRatio}
                onChange={(e) => setMaxBalanceRatio(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-zinc-500">
          {filtered.length}종목
          {!hasActiveFilter && ` (전체 ${data.length}종목 중 상위 ${DISPLAY_LIMIT}개 표시 - 검색하면 전체에서 찾습니다)`}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th className="text-left py-3 px-2 w-10">#</th>
              <th className="text-left py-3 px-2">종목</th>
              <th className="text-left py-3 px-2 hidden sm:table-cell">시장</th>
              <th
                className="text-right py-3 px-2 cursor-pointer select-none hover:text-zinc-200"
                onClick={() => handleSort("shortRatio")}
              >
                공매도비중<SortIcon col="shortRatio" />
              </th>
              <th
                className="text-right py-3 px-2 cursor-pointer select-none hover:text-zinc-200"
                onClick={() => handleSort("balanceRatio")}
              >
                잔고비율<SortIcon col="balanceRatio" />
              </th>
              <th
                className="text-right py-3 px-2 cursor-pointer select-none hover:text-zinc-200 hidden md:table-cell"
                onClick={() => handleSort("shortVolume")}
              >
                공매도량<SortIcon col="shortVolume" />
              </th>
              <th
                className="text-right py-3 px-2 cursor-pointer select-none hover:text-zinc-200 hidden lg:table-cell"
                onClick={() => handleSort("totalVolume")}
              >
                총거래량<SortIcon col="totalVolume" />
              </th>
              <th
                className="text-right py-3 px-2 cursor-pointer select-none hover:text-zinc-200"
                onClick={() => handleSort("closePrice")}
              >
                종가<SortIcon col="closePrice" />
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, i) => (
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
                    <span className="text-zinc-500 text-xs ml-1.5">{item.ticker}</span>
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
                <td className={`py-2.5 px-2 text-right ${ratioColor(item.shortRatio)}`}>
                  {item.shortRatio.toFixed(2)}%
                </td>
                <td className={`py-2.5 px-2 text-right ${item.balanceRatio !== null ? ratioColor(item.balanceRatio) : "text-zinc-600"}`}>
                  {item.balanceRatio !== null ? `${item.balanceRatio.toFixed(2)}%` : "-"}
                </td>
                <td className="py-2.5 px-2 text-right text-zinc-300 hidden md:table-cell">
                  {formatNumber(item.shortVolume)}
                </td>
                <td className="py-2.5 px-2 text-right text-zinc-400 hidden lg:table-cell">
                  {formatNumber(item.totalVolume)}
                </td>
                <td className="py-2.5 px-2 text-right text-zinc-300">
                  {item.closePrice > 0 ? `${formatNumber(item.closePrice)}원` : "-"}
                </td>
              </tr>
            ))}
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
