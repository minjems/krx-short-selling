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
  upsideBgColor,
  formatUpside,
  formatFairValue,
  formatBillions,
  qualityGrade,
  qualityGradeBadgeColor,
  qualityGradeColor,
  roeColor,
  operatingMarginColor,
  debtRatioColor,
  revenueGrowthColor,
} from "@/lib/format";
import { Tooltip } from "@/components/Tooltip";
import { calcFairValue } from "@/lib/fairValue";
import type { FinancialData } from "@/lib/fairValue";

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

type SectorAvgData = {
  avgPer: number;
  avgPbr: number;
  sector: string;
} | null;

type FinancialDataProp = {
  roe: number | null;
  debtRatio: number | null;
  operatingMargin: number | null;
  revenueGrowth: number | null;
  cashFromOps: number | null;
} | null;

function FairValueGaugeBar({ upsidePct }: { upsidePct: number }) {
  const ratio = 1 / (1 + upsidePct / 100);
  const fillPct = Math.max(5, Math.min(100, ratio * 100));
  const barColor =
    upsidePct >= 20
      ? "bg-green-500"
      : upsidePct > 0
      ? "bg-green-600"
      : upsidePct > -20
      ? "bg-red-500"
      : "bg-red-600";

  return (
    <div className="w-full">
      <div className="w-full h-3 bg-zinc-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${fillPct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
        <span>0</span>
        <span>적정가</span>
      </div>
    </div>
  );
}

export function StockDetailClient({
  summary,
  volumeHistory,
  balanceHistory,
  investorHistory,
  valuation,
  sectorAvg,
  financialData,
  sector,
}: {
  summary: Summary;
  volumeHistory: VolumeItem[];
  balanceHistory: BalanceItem[];
  investorHistory?: InvestorFlowData;
  valuation?: ValuationData | null;
  sectorAvg?: SectorAvgData;
  financialData?: FinancialDataProp;
  sector?: string | null;
}) {
  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <Tooltip text="해당 거래일의 마지막 체결 가격.">
            <span className="text-xs text-zinc-500">종가</span>
          </Tooltip>
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
          <Tooltip text="전체 거래량 중 공매도가 차지하는 비율. 높을수록 하락 베팅이 많음.">
            <span className="text-xs text-zinc-500">공매도 비중</span>
          </Tooltip>
          <div className={`text-lg font-bold ${ratioColor(summary.shortRatio)}`}>
            {summary.shortRatio.toFixed(2)}%
          </div>
          {summary.volumeDate && (
            <div className="text-xs text-zinc-600 mt-1">{summary.volumeDate}</div>
          )}
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <Tooltip text="상장주식수 대비 공매도 미상환 잔고 비율. 높을수록 숏 포지션이 많이 쌓여 있음.">
            <span className="text-xs text-zinc-500">잔고비율</span>
          </Tooltip>
          <div className={`text-lg font-bold ${ratioColor(summary.balanceRatio)}`}>
            {summary.balanceRatio.toFixed(2)}%
          </div>
          {summary.balanceDate && (
            <div className="text-xs text-zinc-600 mt-1">{summary.balanceDate}</div>
          )}
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <Tooltip text="해당 거래일에 공매도로 체결된 주식 수량.">
            <span className="text-xs text-zinc-500">공매도량</span>
          </Tooltip>
          <div className="text-lg font-bold">
            {summary.shortVolume > 0 ? formatNumber(summary.shortVolume) : "-"}
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            총 {summary.totalVolume > 0 ? formatNumber(summary.totalVolume) : "-"}
          </div>
        </div>
      </div>

      {/* Fair Value Hero + Valuation Card */}
      {valuation && (() => {
        const fin: FinancialData | null = financialData
          ? {
              roe: financialData.roe,
              debtRatio: financialData.debtRatio,
              operatingMargin: financialData.operatingMargin,
              revenueGrowth: financialData.revenueGrowth,
              cashFromOps: financialData.cashFromOps,
            }
          : null;

        const fv = sectorAvg
          ? calcFairValue(
              valuation.eps,
              valuation.bps,
              summary.closePrice,
              { avgPer: sectorAvg.avgPer, avgPbr: sectorAvg.avgPbr, count: 0 },
              fin,
              sector
            )
          : null;

        const grade = fv && fv.qualityScore >= 0
          ? qualityGrade(fv.qualityMultiplier)
          : null;
        const hasQuality = fv && fv.qualityScore >= 0;

        return (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden mb-8">
            {/* Hero section */}
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold">적정가 분석</h3>
                  {grade && (
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${qualityGradeBadgeColor(grade)}`}>
                      품질 {grade}
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-500">{valuation.tradeDate}</span>
              </div>

              {fv ? (
                <>
                  {/* Price comparison */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">현재가</div>
                      <div className="text-xl sm:text-2xl font-bold text-zinc-200">
                        {formatNumber(summary.closePrice)}원
                      </div>
                    </div>
                    <div className="text-zinc-600 text-2xl px-4">&rarr;</div>
                    <div className="text-right">
                      <div className="text-xs text-zinc-500 mb-1">
                        {hasQuality ? "품질 조정 적정가" : "업종 기반 적정가"}
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-zinc-200">
                        {formatFairValue(fv.fairValue)}
                      </div>
                    </div>
                  </div>

                  {/* Gauge */}
                  <div className="mb-4">
                    <FairValueGaugeBar upsidePct={fv.upsidePct} />
                  </div>

                  {/* Upside badge */}
                  <div className="text-center mb-4">
                    <span
                      className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${upsideBgColor(
                        fv.upsidePct
                      )}`}
                    >
                      {formatUpside(fv.upsidePct, fv.fairValue, summary.closePrice)}
                    </span>
                  </div>

                  {/* Sector info */}
                  {sectorAvg && (
                    <div className="text-xs text-zinc-500 text-center">
                      업종: {sectorAvg.sector}
                      {sectorAvg.avgPer > 0 && ` (평균 PER ${sectorAvg.avgPer.toFixed(1)}`}
                      {sectorAvg.avgPer > 0 && sectorAvg.avgPbr > 0 && `, PBR ${sectorAvg.avgPbr.toFixed(2)}`}
                      {sectorAvg.avgPer > 0 && ")"}
                      {sectorAvg.avgPer === 0 && sectorAvg.avgPbr > 0 && ` (평균 PBR ${sectorAvg.avgPbr.toFixed(2)})`}
                      {hasQuality && ` · 품질 배수 ${fv.qualityMultiplier.toFixed(2)}x`}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4 text-sm text-zinc-500">
                  {!sectorAvg
                    ? "업종 정보가 없어 적정가를 산정할 수 없습니다."
                    : "적정가 산정 불가 (EPS/BPS 데이터 부족)"}
                </div>
              )}
            </div>

            {/* Financial Health Section */}
            {financialData && (financialData.roe !== null || financialData.debtRatio !== null ||
              financialData.operatingMargin !== null || financialData.revenueGrowth !== null) && (
              <div className="border-t border-zinc-800 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-zinc-300">재무 건전성</h4>
                  {grade && (
                    <span className={`text-xs px-2 py-0.5 rounded border ${qualityGradeColor(grade)}`}>
                      품질 등급 {grade}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Tooltip text="자기자본이익률. 자기자본 대비 순이익 비율. 높을수록 주주 자본을 효율적으로 활용.">
                      <span className="text-xs text-zinc-500">ROE</span>
                    </Tooltip>
                    <div className={`text-lg font-bold ${roeColor(financialData.roe)}`}>
                      {financialData.roe !== null ? `${financialData.roe.toFixed(1)}%` : "-"}
                    </div>
                  </div>
                  <div>
                    <Tooltip text="매출액 대비 영업이익 비율. 높을수록 본업의 수익성이 좋음.">
                      <span className="text-xs text-zinc-500">영업이익률</span>
                    </Tooltip>
                    <div className={`text-lg font-bold ${operatingMarginColor(financialData.operatingMargin)}`}>
                      {financialData.operatingMargin !== null ? `${financialData.operatingMargin.toFixed(1)}%` : "-"}
                    </div>
                  </div>
                  <div>
                    <Tooltip text="자기자본 대비 부채 비율. 낮을수록 재무 안정성이 높음. 200% 이상이면 주의.">
                      <span className="text-xs text-zinc-500">부채비율</span>
                    </Tooltip>
                    <div className={`text-lg font-bold ${debtRatioColor(financialData.debtRatio)}`}>
                      {financialData.debtRatio !== null ? `${financialData.debtRatio.toFixed(1)}%` : "-"}
                    </div>
                  </div>
                  <div>
                    <Tooltip text="전년 대비 매출액 증가율. 양수면 성장, 음수면 역성장.">
                      <span className="text-xs text-zinc-500">매출성장률</span>
                    </Tooltip>
                    <div className={`text-lg font-bold ${revenueGrowthColor(financialData.revenueGrowth)}`}>
                      {financialData.revenueGrowth !== null
                        ? `${financialData.revenueGrowth > 0 ? "+" : ""}${financialData.revenueGrowth.toFixed(1)}%`
                        : "-"}
                    </div>
                  </div>
                </div>
                {financialData.cashFromOps !== null && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/50">
                    <Tooltip text="영업활동으로 실제 벌어들인 현금. 양수면 현금 창출력이 있음.">
                      <span className="text-xs text-zinc-500">영업현금흐름:</span>
                    </Tooltip>
                    <span className={`text-sm font-medium ml-1 ${financialData.cashFromOps > 0 ? "text-green-400" : "text-red-400"}`}>
                      {formatBillions(financialData.cashFromOps)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Divider + Valuation Metrics */}
            <div className="border-t border-zinc-800 p-4 sm:p-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <Tooltip text="주가수익비율. 주가를 주당순이익(EPS)으로 나눈 값. 낮을수록 이익 대비 저평가 가능성.">
                    <span className="text-xs text-zinc-500">PER</span>
                  </Tooltip>
                  <div className={`text-lg font-bold ${perColor(valuation.per)}`}>
                    {formatPer(valuation.per)}
                  </div>
                </div>
                <div>
                  <Tooltip text="주가순자산비율. 주가를 주당순자산(BPS)으로 나눈 값. 1 미만이면 자산 대비 저평가 가능성.">
                    <span className="text-xs text-zinc-500">PBR</span>
                  </Tooltip>
                  <div className={`text-lg font-bold ${pbrColor(valuation.pbr)}`}>
                    {formatPbr(valuation.pbr)}
                  </div>
                </div>
                <div>
                  <Tooltip text="주당순이익. 순이익을 발행주식수로 나눈 값. 높을수록 수익성이 좋음.">
                    <span className="text-xs text-zinc-500">EPS</span>
                  </Tooltip>
                  <div className="text-lg font-bold text-zinc-300">
                    {valuation.eps !== null
                      ? `${formatNumber(valuation.eps)}원`
                      : "-"}
                  </div>
                </div>
                <div>
                  <Tooltip text="주당순자산. 순자산을 발행주식수로 나눈 값. 기업 청산 시 주당 받을 수 있는 금액.">
                    <span className="text-xs text-zinc-500">BPS</span>
                  </Tooltip>
                  <div className="text-lg font-bold text-zinc-300">
                    {valuation.bps !== null
                      ? `${formatNumber(valuation.bps)}원`
                      : "-"}
                  </div>
                </div>
                <div>
                  <Tooltip text="주당 배당금을 현재 주가로 나눈 비율. 높을수록 배당 투자 매력이 큼.">
                    <span className="text-xs text-zinc-500">배당수익률</span>
                  </Tooltip>
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

            {/* Disclaimer */}
            <div className="border-t border-zinc-800/50 px-4 py-2 sm:px-6">
              <p className="text-[10px] text-zinc-600">
                {financialData ? "품질 조정 적정가는" : "적정가는"} 업종 평균 PER·PBR{financialData ? " 및 재무 건전성" : ""} 기반 참고치이며, 투자 판단의 근거로 사용하지 마십시오.
              </p>
            </div>
          </div>
        );
      })()}

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
