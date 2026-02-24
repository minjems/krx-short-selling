import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // 1시간마다 재생성

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://krx-short-selling.vercel.app";

  // 최신 거래일 조회 (lastmod에 사용)
  const { data: latestDate } = await supabase
    .from("short_volume")
    .select("trade_date")
    .order("trade_date", { ascending: false })
    .limit(1)
    .single();

  const lastmod = latestDate?.trade_date
    ? new Date(latestDate.trade_date)
    : new Date();

  // 정적 페이지
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: lastmod,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/investor`,
      lastModified: lastmod,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/valuation`,
      lastModified: lastmod,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/screener`,
      lastModified: lastmod,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  // 동적 종목 페이지 - Supabase에서 전체 종목 조회
  const { data: stocks } = await supabase
    .from("stocks")
    .select("ticker")
    .order("ticker");

  const stockPages: MetadataRoute.Sitemap = (stocks || []).map((stock) => ({
    url: `${baseUrl}/stock/${stock.ticker}`,
    lastModified: lastmod,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...stockPages];
}
