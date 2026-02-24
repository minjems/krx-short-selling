"use client";

import { useState } from "react";
import Link from "next/link";
import { Tooltip } from "@/components/Tooltip";

type RankingItem = {
  ticker: string;
  name: string;
  market: string;
  shortVolume: number;
  totalVolume: number;
  shortRatio: number;
  closePrice: number;
};

type SortKey = "shortRatio" | "shortVolume" | "totalVolume" | "closePrice";

export function RankingTable({ data }: { data: RankingItem[] }) {
  const [market, setMarket] = useState<"ALL" | "KOSPI" | "KOSDAQ">("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("shortRatio");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = data.filter(
    (item) => market === "ALL" || item.market === market
  );

  const sorted = [...filtered].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey];
    return sortAsc ? diff : -diff;
  });

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
      {/* Market Tabs */}
      <div className="flex gap-2 mb-4">
        {(["ALL", "KOSPI", "KOSDAQ"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMarket(m)}
            className={`px-4 py-1.5 rounded text-sm transition-colors ${
              market === m
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {m === "ALL" ? "전체" : m}
          </button>
        ))}
        <span className="ml-auto text-sm text-zinc-500 self-center">
          {sorted.length}종목
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
                <Tooltip text="하루 전체 거래량 중 공매도(주가 하락에 베팅하는 거래)가 차지하는 비율이에요. 높을수록 하락을 예상하는 투자자가 많다는 뜻이에요.">
                  공매도비중
                </Tooltip>
                <SortIcon col="shortRatio" />
              </th>
              <th
                className="text-right py-3 px-2 cursor-pointer select-none hover:text-zinc-200 hidden md:table-cell"
                onClick={() => handleSort("shortVolume")}
              >
                <Tooltip text="하루 동안 공매도로 거래된 주식 수예요. 빌린 주식을 팔아서 나중에 싸게 사서 갚으려는 거래량이에요.">
                  공매도량
                </Tooltip>
                <SortIcon col="shortVolume" />
              </th>
              <th
                className="text-right py-3 px-2 cursor-pointer select-none hover:text-zinc-200 hidden md:table-cell"
                onClick={() => handleSort("totalVolume")}
              >
                <Tooltip text="하루 동안 이 종목이 거래된 전체 주식 수예요. 공매도 + 일반 매매를 모두 합친 수치예요.">
                  총거래량
                </Tooltip>
                <SortIcon col="totalVolume" />
              </th>
              <th
                className="text-right py-3 px-2 cursor-pointer select-none hover:text-zinc-200"
                onClick={() => handleSort("closePrice")}
              >
                <Tooltip text="그날 장이 마감했을 때의 최종 주가예요.">
                  종가
                </Tooltip>
                <SortIcon col="closePrice" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, i) => (
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
                <td className={`py-2.5 px-2 text-right ${ratioColor(item.shortRatio)}`}>
                  {item.shortRatio.toFixed(2)}%
                </td>
                <td className="py-2.5 px-2 text-right text-zinc-300 hidden md:table-cell">
                  {formatNumber(item.shortVolume)}
                </td>
                <td className="py-2.5 px-2 text-right text-zinc-400 hidden md:table-cell">
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

      {sorted.length === 0 && (
        <div className="text-center py-10 text-zinc-500">
          해당 시장의 데이터가 없습니다.
        </div>
      )}
    </div>
  );
}
