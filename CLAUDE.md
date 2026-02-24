# KRX 공매도·수급 프로젝트

## 프로젝트 개요
한국거래소 공매도·수급·밸류에이션 대시보드. Next.js 16 + Supabase + Vercel.

## 아키텍처

### 프론트엔드 구조
- `src/app/page.tsx` — 공매도 메인 (서버 컴포넌트)
- `src/app/investor/page.tsx` — 투자자별 수급
- `src/app/valuation/page.tsx` + `ValuationClient.tsx` — 저·고평가 랭킹
- `src/app/screener/page.tsx` — 종목 검색 스크리너
- `src/app/stock/[ticker]/page.tsx` + `StockDetailClient.tsx` — 종목 상세
- `src/lib/fairValue.ts` — 적정가 모델 (품질 조정 로직)
- `src/lib/format.ts` — 포맷팅 유틸 (색상, 등급, 숫자 표시)
- `src/lib/supabase.ts` — Supabase 클라이언트

### 데이터 수집 스크립트
- `scripts/collect.py` — 일별 KRX 데이터 (pykrx)
- `scripts/collect_dart.py` — DART 재무제표 (주간)
- `scripts/create_tables.py` — 테이블 DDL
- `scripts/create_rpc.py` — RPC 함수 (get_latest_financials 등)

### GitHub Actions
- `.github/workflows/collect.yml` — 매일 평일 수집
- `.github/workflows/collect_dart.yml` — 매주 토요일 DART 수집

### DB 테이블
- `stocks` — 종목 마스터 (ticker PK)
- `short_volume` — 공매도 거래량
- `short_balance` — 공매도 잔고
- `investor_trading` — 투자자별 매매동향
- `stock_valuation` — PER/PBR/EPS/BPS/배당
- `stock_financial` — DART 재무제표 (PK: ticker + fiscal_year + reprt_code)

## 적정가 모델 (fairValue.ts)
1. 업종 평균 PER×EPS + PBR×BPS 블렌딩
2. 품질 점수: ROE(30%) + 영업이익률(25%) + 부채비율(20%) + 매출성장률(15%) + 현금흐름(10%)
3. qualityMultiplier: 0.7 ~ 1.3 범위
4. 금융업종: 부채비율·영업이익률 중립(0.5) 고정
5. DART 데이터 없으면 multiplier = 1.0

## UI 설계 원칙
- 다크 테마 (zinc-950 배경)
- 네비게이션: 공매도 | 수급 | 저·고평가 | 종목 검색
- 저·고평가 페이지: 랭킹 테이블 형태, 신뢰도 기반 정렬
- 극단값(5배 이상) + 품질 데이터 없는 종목: opacity-50 + "주의" 라벨
- 적정가 표시: 2배 이상이면 "N배 저렴/비쌈", 미만이면 "+N%/-N%"

## 환경 변수 / Secrets
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `DART_API_KEY` — DART OpenAPI 키 (GitHub Secret에 등록됨)
- DB 관련: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`

## 주의사항
- DART 재무제표 전체 수집은 아직 미실행 (삼성전자만 테스트 완료). GitHub Actions에서 자동 실행되거나 수동 trigger 필요.
- collect_dart.py의 보고서 기간 로직: 1~3월→전전년 사업보고서, 4~5월→전년 사업보고서, 6~8월→당해 1분기, 9~11월→당해 반기, 12월→당해 3분기
- corp_codes.json에 ~3,942개 종목 매핑. 새 상장 종목은 DART에서 업데이트 필요.
