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
    default: "KRX 공매도 - 한국 주식시장 공매도 데이터",
    template: "%s - KRX 공매도",
  },
  description:
    "한국거래소(KRX) 코스피·코스닥 공매도 비중, 잔고비율을 실시간 추적하는 대시보드. 종목별 공매도 차트, 랭킹, 종목 검색 제공.",
  keywords: [
    "공매도",
    "KRX",
    "한국거래소",
    "공매도 비중",
    "공매도 잔고",
    "코스피",
    "코스닥",
    "주식",
    "공매도 데이터",
    "공매도 랭킹",
  ],
  openGraph: {
    title: "KRX 공매도 - 한국 주식시장 공매도 데이터",
    description:
      "코스피·코스닥 공매도 비중 상위 종목 랭킹, 종목별 공매도 추이 차트, 종목 검색",
    type: "website",
    locale: "ko_KR",
    siteName: "KRX 공매도",
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
