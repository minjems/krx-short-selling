import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const investorType = sp.get("investorType") || "9000";
  const period = Math.min(Math.max(Number(sp.get("period") || "1"), 1), 20);
  const direction = sp.get("direction") === "sell" ? "sell" : "buy";
  const market = sp.get("market") || "ALL";
  const limit = Math.min(Number(sp.get("limit") || "50"), 100);

  if (!["8000", "9000", "7050"].includes(investorType)) {
    return NextResponse.json({ error: "Invalid investor type" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("get_investor_ranking", {
    p_investor_type: investorType,
    p_period: period,
    p_market: market,
    p_direction: direction,
    p_limit: limit,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 기준일 조회
  const { data: dateData } = await supabase
    .from("investor_trading")
    .select("trade_date")
    .order("trade_date", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({
    investorType,
    period,
    direction,
    market,
    latestDate: dateData?.trade_date || null,
    count: data?.length || 0,
    data: data || [],
  });
}
