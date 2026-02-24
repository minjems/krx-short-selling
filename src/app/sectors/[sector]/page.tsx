import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ sector: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { sector } = await params;
  const decoded = decodeURIComponent(sector);

  return {
    title: `${decoded} 업종 공매도 현황`,
    description: `${decoded} 업종 소속 종목의 공매도 비중, 잔고비율 랭킹. 업종 내 공매도 상위 종목과 투자자 수급 현황을 확인하세요.`,
    openGraph: {
      title: `${decoded} 업종 공매도 현황 - KRX 공매도·수급`,
      description: `${decoded} 업종 공매도 비중 랭킹 및 수급 현황`,
    },
    twitter: {
      card: "summary",
      title: `${decoded} 업종 공매도 현황`,
      description: `${decoded} 업종 소속 종목의 공매도 비중, 잔고비율 랭킹`,
    },
    alternates: {
      canonical: `/sectors/${sector}`,
    },
  };
}

type SectorStock = {
  ticker: string;
  name: string;
  market: string;
  shortRatio: number;
  closePrice: number;
  balanceRatio: number;
};

async function getSectorData(sector: string): Promise<{
  stocks: SectorStock[];
  tradeDate: string | null;
  avgShortRatio: number;
} | null> {
  const decoded = decodeURIComponent(sector);

  // 최신 거래일
  const { data: latest } = await supabase
    .from("short_volume")
    .select("trade_date")
    .order("trade_date", { ascending: false })
    .limit(1)
    .single();

  if (!latest) return null;

  // 해당 업종 종목의 공매도 데이터
  const { data: rows } = await supabase
    .from("short_volume")
    .select("ticker, short_ratio, close_price, stocks!inner(name, market, sector)")
    .eq("trade_date", latest.trade_date)
    .eq("stocks.sector", decoded)
    .order("short_ratio", { ascending: false });

  if (!rows || rows.length === 0) return null;

  // 잔고 데이터도 가져오기
  const tickers = rows.map((r) => r.ticker);
  const { data: balanceRows } = await supabase
    .from("short_balance")
    .select("ticker, balance_ratio")
    .in("ticker", tickers)
    .order("trade_date", { ascending: false });

  // 종목별 최신 잔고비율 매핑 (중복 제거: 첫 번째가 최신)
  const balanceMap: Record<string, number> = {};
  for (const b of balanceRows || []) {
    if (!(b.ticker in balanceMap)) {
      balanceMap[b.ticker] = b.balance_ratio;
    }
  }

  const stocks: SectorStock[] = rows.map((r) => ({
    ticker: r.ticker,
    name: (r.stocks as unknown as { name: string; market: string }).name,
    market: (r.stocks as unknown as { name: string; market: string }).market,
    shortRatio: r.short_ratio,
    closePrice: r.close_price,
    balanceRatio: balanceMap[r.ticker] ?? 0,
  }));

  const avgShortRatio =
    stocks.reduce((s, r) => s + r.shortRatio, 0) / stocks.length;

  return {
    stocks,
    tradeDate: latest.trade_date,
    avgShortRatio,
  };
}

async function getAllSectors(): Promise<string[]> {
  const { data } = await supabase
    .from("stocks")
    .select("sector")
    .not("sector", "is", null);

  if (!data) return [];
  return [...new Set(data.map((r) => r.sector as string))].sort();
}

function formatNumber(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function ratioColor(ratio: number): string {
  if (ratio >= 20) return "text-red-400";
  if (ratio >= 10) return "text-orange-400";
  if (ratio >= 5) return "text-yellow-400";
  return "text-zinc-100";
}

export default async function SectorPage({ params }: PageProps) {
  const { sector } = await params;
  const decoded = decodeURIComponent(sector);
  const [data, allSectors] = await Promise.all([
    getSectorData(sector),
    getAllSectors(),
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
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

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="text-sm text-zinc-500 mb-6">
          <Link href="/" className="hover:text-zinc-300 transition-colors">공매도</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">{decoded}</span>
        </div>

        <h2 className="text-2xl font-bold mb-2">{decoded} 업종</h2>

        {data ? (
          <>
            {/* Summary */}
            <div className="flex items-center gap-4 mb-6 text-sm text-zinc-400">
              <span>{data.tradeDate} 기준</span>
              <span>종목 수: {data.stocks.length}개</span>
              <span>업종 평균 공매도 비중: <span className={ratioColor(data.avgShortRatio)}>{data.avgShortRatio.toFixed(2)}%</span></span>
            </div>

            {/* Analysis text for SEO */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-zinc-300 leading-relaxed">
                {decoded} 업종에는 총 {data.stocks.length}개 종목이 상장되어 있으며,
                업종 평균 공매도 비중은 {data.avgShortRatio.toFixed(2)}%입니다.
                {data.stocks.length > 0 && ` 공매도 비중이 가장 높은 종목은 ${data.stocks[0].name}(${data.stocks[0].shortRatio.toFixed(2)}%)이며`}
                {data.stocks.length > 1 && `, ${data.stocks[1].name}(${data.stocks[1].shortRatio.toFixed(2)}%)이 뒤를 잇고 있습니다.`}
                {data.avgShortRatio >= 5
                  ? " 업종 전체적으로 공매도 활동이 활발한 편입니다."
                  : " 업종 전체적으로 공매도 활동이 비교적 낮은 수준입니다."}
              </p>
            </div>

            {/* Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 text-xs">
                      <th className="text-left py-3 px-4">#</th>
                      <th className="text-left py-3 px-4">종목</th>
                      <th className="text-right py-3 px-4">종가</th>
                      <th className="text-right py-3 px-4">공매도 비중</th>
                      <th className="text-right py-3 px-4">잔고비율</th>
                      <th className="text-right py-3 px-4">시장</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stocks.map((stock, i) => (
                      <tr
                        key={stock.ticker}
                        className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="py-3 px-4 text-zinc-500">{i + 1}</td>
                        <td className="py-3 px-4">
                          <Link
                            href={`/stock/${stock.ticker}`}
                            className="hover:text-blue-400 transition-colors"
                          >
                            <div className="font-medium">{stock.name}</div>
                            <div className="text-xs text-zinc-500 font-mono">{stock.ticker}</div>
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {stock.closePrice > 0 ? `${formatNumber(stock.closePrice)}원` : "-"}
                        </td>
                        <td className={`py-3 px-4 text-right font-bold ${ratioColor(stock.shortRatio)}`}>
                          {stock.shortRatio.toFixed(2)}%
                        </td>
                        <td className={`py-3 px-4 text-right ${ratioColor(stock.balanceRatio)}`}>
                          {stock.balanceRatio > 0 ? `${stock.balanceRatio.toFixed(2)}%` : "-"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              stock.market === "KOSPI"
                                ? "bg-blue-900/30 text-blue-400"
                                : "bg-purple-900/30 text-purple-400"
                            }`}
                          >
                            {stock.market}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-zinc-500">
            해당 업종의 데이터를 찾을 수 없습니다.
          </div>
        )}

        {/* Other Sectors Navigation */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-6">
          <h3 className="text-base font-semibold mb-4">다른 업종 보기</h3>
          <div className="flex flex-wrap gap-2">
            {allSectors.map((s) => (
              <Link
                key={s}
                href={`/sectors/${encodeURIComponent(s)}`}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  s === decoded
                    ? "bg-blue-900/40 border-blue-700 text-blue-300"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                }`}
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
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
