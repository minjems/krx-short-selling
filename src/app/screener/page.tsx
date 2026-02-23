import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ScreenerClient } from "./ScreenerClient";
import { AdBanner } from "@/components/AdBanner";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "종목 검색",
  description:
    "공매도 비중, 잔고비율, 투자자별 수급 필터로 종목을 검색합니다. 외국인·기관·개인 순매수대금 기준 정렬 지원.",
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

  // 전체 종목 공매도 거래량 (페이징으로 전부 가져오기)
  const PAGE_SIZE = 1000;
  type VolumeRow = {
    ticker: string;
    total_volume: number;
    short_volume: number;
    short_ratio: number;
    close_price: number;
    stocks: { name: string; market: string } | null;
  };
  const allVolume: VolumeRow[] = [];
  let offset = 0;

  while (true) {
    const { data } = await supabase
      .from("short_volume")
      .select("ticker, total_volume, short_volume, short_ratio, close_price, stocks(name, market)")
      .eq("trade_date", tradeDate)
      .gt("total_volume", 0)
      .order("short_ratio", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (!data || data.length === 0) break;
    for (const row of data) {
      allVolume.push({
        ...row,
        stocks: row.stocks as unknown as { name: string; market: string } | null,
      });
    }
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  // 최신 잔고일
  const { data: latestBalance } = await supabase
    .from("short_balance")
    .select("trade_date")
    .order("trade_date", { ascending: false })
    .limit(1)
    .single();

  const balanceDate = latestBalance?.trade_date;
  const balanceMap: Record<string, number> = {};

  if (balanceDate) {
    let bOffset = 0;
    while (true) {
      const { data: balanceData } = await supabase
        .from("short_balance")
        .select("ticker, balance_ratio")
        .eq("trade_date", balanceDate)
        .range(bOffset, bOffset + PAGE_SIZE - 1);

      if (!balanceData || balanceData.length === 0) break;
      for (const b of balanceData) {
        balanceMap[b.ticker] = b.balance_ratio;
      }
      if (balanceData.length < PAGE_SIZE) break;
      bOffset += PAGE_SIZE;
    }
  }

  // 투자자별 순매수대금 (최신일 기준)
  const { data: latestInv } = await supabase
    .from("investor_trading")
    .select("trade_date")
    .order("trade_date", { ascending: false })
    .limit(1)
    .single();

  const investorDate = latestInv?.trade_date;
  // { ticker: { foreign, institution, individual } }
  const investorMap: Record<string, { foreign: number; institution: number; individual: number }> = {};

  if (investorDate) {
    let iOffset = 0;
    while (true) {
      const { data: invData } = await supabase
        .from("investor_trading")
        .select("ticker, investor_type, net_value")
        .eq("trade_date", investorDate)
        .range(iOffset, iOffset + PAGE_SIZE - 1);

      if (!invData || invData.length === 0) break;
      for (const row of invData) {
        if (!investorMap[row.ticker]) {
          investorMap[row.ticker] = { foreign: 0, institution: 0, individual: 0 };
        }
        if (row.investor_type === "9000") investorMap[row.ticker].foreign = row.net_value;
        else if (row.investor_type === "7050") investorMap[row.ticker].institution = row.net_value;
        else if (row.investor_type === "8000") investorMap[row.ticker].individual = row.net_value;
      }
      if (invData.length < PAGE_SIZE) break;
      iOffset += PAGE_SIZE;
    }
  }

  return {
    tradeDate,
    balanceDate: balanceDate || null,
    investorDate: investorDate || null,
    data: allVolume.map((row) => ({
      ticker: row.ticker,
      name: row.stocks?.name || "",
      market: row.stocks?.market || "",
      shortVolume: row.short_volume,
      totalVolume: row.total_volume,
      shortRatio: row.short_ratio,
      closePrice: row.close_price,
      balanceRatio: balanceMap[row.ticker] ?? null,
      foreignNet: investorMap[row.ticker]?.foreign ?? null,
      institutionNet: investorMap[row.ticker]?.institution ?? null,
      individualNet: investorMap[row.ticker]?.individual ?? null,
    })),
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
            <h1 className="text-xl font-bold">KRX 공매도·수급</h1>
          </Link>
          <nav className="flex gap-4 text-sm text-zinc-400">
            <Link href="/" className="hover:text-white transition-colors">공매도</Link>
            <Link href="/investor" className="hover:text-white transition-colors">수급</Link>
            <Link href="/valuation" className="hover:text-white transition-colors">밸류에이션</Link>
            <Link href="/screener" className="text-white">종목 검색</Link>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-2">종목 검색</h2>
        <p className="text-sm text-zinc-500 mb-6">
          공매도 비중, 잔고비율, 투자자별 수급 필터로 종목을 검색합니다.
        </p>

        <AdBanner position="header" className="mb-6" />

        {result ? (
          <ScreenerClient
            data={result.data}
            tradeDate={result.tradeDate}
            balanceDate={result.balanceDate}
            investorDate={result.investorDate}
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
          <p>공매도 및 수급 데이터는 참고용이며, 투자 판단의 근거로 사용하지 마십시오. 데이터의 정확성을 보장하지 않습니다.</p>
        </div>
      </footer>
    </div>
  );
}
