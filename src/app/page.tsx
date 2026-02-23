import Link from "next/link";
import { RankingTable } from "@/components/RankingTable";

export const dynamic = "force-dynamic";

type RankingItem = {
  ticker: string;
  name: string;
  market: string;
  shortVolume: number;
  totalVolume: number;
  shortRatio: number;
  closePrice: number;
};

type RankingResponse = {
  date: string;
  market: string;
  count: number;
  data: RankingItem[];
};

async function getRanking(): Promise<RankingResponse | null> {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/ranking?limit=50`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function Home() {
  const ranking = await getRanking();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <h1 className="text-xl font-bold">KRX 공매도</h1>
          </Link>
          <nav className="flex gap-4 text-sm text-zinc-400">
            <Link href="/" className="text-white">랭킹</Link>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Date Badge */}
        {ranking?.date && (
          <div className="mb-6">
            <span className="text-sm text-zinc-400">기준일</span>
            <span className="ml-2 text-sm font-mono bg-zinc-800 px-2 py-1 rounded">
              {ranking.date}
            </span>
          </div>
        )}

        {/* Title */}
        <h2 className="text-2xl font-bold mb-6">공매도 비중 상위 종목</h2>

        {/* Table */}
        {ranking?.data ? (
          <RankingTable data={ranking.data} />
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
