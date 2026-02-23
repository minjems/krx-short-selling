import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { InvestorRankingClient } from "./InvestorRankingClient";
import { AdBanner } from "@/components/AdBanner";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "투자자별 수급 랭킹",
  description:
    "코스피·코스닥 외국인, 기관, 개인 순매수·순매도 상위 종목 랭킹. 1일/5일/20일 기간별 투자자 수급 데이터.",
};

type RankingItem = {
  ticker: string;
  name: string;
  market: string;
  net_value: number;
  net_volume: number;
  buy_value: number;
  sell_value: number;
};

async function getInitialData(): Promise<{
  date: string | null;
  data: RankingItem[];
} | null> {
  try {
    // 최신 거래일
    const { data: dateData } = await supabase
      .from("investor_trading")
      .select("trade_date")
      .order("trade_date", { ascending: false })
      .limit(1)
      .single();

    if (!dateData?.trade_date) return null;

    // 기본: 외국인 1일 순매수 top 50
    const { data, error } = await supabase.rpc("get_investor_ranking", {
      p_investor_type: "9000",
      p_period: 1,
      p_market: "ALL",
      p_direction: "buy",
      p_limit: 50,
    });

    if (error) return null;

    return { date: dateData.trade_date, data: data || [] };
  } catch {
    return null;
  }
}

export default async function InvestorPage() {
  const initial = await getInitialData();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <h1 className="text-xl font-bold">KRX 공매도·수급</h1>
          </Link>
          <nav className="flex gap-4 text-sm text-zinc-400">
            <Link
              href="/"
              className="hover:text-white transition-colors"
            >
              공매도
            </Link>
            <Link href="/investor" className="text-white">
              수급
            </Link>
            <Link
              href="/screener"
              className="hover:text-white transition-colors"
            >
              종목 검색
            </Link>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Date Badge */}
        {initial?.date && (
          <div className="mb-6">
            <span className="text-sm text-zinc-400">기준일</span>
            <span className="ml-2 text-sm font-mono bg-zinc-800 px-2 py-1 rounded">
              {initial.date}
            </span>
          </div>
        )}

        {/* Ad */}
        <AdBanner position="header" className="mb-6" />

        {/* Title */}
        <h2 className="text-2xl font-bold mb-6">투자자별 수급 랭킹</h2>

        {/* Client */}
        {initial ? (
          <InvestorRankingClient
            initialData={initial.data}
            latestDate={initial.date}
          />
        ) : (
          <div className="text-center py-20 text-zinc-500">
            데이터를 불러올 수 없습니다.
          </div>
        )}
      </main>

      {/* Footer Ad */}
      <div className="max-w-6xl mx-auto px-4 mt-8">
        <AdBanner position="footer" />
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-8">
        <div className="max-w-6xl mx-auto px-4 py-6 text-xs text-zinc-500 space-y-2">
          <p>
            데이터 출처: 한국거래소(KRX) | 본 사이트는 투자 권유 목적이
            아닙니다.
          </p>
          <p>
            공매도 및 수급 데이터는 참고용이며, 투자 판단의 근거로 사용하지
            마십시오. 데이터의 정확성을 보장하지 않습니다.
          </p>
        </div>
      </footer>
    </div>
  );
}
