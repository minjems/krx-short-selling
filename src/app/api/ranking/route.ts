import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const market = searchParams.get("market") || "ALL";
  const limit = Math.min(Number(searchParams.get("limit") || "50"), 100);
  const date = searchParams.get("date"); // YYYY-MM-DD or null for latest

  // 최신 거래일 조회
  let tradeDate = date;
  if (!tradeDate) {
    const { data: latest } = await supabase
      .from("short_volume")
      .select("trade_date")
      .order("trade_date", { ascending: false })
      .limit(1)
      .single();
    tradeDate = latest?.trade_date;
  }

  if (!tradeDate) {
    return NextResponse.json({ error: "데이터 없음" }, { status: 404 });
  }

  // 공매도 비중 상위 종목 조회
  let query = supabase
    .from("short_volume")
    .select("trade_date, ticker, total_volume, short_volume, short_ratio, close_price, stocks(name, market)")
    .eq("trade_date", tradeDate)
    .gt("short_ratio", 0)
    .order("short_ratio", { ascending: false })
    .limit(limit);

  if (market === "KOSPI") {
    query = query.eq("stocks.market", "KOSPI");
  } else if (market === "KOSDAQ") {
    query = query.eq("stocks.market", "KOSDAQ");
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // stocks 필터링 (market 필터 적용 시 stocks가 null인 행 제거)
  const filtered = market !== "ALL"
    ? data?.filter((row) => row.stocks !== null) || []
    : data || [];

  return NextResponse.json({
    date: tradeDate,
    market,
    count: filtered.length,
    data: filtered.map((row) => {
      const stockInfo = row.stocks as unknown as { name: string; market: string } | null;
      return {
        ticker: row.ticker,
        name: stockInfo?.name || "",
        market: stockInfo?.market || "",
        shortVolume: row.short_volume,
        totalVolume: row.total_volume,
        shortRatio: row.short_ratio,
        closePrice: row.close_price,
      };
    }),
  });
}
