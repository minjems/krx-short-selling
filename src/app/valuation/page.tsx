import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ValuationClient } from "./ValuationClient";
import { AdBanner } from "@/components/AdBanner";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "밸류에이션 랭킹 - KRX 공매도·수급",
  description:
    "코스피·코스닥 전종목 PER, PBR, 배당수익률 기반 저평가·고평가 랭킹. 복합점수로 저평가 종목을 한눈에 확인하세요.",
};

export type ValuationItem = {
  ticker: string;
  name: string;
  market: string;
  sector: string | null;
  closePrice: number;
  per: number | null;
  pbr: number | null;
  eps: number | null;
  bps: number | null;
  dvdYld: number | null;
};

async function getValuationData(): Promise<{
  date: string;
  data: ValuationItem[];
} | null> {
  try {
    // 최신 거래일 (실제 데이터가 있는 날)
    const { data: latest } = await supabase
      .from("stock_valuation")
      .select("trade_date")
      .not("per", "is", null)
      .order("trade_date", { ascending: false })
      .limit(1)
      .single();

    if (!latest?.trade_date) return null;

    const tradeDate = latest.trade_date;

    // 전체 종목 밸류에이션 (페이징)
    const PAGE_SIZE = 1000;
    type ValRow = {
      trade_date: string;
      ticker: string;
      per: number | null;
      pbr: number | null;
      eps: number | null;
      bps: number | null;
      dvd_yld: number | null;
      close_price: number;
      stocks: { name: string; market: string; sector: string | null } | null;
    };

    let allRows: ValRow[] = [];
    let from = 0;
    while (true) {
      const { data: page, error } = await supabase
        .from("stock_valuation")
        .select(
          "trade_date, ticker, per, pbr, eps, bps, dvd_yld, close_price, stocks(name, market, sector)"
        )
        .eq("trade_date", tradeDate)
        .range(from, from + PAGE_SIZE - 1);

      if (error || !page || page.length === 0) break;
      allRows = allRows.concat(page as unknown as ValRow[]);
      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    return {
      date: tradeDate,
      data: allRows.map((row) => {
        const stock = row.stocks as unknown as {
          name: string;
          market: string;
          sector: string | null;
        } | null;
        return {
          ticker: row.ticker,
          name: stock?.name || "",
          market: stock?.market || "",
          sector: stock?.sector || null,
          closePrice: row.close_price,
          per: row.per,
          pbr: row.pbr,
          eps: row.eps,
          bps: row.bps,
          dvdYld: row.dvd_yld,
        };
      }),
    };
  } catch {
    return null;
  }
}

export default async function ValuationPage() {
  const result = await getValuationData();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <h1 className="text-xl font-bold">KRX 공매도·수급</h1>
          </Link>
          <nav className="flex gap-4 text-sm text-zinc-400">
            <Link href="/" className="hover:text-white transition-colors">
              공매도
            </Link>
            <Link
              href="/investor"
              className="hover:text-white transition-colors"
            >
              수급
            </Link>
            <Link href="/valuation" className="text-white">
              밸류에이션
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
        <AdBanner position="header" className="mb-6" />

        <h2 className="text-2xl font-bold mb-6">밸류에이션 랭킹</h2>

        {result ? (
          <ValuationClient data={result.data} tradeDate={result.date} />
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
            밸류에이션 데이터는 참고용이며, 투자 판단의 근거로 사용하지
            마십시오. 데이터의 정확성을 보장하지 않습니다.
          </p>
        </div>
      </footer>
    </div>
  );
}
