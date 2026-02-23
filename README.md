# KRX 공매도 데이터 대시보드

한국거래소(KRX) 공매도 데이터를 실시간으로 추적하고 시각화하는 웹 대시보드입니다.

## 기능

- 공매도 비중 상위 종목 랭킹
- 종목별 공매도 추이 차트
- 공매도 스크리너 (필터 검색)

## 기술 스택

- **프론트엔드**: Next.js 15 + TypeScript + Tailwind CSS
- **데이터베이스**: Supabase (PostgreSQL)
- **데이터 수집**: pykrx + GitHub Actions
- **배포**: Vercel

## 데이터 출처

- 한국거래소(KRX) via pykrx
