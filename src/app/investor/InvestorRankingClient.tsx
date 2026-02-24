"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { formatBillions, formatNumber, netValueColor } from "@/lib/format";
import { Tooltip } from "@/components/Tooltip";

type InvestorType = "9000" | "8000" | "7050";
type Period = 1 | 5 | 20;
type Direction = "buy" | "sell";
type Market = "ALL" | "KOSPI" | "KOSDAQ";

type RankingItem = {
  ticker: string;
  name: string;
  market: string;
  net_value: number;
  net_volume: number;
  buy_value: number;
  sell_value: number;
};

type SortKey = "net_value" | "net_volume" | "buy_value" | "sell_value";

type Props = {
  initialData: RankingItem[];
  latestDate: string | null;
};

export function InvestorRankingClient({ initialData, latestDate }: Props) {
  const [investorType, setInvestorType] = useState<InvestorType>("9000");
  const [period, setPeriod] = useState<Period>(1);
  const [direction, setDirection] = useState<Direction>("buy");
  const [market, setMarket] = useState<Market>("ALL");
  const [data, setData] = useState<RankingItem[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("net_value");
  const [sortAsc, setSortAsc] = useState(false);

  const fetchData = useCallback(
    async (
      inv: InvestorType,
      per: Period,
      dir: Direction,
      mkt: Market
    ) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/investor?investorType=${inv}&period=${per}&direction=${dir}&market=${mkt}`
        );
        const json = await res.json();
        setData(json.data || []);
      } catch {
        setData([]);
      }
      setLoading(false);
    },
    []
  );

  function handleInvestorType(type: InvestorType) {
    setInvestorType(type);
    fetchData(type, period, direction, market);
  }

  function handlePeriod(p: Period) {
    setPeriod(p);
    fetchData(investorType, p, direction, market);
  }

  function handleDirection(d: Direction) {
    setDirection(d);
    fetchData(investorType, period, d, market);
  }

  function handleMarket(m: Market) {
    setMarket(m);
    fetchData(investorType, period, direction, m);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const sorted = [...data].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey];
    return sortAsc ? diff : -diff;
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col)
      return <span className="text-zinc-600 ml-1">↕</span>;
    return (
      <span className="text-blue-400 ml-1">{sortAsc ? "↑" : "↓"}</span>
    );
  }

  const investorButtons: { key: InvestorType; label: string }[] = [
    { key: "9000", label: "외국인" },
    { key: "7050", label: "기관" },
    { key: "8000", label: "개인" },
  ];

  const periodButtons: { key: Period; label: string }[] = [
    { key: 1, label: "1일" },
    { key: 5, label: "5일" },
    { key: 20, label: "20일" },
  ];

  const directionButtons: { key: Direction; label: string }[] = [
    { key: "buy", label: "순매수" },
    { key: "sell", label: "순매도" },
  ];

  const marketButtons: { key: Market; label: string }[] = [
    { key: "ALL", label: "전체" },
    { key: "KOSPI", label: "KOSPI" },
    { key: "KOSDAQ", label: "KOSDAQ" },
  ];

  function TabRow<T extends string | number>({
    items,
    active,
    onChange,
  }: {
    items: { key: T; label: string }[];
    active: T;
    onChange: (key: T) => void;
  }) {
    return (
      <div className="flex gap-2 flex-wrap">
        {items.map((item) => (
          <button
            key={String(item.key)}
            onClick={() => onChange(item.key)}
            className={`px-4 py-1.5 rounded text-sm transition-colors ${
              active === item.key
                ? "bg-zinc-100 text-zinc-900 font-medium"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Filter Controls */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 w-14 shrink-0">투자자</span>
          <TabRow
            items={investorButtons}
            active={investorType}
            onChange={handleInvestorType}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 w-14 shrink-0">기간</span>
          <TabRow
            items={periodButtons}
            active={period}
            onChange={handlePeriod}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 w-14 shrink-0">방향</span>
          <TabRow
            items={directionButtons}
            active={direction}
            onChange={handleDirection}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 w-14 shrink-0">시장</span>
          <TabRow
            items={marketButtons}
            active={market}
            onChange={handleMarket}
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8 text-zinc-500">로딩 중...</div>
      )}

      {/* Table */}
      {!loading && sorted.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="py-3 px-2 text-left w-10">#</th>
                <th className="py-3 px-2 text-left">종목</th>
                <th className="py-3 px-2 text-left hidden md:table-cell">
                  시장
                </th>
                <th
                  className="py-3 px-2 text-right cursor-pointer select-none"
                  onClick={() => handleSort("net_value")}
                >
                  <Tooltip text="매수한 금액에서 매도한 금액을 뺀 값이에요. 양수면 사들인 금액이 더 크고, 음수면 판 금액이 더 커요.">
                    순매수대금
                  </Tooltip>
                  <SortIcon col="net_value" />
                </th>
                <th
                  className="py-3 px-2 text-right cursor-pointer select-none hidden sm:table-cell"
                  onClick={() => handleSort("buy_value")}
                >
                  <Tooltip text="해당 투자자가 이 종목을 사는 데 쓴 총 금액이에요.">
                    매수대금
                  </Tooltip>
                  <SortIcon col="buy_value" />
                </th>
                <th
                  className="py-3 px-2 text-right cursor-pointer select-none hidden sm:table-cell"
                  onClick={() => handleSort("sell_value")}
                >
                  <Tooltip text="해당 투자자가 이 종목을 판 총 금액이에요.">
                    매도대금
                  </Tooltip>
                  <SortIcon col="sell_value" />
                </th>
                <th
                  className="py-3 px-2 text-right cursor-pointer select-none hidden lg:table-cell"
                  onClick={() => handleSort("net_volume")}
                >
                  <Tooltip text="매수한 주식 수에서 매도한 주식 수를 뺀 값이에요. 양수면 사들인 수량이 더 많아요.">
                    순매수량
                  </Tooltip>
                  <SortIcon col="net_volume" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, i) => (
                <tr
                  key={item.ticker}
                  className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
                >
                  <td className="py-3 px-2 text-zinc-500">{i + 1}</td>
                  <td className="py-3 px-2">
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
                  <td className="py-3 px-2 hidden md:table-cell">
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
                  <td
                    className={`py-3 px-2 text-right font-mono ${netValueColor(
                      item.net_value
                    )}`}
                  >
                    {item.net_value > 0 ? "+" : ""}
                    {formatBillions(item.net_value)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-zinc-300 hidden sm:table-cell">
                    {formatBillions(item.buy_value)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-zinc-300 hidden sm:table-cell">
                    {formatBillions(item.sell_value)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-zinc-400 hidden lg:table-cell">
                    {item.net_volume > 0 ? "+" : ""}
                    {formatNumber(item.net_volume)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty */}
      {!loading && sorted.length === 0 && (
        <div className="text-center py-20 text-zinc-500">
          해당 조건에 맞는 데이터가 없습니다.
        </div>
      )}
    </div>
  );
}
