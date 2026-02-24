import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { StockDetailClient } from "./StockDetailClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ ticker: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ticker } = await params;
  const { data: stock } = await supabase
    .from("stocks")
    .select("name, market")
    .eq("ticker", ticker)
    .single();

  if (!stock) {
    return { title: "종목을 찾을 수 없습니다" };
  }

  const desc = `${stock.name}(${ticker}) ${stock.market} 공매도 비중, 잔고비율, 투자자별 수급 추이 차트 및 상세 데이터`;

  return {
    title: `${stock.name}(${ticker}) 공매도 현황`,
    description: desc,
    openGraph: {
      title: `${stock.name}(${ticker}) 공매도·수급 현황 - KRX 공매도·수급`,
      description: `${stock.name} 공매도 비중·잔고비율·투자자 수급 추이 차트`,
    },
    twitter: {
      card: "summary",
      title: `${stock.name}(${ticker}) 공매도·수급 현황`,
      description: desc,
    },
    alternates: {
      canonical: `/stock/${ticker}`,
    },
  };
}

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
type InvestorFlowData = Record<string, { date: string; netValue: number }[]>;

function generateAnalysis(
  stockName: string,
  volumeHistory: VolumeItem[],
  balanceHistory: BalanceItem[],
  investorHistory: InvestorFlowData,
): string[] {
  const insights: string[] = [];
  if (volumeHistory.length < 2) return insights;

  const latest = volumeHistory[volumeHistory.length - 1];
  const prev = volumeHistory[volumeHistory.length - 2];

  // 공매도 비중 변동
  const ratioDiff = latest.shortRatio - prev.shortRatio;
  if (Math.abs(ratioDiff) >= 0.5) {
    insights.push(
      `${stockName}의 공매도 비중이 전일 대비 ${Math.abs(ratioDiff).toFixed(2)}%p ${ratioDiff > 0 ? "상승" : "하락"}하여 ${latest.shortRatio.toFixed(2)}%를 기록했습니다.`
    );
  }

  // 최근 5일 평균 대비 비교
  if (volumeHistory.length >= 6) {
    const recent5 = volumeHistory.slice(-6, -1);
    const avg5 = recent5.reduce((s, r) => s + r.shortRatio, 0) / recent5.length;
    const diffFromAvg = ((latest.shortRatio - avg5) / avg5) * 100;
    if (Math.abs(diffFromAvg) >= 30) {
      insights.push(
        `최근 5거래일 평균(${avg5.toFixed(2)}%) 대비 ${Math.abs(diffFromAvg).toFixed(0)}% ${diffFromAvg > 0 ? "높은" : "낮은"} 수준입니다.`
      );
    }
  }

  // 90일 내 최고/최저
  const allRatios = volumeHistory.map((r) => r.shortRatio);
  const maxRatio = Math.max(...allRatios);
  const minRatio = Math.min(...allRatios);
  if (latest.shortRatio === maxRatio && volumeHistory.length >= 20) {
    insights.push("현재 공매도 비중은 최근 3개월 중 최고 수준입니다.");
  } else if (latest.shortRatio === minRatio && volumeHistory.length >= 20) {
    insights.push("현재 공매도 비중은 최근 3개월 중 최저 수준입니다.");
  }

  // 잔고비율 추세
  if (balanceHistory.length >= 5) {
    const recentBalance = balanceHistory.slice(-5);
    const increasing = recentBalance.every(
      (b, i) => i === 0 || b.balanceRatio >= recentBalance[i - 1].balanceRatio
    );
    const decreasing = recentBalance.every(
      (b, i) => i === 0 || b.balanceRatio <= recentBalance[i - 1].balanceRatio
    );
    if (increasing) {
      insights.push("공매도 잔고비율이 5거래일 연속 상승하고 있습니다.");
    } else if (decreasing) {
      insights.push("공매도 잔고비율이 5거래일 연속 하락하고 있습니다.");
    }
  }

  // 투자자 수급 연속성
  const investorNames: Record<string, string> = {
    "8000": "외국인",
    "9000": "기관",
    "7050": "개인",
  };
  for (const [code, name] of Object.entries(investorNames)) {
    const flows = investorHistory[code];
    if (!flows || flows.length < 3) continue;
    const recent3 = flows.slice(-3);
    const allBuy = recent3.every((f) => f.netValue > 0);
    const allSell = recent3.every((f) => f.netValue < 0);
    if (allBuy) {
      insights.push(`${name}이 3거래일 연속 순매수 중입니다.`);
    } else if (allSell) {
      insights.push(`${name}이 3거래일 연속 순매도 중입니다.`);
    }
  }

  return insights.slice(0, 4); // 최대 4문장
}

type RelatedStock = {
  ticker: string;
  name: string;
  market: string;
  shortRatio: number;
};

async function getRelatedStocks(
  ticker: string,
  sector: string | null,
  market: string,
): Promise<RelatedStock[]> {
  if (!sector) return [];

  // 같은 업종 종목 중 공매도 비중 상위 (자신 제외)
  const { data: latest } = await supabase
    .from("short_volume")
    .select("trade_date")
    .order("trade_date", { ascending: false })
    .limit(1)
    .single();

  if (!latest) return [];

  const { data: rows } = await supabase
    .from("short_volume")
    .select("ticker, short_ratio, stocks!inner(name, market, sector)")
    .eq("trade_date", latest.trade_date)
    .eq("stocks.sector", sector)
    .neq("ticker", ticker)
    .order("short_ratio", { ascending: false })
    .limit(8);

  if (!rows) return [];

  return rows.map((r) => ({
    ticker: r.ticker,
    name: (r.stocks as unknown as { name: string; market: string }).name,
    market: (r.stocks as unknown as { name: string; market: string }).market,
    shortRatio: r.short_ratio,
  }));
}

async function getStockData(ticker: string) {
  // 종목 기본 정보 (sector 포함)
  const { data: stock } = await supabase
    .from("stocks")
    .select("ticker, name, market, sector")
    .eq("ticker", ticker)
    .single();

  if (!stock) return null;

  // 공매도 거래량 (최근 90일)
  const { data: volumeData } = await supabase
    .from("short_volume")
    .select("trade_date, total_volume, short_volume, short_ratio, close_price")
    .eq("ticker", ticker)
    .order("trade_date", { ascending: true })
    .limit(90);

  // 공매도 잔고 (최근 90일)
  const { data: balanceData } = await supabase
    .from("short_balance")
    .select("trade_date, balance_quantity, balance_amount, balance_ratio")
    .eq("ticker", ticker)
    .order("trade_date", { ascending: true })
    .limit(90);

  // 투자자별 매매동향 (최근 90일 x 3 투자자)
  const { data: investorData } = await supabase
    .from("investor_trading")
    .select("trade_date, investor_type, net_value, net_volume, buy_value, sell_value")
    .eq("ticker", ticker)
    .order("trade_date", { ascending: true })
    .limit(270);

  // 밸류에이션 (최신 1건)
  const { data: valuationData } = await supabase
    .from("stock_valuation")
    .select("trade_date, per, pbr, eps, bps, dps, dvd_yld")
    .eq("ticker", ticker)
    .not("per", "is", null)
    .order("trade_date", { ascending: false })
    .limit(1)
    .single();

  // 업종 평균 PER/PBR (같은 업종, 같은 거래일)
  let sectorAvg: { avgPer: number; avgPbr: number; sector: string } | null = null;
  if (stock.sector && valuationData) {
    // 같은 업종 종목들의 밸류에이션 조회
    const { data: sectorRows } = await supabase
      .from("stock_valuation")
      .select("per, pbr, stocks!inner(sector)")
      .eq("trade_date", valuationData.trade_date)
      .eq("stocks.sector", stock.sector);

    if (sectorRows && sectorRows.length >= 3) {
      const validPers = sectorRows
        .map((r) => r.per)
        .filter((p): p is number => p !== null && p > 0 && p < 200);
      const validPbrs = sectorRows
        .map((r) => r.pbr)
        .filter((p): p is number => p !== null && p > 0 && p < 20);

      if (validPers.length >= 3 || validPbrs.length >= 3) {
        sectorAvg = {
          avgPer:
            validPers.length >= 3
              ? validPers.reduce((a, c) => a + c, 0) / validPers.length
              : 0,
          avgPbr:
            validPbrs.length >= 3
              ? validPbrs.reduce((a, c) => a + c, 0) / validPbrs.length
              : 0,
          sector: stock.sector,
        };
      }
    }
  }

  // 재무제표 데이터 (최신 1건)
  let financialData: {
    roe: number | null;
    debtRatio: number | null;
    operatingMargin: number | null;
    revenueGrowth: number | null;
    cashFromOps: number | null;
  } | null = null;

  try {
    const { data: finRow } = await supabase
      .from("stock_financial")
      .select("roe, debt_ratio, operating_margin, revenue_growth, cash_from_operations")
      .eq("ticker", ticker)
      .order("fiscal_year", { ascending: false })
      .order("reprt_code", { ascending: false })
      .limit(1)
      .single();

    if (finRow) {
      financialData = {
        roe: finRow.roe,
        debtRatio: finRow.debt_ratio,
        operatingMargin: finRow.operating_margin,
        revenueGrowth: finRow.revenue_growth,
        cashFromOps: finRow.cash_from_operations,
      };
    }
  } catch {
    // stock_financial 테이블 없으면 무시
  }

  const latestVolume = volumeData && volumeData.length > 0
    ? volumeData[volumeData.length - 1]
    : null;
  const latestBalance = balanceData && balanceData.length > 0
    ? balanceData[balanceData.length - 1]
    : null;

  return {
    stock: { ticker: stock.ticker, name: stock.name, market: stock.market, sector: stock.sector },
    summary: {
      closePrice: latestVolume?.close_price || 0,
      shortRatio: latestVolume?.short_ratio || 0,
      shortVolume: latestVolume?.short_volume || 0,
      totalVolume: latestVolume?.total_volume || 0,
      balanceRatio: latestBalance?.balance_ratio || 0,
      balanceQuantity: latestBalance?.balance_quantity || 0,
      volumeDate: latestVolume?.trade_date || null,
      balanceDate: latestBalance?.trade_date || null,
    },
    volumeHistory: (volumeData || []).map((row) => ({
      date: row.trade_date,
      totalVolume: row.total_volume,
      shortVolume: row.short_volume,
      shortRatio: row.short_ratio,
      closePrice: row.close_price,
    })),
    balanceHistory: (balanceData || []).map((row) => ({
      date: row.trade_date,
      balanceQuantity: row.balance_quantity,
      balanceAmount: row.balance_amount,
      balanceRatio: row.balance_ratio,
    })),
    investorHistory: (() => {
      const byType: Record<string, { date: string; netValue: number }[]> = {
        "8000": [], "9000": [], "7050": [],
      };
      for (const row of (investorData || [])) {
        byType[row.investor_type]?.push({
          date: row.trade_date,
          netValue: row.net_value,
        });
      }
      return byType;
    })(),
    valuation: valuationData
      ? {
          tradeDate: valuationData.trade_date,
          per: valuationData.per,
          pbr: valuationData.pbr,
          eps: valuationData.eps,
          bps: valuationData.bps,
          dps: valuationData.dps,
          dvdYld: valuationData.dvd_yld,
        }
      : null,
    sectorAvg,
    financialData,
    analysis: generateAnalysis(
      stock.name,
      (volumeData || []).map((row) => ({
        date: row.trade_date,
        totalVolume: row.total_volume,
        shortVolume: row.short_volume,
        shortRatio: row.short_ratio,
        closePrice: row.close_price,
      })),
      (balanceData || []).map((row) => ({
        date: row.trade_date,
        balanceQuantity: row.balance_quantity,
        balanceAmount: row.balance_amount,
        balanceRatio: row.balance_ratio,
      })),
      (() => {
        const byType: Record<string, { date: string; netValue: number }[]> = {
          "8000": [], "9000": [], "7050": [],
        };
        for (const row of (investorData || [])) {
          byType[row.investor_type]?.push({
            date: row.trade_date,
            netValue: row.net_value,
          });
        }
        return byType;
      })(),
    ),
    relatedStocks: await getRelatedStocks(ticker, stock.sector, stock.market),
  };
}

export default async function StockPage({ params }: PageProps) {
  const { ticker } = await params;
  const data = await getStockData(ticker);

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <h1 className="text-xl font-bold">KRX 공매도·수급</h1>
            </Link>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-20 text-center">
          <p className="text-zinc-500 text-lg">종목을 찾을 수 없습니다.</p>
          <Link href="/" className="text-blue-400 hover:underline mt-4 inline-block">
            메인으로 돌아가기
          </Link>
        </main>
      </div>
    );
  }

  // Dataset 구조화 데이터 (JSON-LD)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${data.stock.name}(${ticker}) 공매도·수급 데이터`,
    description: `${data.stock.name} ${data.stock.market} 공매도 비중, 잔고비율, 투자자별 수급 추이 데이터`,
    url: `https://krx-short-selling.vercel.app/stock/${ticker}`,
    keywords: [
      `${data.stock.name} 공매도`,
      `${ticker} 공매도`,
      `${data.stock.name} 수급`,
      "공매도 비중",
      "공매도 잔고",
    ],
    creator: {
      "@type": "Organization",
      name: "KRX 공매도·수급",
      url: "https://krx-short-selling.vercel.app",
    },
    distribution: {
      "@type": "DataDownload",
      encodingFormat: "text/html",
      contentUrl: `https://krx-short-selling.vercel.app/stock/${ticker}`,
    },
    temporalCoverage: data.summary.volumeDate
      ? `../${data.summary.volumeDate}`
      : undefined,
    isAccessibleForFree: true,
    license: "https://krx-short-selling.vercel.app",
  };

  // BreadcrumbList 구조화 데이터
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "공매도 랭킹",
        item: "https://krx-short-selling.vercel.app",
      },
      ...(data.stock.sector
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: data.stock.sector,
              item: `https://krx-short-selling.vercel.app/sectors/${encodeURIComponent(data.stock.sector)}`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: data.stock.name,
              item: `https://krx-short-selling.vercel.app/stock/${ticker}`,
            },
          ]
        : [
            {
              "@type": "ListItem",
              position: 2,
              name: data.stock.name,
              item: `https://krx-short-selling.vercel.app/stock/${ticker}`,
            },
          ]),
    ],
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <h1 className="text-xl font-bold">KRX 공매도·수급</h1>
          </Link>
          <nav className="flex gap-4 text-sm text-zinc-400">
            <Link href="/" className="hover:text-white transition-colors">공매도</Link>
            <Link href="/investor" className="hover:text-white transition-colors">수급</Link>
            <Link href="/valuation" className="hover:text-white transition-colors">저·고평가</Link>
            <Link href="/screener" className="hover:text-white transition-colors">종목 검색</Link>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="text-sm text-zinc-500 mb-6">
          <Link href="/" className="hover:text-zinc-300 transition-colors">공매도</Link>
          <span className="mx-2">/</span>
          {data.stock.sector && (
            <>
              <Link href={`/sectors/${encodeURIComponent(data.stock.sector)}`} className="hover:text-zinc-300 transition-colors">
                {data.stock.sector}
              </Link>
              <span className="mx-2">/</span>
            </>
          )}
          <span className="text-zinc-300">{data.stock.name}</span>
        </div>

        {/* Stock Header */}
        <div className="flex items-start gap-3 mb-8">
          <div>
            <h2 className="text-2xl font-bold">{data.stock.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-zinc-400 font-mono">{data.stock.ticker}</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  data.stock.market === "KOSPI"
                    ? "bg-blue-900/30 text-blue-400"
                    : "bg-purple-900/30 text-purple-400"
                }`}
              >
                {data.stock.market}
              </span>
            </div>
          </div>
        </div>

        {/* Auto Analysis (server-rendered for SEO) */}
        {data.analysis.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-6 mb-8">
            <h3 className="text-base font-semibold mb-3">종목 분석 요약</h3>
            <ul className="space-y-2">
              {data.analysis.map((text, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300 leading-relaxed">
                  <span className="text-zinc-500 mt-0.5 shrink-0">&#8226;</span>
                  {text}
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-zinc-600 mt-3">
              {data.summary.volumeDate} 기준 자동 생성 분석입니다. 투자 판단의 근거로 사용하지 마십시오.
            </p>
          </div>
        )}

        {/* Pass all data to client component for charts */}
        <StockDetailClient
          summary={data.summary}
          volumeHistory={data.volumeHistory}
          balanceHistory={data.balanceHistory}
          investorHistory={data.investorHistory}
          valuation={data.valuation}
          sectorAvg={data.sectorAvg}
          financialData={data.financialData}
          sector={data.stock.sector}
        />

        {/* Related Stocks (same sector) */}
        {data.relatedStocks.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-6 mt-6">
            <h3 className="text-base font-semibold mb-4">
              같은 업종 ({data.stock.sector}) 종목
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {data.relatedStocks.map((rs) => (
                <Link
                  key={rs.ticker}
                  href={`/stock/${rs.ticker}`}
                  className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 hover:border-zinc-600 transition-colors"
                >
                  <div className="text-sm font-medium text-zinc-200 truncate">{rs.name}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-zinc-500 font-mono">{rs.ticker}</span>
                    <span className={`text-xs font-medium ${
                      rs.shortRatio >= 10
                        ? "text-red-400"
                        : rs.shortRatio >= 5
                        ? "text-yellow-400"
                        : "text-zinc-400"
                    }`}>
                      {rs.shortRatio.toFixed(1)}%
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-6 text-xs text-zinc-500 space-y-2">
          <p>데이터 출처: 한국거래소(KRX), DART | 본 사이트는 투자 권유 목적이 아닙니다.</p>
          <p>공매도 및 수급 데이터는 참고용이며, 투자 판단의 근거로 사용하지 마십시오. 데이터의 정확성을 보장하지 않습니다.</p>
        </div>
      </footer>
    </div>
  );
}
