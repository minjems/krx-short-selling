"use client";

import { ShortRatioChart } from "@/components/ShortRatioChart";
import { BalanceChart } from "@/components/BalanceChart";
import { InvestorFlowChart } from "@/components/InvestorFlowChart";
import { AdBanner } from "@/components/AdBanner";
import {
  perColor,
  pbrColor,
  dvdYldColor,
  formatPer,
  formatPbr,
} from "@/lib/format";

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

type InvestorFlowData = Record<string, { date: string; netValue: number }[]>;

type ValuationData = {
  tradeDate: string;
  per: number | null;
  pbr: number | null;
  eps: number | null;
  bps: number | null;
  dps: number | null;
  dvdYld: number | null;
};

export function StockDetailClient({
  summary,
  volumeHistory,
  balanceHistory,
  investorHistory,
  valuation,
}: {
  summary: Summary;
  volumeHistory: VolumeItem[];
  balanceHistory: BalanceItem[];
  investorHistory?: InvestorFlowData;
  valuation?: ValuationData | null;
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

      {/* Valuation Card */}
      {valuation && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold">밸류에이션</h3>
            <span className="text-xs text-zinc-500">{valuation.tradeDate}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-xs text-zinc-500 mb-1">PER</div>
              <div className={`text-lg font-bold ${perColor(valuation.per)}`}>
                {formatPer(valuation.per)}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">PBR</div>
              <div className={`text-lg font-bold ${pbrColor(valuation.pbr)}`}>
                {formatPbr(valuation.pbr)}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">EPS</div>
              <div className="text-lg font-bold text-zinc-300">
                {valuation.eps !== null
                  ? `${formatNumber(valuation.eps)}원`
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">BPS</div>
              <div className="text-lg font-bold text-zinc-300">
                {valuation.bps !== null
                  ? `${formatNumber(valuation.bps)}원`
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">배당수익률</div>
              <div
                className={`text-lg font-bold ${dvdYldColor(valuation.dvdYld)}`}
              >
                {valuation.dvdYld !== null && valuation.dvdYld > 0
                  ? `${valuation.dvdYld.toFixed(2)}%`
                  : "-"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Short Ratio Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6">
        <h3 className="text-base font-semibold mb-4">공매도 비중 추이</h3>
        {volumeHistory.length > 0 ? (
          <ShortRatioChart data={volumeHistory} />
        ) : (
          <div className="text-center py-10 text-zinc-500">데이터가 없습니다.</div>
        )}
      </div>

      {/* Ad between charts */}
      <AdBanner position="content" className="mb-6" />

      {/* Balance Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6">
        <h3 className="text-base font-semibold mb-4">공매도 잔고 추이</h3>
        {balanceHistory.length > 0 ? (
          <BalanceChart data={balanceHistory} />
        ) : (
          <div className="text-center py-10 text-zinc-500">잔고 데이터가 없습니다.</div>
        )}
      </div>

      {/* Investor Flow Chart */}
      {investorHistory && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6">
          <h3 className="text-base font-semibold mb-4">투자자별 수급 추이</h3>
          <InvestorFlowChart data={investorHistory} />
        </div>
      )}
    </>
  );
}
