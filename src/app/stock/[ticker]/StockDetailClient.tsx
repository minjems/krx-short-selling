"use client";

import { ShortRatioChart } from "@/components/ShortRatioChart";
import { BalanceChart } from "@/components/BalanceChart";

type Summary = {
  closePrice: number;
  shortRatio: number;
  shortVolume: number;
  totalVolume: number;
  balanceRatio: number;
  balanceQuantity: number;
  volumeDate: string | null;
  balanceDate: string | null;
};

type VolumeItem = {
  date: string;
  totalVolume: number;
  shortVolume: number;
  shortRatio: number;
  closePrice: number;
};

type BalanceItem = {
  date: string;
  balanceQuantity: number;
  balanceAmount: number;
  balanceRatio: number;
};

function formatNumber(n: number): string {
  return n.toLocaleString("ko-KR");
}

function ratioColor(ratio: number): string {
  if (ratio >= 20) return "text-red-400";
  if (ratio >= 10) return "text-orange-400";
  if (ratio >= 5) return "text-yellow-400";
  return "text-zinc-100";
}

export function StockDetailClient({
  summary,
  volumeHistory,
  balanceHistory,
}: {
  summary: Summary;
  volumeHistory: VolumeItem[];
  balanceHistory: BalanceItem[];
}) {
  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500 mb-1">종가</div>
          <div className="text-lg font-bold">
            {summary.closePrice > 0
              ? `${formatNumber(summary.closePrice)}원`
              : "-"}
          </div>
          {summary.volumeDate && (
            <div className="text-xs text-zinc-600 mt-1">{summary.volumeDate}</div>
          )}
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500 mb-1">공매도 비중</div>
          <div className={`text-lg font-bold ${ratioColor(summary.shortRatio)}`}>
            {summary.shortRatio.toFixed(2)}%
          </div>
          {summary.volumeDate && (
            <div className="text-xs text-zinc-600 mt-1">{summary.volumeDate}</div>
          )}
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500 mb-1">잔고비율</div>
          <div className={`text-lg font-bold ${ratioColor(summary.balanceRatio)}`}>
            {summary.balanceRatio.toFixed(2)}%
          </div>
          {summary.balanceDate && (
            <div className="text-xs text-zinc-600 mt-1">{summary.balanceDate}</div>
          )}
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500 mb-1">공매도량</div>
          <div className="text-lg font-bold">
            {summary.shortVolume > 0 ? formatNumber(summary.shortVolume) : "-"}
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            총 {summary.totalVolume > 0 ? formatNumber(summary.totalVolume) : "-"}
          </div>
        </div>
      </div>

      {/* Short Ratio Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6">
        <h3 className="text-base font-semibold mb-4">공매도 비중 추이</h3>
        {volumeHistory.length > 0 ? (
          <ShortRatioChart data={volumeHistory} />
        ) : (
          <div className="text-center py-10 text-zinc-500">데이터가 없습니다.</div>
        )}
      </div>

      {/* Balance Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6">
        <h3 className="text-base font-semibold mb-4">공매도 잔고 추이</h3>
        {balanceHistory.length > 0 ? (
          <BalanceChart data={balanceHistory} />
        ) : (
          <div className="text-center py-10 text-zinc-500">잔고 데이터가 없습니다.</div>
        )}
      </div>
    </>
  );
}
