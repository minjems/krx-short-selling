import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "KRX 공매도·수급 - 한국 주식시장 공매도·수급 데이터",
    template: "%s - KRX 공매도·수급",
  },
  description:
    "한국거래소(KRX) 코스피·코스닥 공매도 비중, 잔고비율, 투자자별 수급동향을 추적하는 대시보드. 외국인·기관·개인 순매수/순매도 랭킹, 종목별 차트 제공.",
  keywords: [
    "공매도",
    "수급",
    "KRX",
    "한국거래소",
    "공매도 비중",
    "공매도 잔고",
    "외국인 순매수",
    "기관 순매수",
    "투자자별 매매동향",
    "코스피",
    "코스닥",
    "주식",
    "공매도 랭킹",
    "수급 랭킹",
  ],
  openGraph: {
    title: "KRX 공매도·수급 - 한국 주식시장 공매도·수급 데이터",
    description:
      "코스피·코스닥 공매도 비중 랭킹, 외국인·기관·개인 수급 랭킹, 종목별 차트",
    type: "website",
    locale: "ko_KR",
    siteName: "KRX 공매도·수급",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  return (
    <html lang="ko">
      <head>
        {adsenseClientId && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
