import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const market = sp.get("market") || "ALL";
  const minShortRatio = Number(sp.get("minShortRatio") || "0");
  const maxShortRatio = Number(sp.get("maxShortRatio") || "100");
  const minBalanceRatio = Number(sp.get("minBalanceRatio") || "0");
  const maxBalanceRatio = Number(sp.get("maxBalanceRatio") || "100");
  const sortBy = sp.get("sortBy") || "short_ratio";
  const sortOrder = sp.get("sortOrder") === "asc" ? true : false;
  const limit = Math.min(Number(sp.get("limit") || "100"), 200);

  // 최신 거래일 조회
  const { data: latest } = await supabase
    .from("short_volume")
    .select("trade_date")
    .order("trade_date", { ascending: false })
    .limit(1)
    .single();

  if (!latest?.trade_date) {
    return NextResponse.json({ error: "데이터 없음" }, { status: 404 });
  }

  const tradeDate = latest.trade_date;

  // 공매도 거래량 + 종목 정보 조회
  let query = supabase
    .from("short_volume")
    .select("trade_date, ticker, total_volume, short_volume, short_ratio, close_price, stocks(name, market)")
    .eq("trade_date", tradeDate)
    .gte("short_ratio", minShortRatio)
    .lte("short_ratio", maxShortRatio)
    .gt("total_volume", 0)
    .order(sortBy, { ascending: sortOrder })
    .limit(limit);

  const { data: volumeData, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 잔고 비율 필터를 위해 잔고 데이터도 가져오기 (최신 잔고일 기준)
  const { data: latestBalance } = await supabase
    .from("short_balance")
    .select("trade_date")
    .order("trade_date", { ascending: false })
    .limit(1)
    .single();

  const balanceDate = latestBalance?.trade_date;
  let balanceMap: Record<string, number> = {};

  if (balanceDate && (minBalanceRatio > 0 || maxBalanceRatio < 100)) {
    const { data: balanceData } = await supabase
      .from("short_balance")
      .select("ticker, balance_ratio")
      .eq("trade_date", balanceDate)
      .gte("balance_ratio", minBalanceRatio)
      .lte("balance_ratio", maxBalanceRatio);

    if (balanceData) {
      for (const b of balanceData) {
        balanceMap[b.ticker] = b.balance_ratio;
      }
    }
  } else if (balanceDate) {
    // 잔고 필터가 없어도 잔고비율 표시용으로 가져오기
    const tickers = (volumeData || []).map((r) => r.ticker);
    if (tickers.length > 0) {
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
  }

  const hasBalanceFilter = minBalanceRatio > 0 || maxBalanceRatio < 100;

  const results = (volumeData || [])
    .map((row) => {
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
    })
    .filter((item) => {
      if (market !== "ALL" && item.market !== market) return false;
      if (hasBalanceFilter && item.balanceRatio === null) return false;
      return true;
    });

  return NextResponse.json({
    date: tradeDate,
    balanceDate: balanceDate || null,
    count: results.length,
    data: results,
  });
}
