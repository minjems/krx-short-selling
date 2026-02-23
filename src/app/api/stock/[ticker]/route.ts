import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const searchParams = request.nextUrl.searchParams;
  const days = Math.min(Number(searchParams.get("days") || "90"), 365);

  // 종목 기본 정보
  const { data: stock } = await supabase
    .from("stocks")
    .select("ticker, name, market")
    .eq("ticker", ticker)
    .single();

  if (!stock) {
    return NextResponse.json({ error: "종목을 찾을 수 없습니다" }, { status: 404 });
  }

  // 공매도 거래량 (최근 N일)
  const { data: volumeData } = await supabase
    .from("short_volume")
    .select("trade_date, total_volume, short_volume, short_ratio, close_price")
    .eq("ticker", ticker)
    .order("trade_date", { ascending: true })
    .limit(days);

  // 공매도 잔고 (최근 N일)
  const { data: balanceData } = await supabase
    .from("short_balance")
    .select("trade_date, balance_quantity, balance_amount, balance_ratio")
    .eq("ticker", ticker)
    .order("trade_date", { ascending: true })
    .limit(days);

  // 최신 데이터에서 요약 정보 추출
  const latestVolume = volumeData && volumeData.length > 0
    ? volumeData[volumeData.length - 1]
    : null;
  const latestBalance = balanceData && balanceData.length > 0
    ? balanceData[balanceData.length - 1]
    : null;

  return NextResponse.json({
    stock: {
      ticker: stock.ticker,
      name: stock.name,
      market: stock.market,
    },
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
  });
}
