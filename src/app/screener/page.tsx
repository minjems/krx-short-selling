import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ScreenerClient } from "./ScreenerClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "스크리너 - KRX 공매도",
  description: "공매도 비중, 잔고비율, 시장별 필터로 종목을 검색합니다.",
};

async function getScreenerData() {
  // 최신 거래일
  const { data: latest } = await supabase
    .from("short_volume")
    .select("trade_date")
    .order("trade_date", { ascending: false })
    .limit(1)
    .single();

  if (!latest?.trade_date) return null;

  const tradeDate = latest.trade_date;

  // 공매도 상위 100종목
  const { data: volumeData } = await supabase
    .from("short_volume")
    .select("ticker, total_volume, short_volume, short_ratio, close_price, stocks(name, market)")
    .eq("trade_date", tradeDate)
    .gt("short_ratio", 0)
    .gt("total_volume", 0)
    .order("short_ratio", { ascending: false })
    .limit(200);

  // 최신 잔고일
  const { data: latestBalance } = await supabase
    .from("short_balance")
    .select("trade_date")
    .order("trade_date", { ascending: false })
    .limit(1)
    .single();

  const balanceDate = latestBalance?.trade_date;
  let balanceMap: Record<string, number> = {};

  if (balanceDate && volumeData) {
    const tickers = volumeData.map((r) => r.ticker);
    const { data: balanceData } = await supabase
      .from("short_balance")
      .select("ticker, balance_ratio")
      .eq("trade_date", balanceDate)
      .in("ticker", tickers);

    if (balanceData) {
      for (const b of balanceData) {
        balanceMap[b.ticker] = b.balance_ratio;
      }
    }
  }

  return {
    tradeDate,
    balanceDate: balanceDate || null,
    data: (volumeData || []).map((row) => {
      const stockInfo = row.stocks as unknown as { name: string; market: string } | null;
      return {
        ticker: row.ticker,
        name: stockInfo?.name || "",
        market: stockInfo?.market || "",
        shortVolume: row.short_volume,
        totalVolume: row.total_volume,
        shortRatio: row.short_ratio,
        closePrice: row.close_price,
        balanceRatio: balanceMap[row.ticker] ?? null,
      };
    }),
  };
}

export default async function ScreenerPage() {
  const result = await getScreenerData();

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
            <Link href="/screener" className="text-white">스크리너</Link>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-2">스크리너</h2>
        <p className="text-sm text-zinc-500 mb-6">
          공매도 비중, 잔고비율, 시장별 필터로 종목을 검색합니다.
        </p>

        {result ? (
          <ScreenerClient
            data={result.data}
            tradeDate={result.tradeDate}
            balanceDate={result.balanceDate}
          />
        ) : (
          <div className="text-center py-20 text-zinc-500">
            데이터를 불러올 수 없습니다.
          </div>
        )}
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
