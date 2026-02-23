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

  return {
    title: `${stock.name}(${ticker}) 공매도 현황`,
    description: `${stock.name}(${ticker}) ${stock.market} 공매도 비중, 잔고비율 추이 차트 및 상세 데이터`,
    openGraph: {
      title: `${stock.name}(${ticker}) 공매도 현황 - KRX 공매도`,
      description: `${stock.name} 공매도 비중·잔고비율 추이 차트`,
    },
  };
}

async function getStockData(ticker: string) {
  // 종목 기본 정보
  const { data: stock } = await supabase
    .from("stocks")
    .select("ticker, name, market")
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

  const latestVolume = volumeData && volumeData.length > 0
    ? volumeData[volumeData.length - 1]
    : null;
  const latestBalance = balanceData && balanceData.length > 0
    ? balanceData[balanceData.length - 1]
    : null;

  return {
    stock: { ticker: stock.ticker, name: stock.name, market: stock.market },
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
              <h1 className="text-xl font-bold">KRX 공매도</h1>
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <h1 className="text-xl font-bold">KRX 공매도</h1>
          </Link>
          <nav className="flex gap-4 text-sm text-zinc-400">
            <Link href="/" className="hover:text-white transition-colors">랭킹</Link>
            <Link href="/screener" className="hover:text-white transition-colors">종목 검색</Link>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="text-sm text-zinc-500 mb-6">
          <Link href="/" className="hover:text-zinc-300 transition-colors">랭킹</Link>
          <span className="mx-2">/</span>
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

        {/* Pass all data to client component for charts */}
        <StockDetailClient
          summary={data.summary}
          volumeHistory={data.volumeHistory}
          balanceHistory={data.balanceHistory}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-6 text-xs text-zinc-500 space-y-2">
          <p>데이터 출처: 한국거래소(KRX) | 본 사이트는 투자 권유 목적이 아닙니다.</p>
          <p>공매도 데이터는 참고용이며, 투자 판단의 근거로 사용하지 마십시오. 데이터의 정확성을 보장하지 않습니다.</p>
        </div>
      </footer>
    </div>
  );
}
