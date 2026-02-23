import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!q || q.length < 1) {
    return NextResponse.json({ data: [] });
  }

  // 종목코드 정확 매칭 또는 종목명 부분 매칭
  const { data, error } = await supabase
    .from("stocks")
    .select("ticker, name, market")
    .or(`ticker.eq.${q},name.ilike.%${q}%`)
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}
