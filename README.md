# KRX 공매도·수급 대시보드

한국거래소(KRX) 공매도·투자자 수급·밸류에이션 데이터를 추적하고 시각화하는 웹 대시보드입니다.

## 주요 기능

| 페이지 | 경로 | 설명 |
|--------|------|------|
| 공매도 | `/` | 공매도 비중 상위 종목 랭킹, 일별 추이 |
| 수급 | `/investor` | 외국인/기관/개인 투자자별 순매수 동향 |
| 저·고평가 | `/valuation` | 품질 조정 적정가 기반 저평가/고평가 랭킹 |
| 종목 검색 | `/screener` | 공매도·수급 필터 기반 스크리너 |
| 종목 상세 | `/stock/[ticker]` | 공매도 차트, 수급 추이, 적정가 분석, 재무 건전성 |

## 적정가 모델

업종 평균 PER·PBR 기반 상대평가에 **품질 조정(Quality-Adjusted)** 을 적용합니다.

- **기본 적정가**: `avg(업종평균PER × EPS, 업종평균PBR × BPS)`
- **품질 점수**: ROE(30%) + 영업이익률(25%) + 부채비율(20%) + 매출성장률(15%) + 현금흐름(10%)
- **품질 조정**: `적정가 × qualityMultiplier` (0.7 ~ 1.3)
- 금융업종(은행/보험/증권): 부채비율·영업이익률 중립 처리
- DART 재무 데이터 없는 종목: multiplier = 1.0 (기존 모델 폴백)

## 기술 스택

- **프론트엔드**: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **데이터베이스**: Supabase (PostgreSQL)
- **데이터 수집**: pykrx + DART OpenAPI + GitHub Actions
- **배포**: Vercel

## 데이터 수집 자동화

| 워크플로우 | 파일 | 주기 | 내용 |
|-----------|------|------|------|
| 공매도·수급·밸류에이션 | `collect.yml` | 매일 (평일) | pykrx 기반 KRX 데이터 |
| DART 재무제표 | `collect_dart.yml` | 매주 토요일 | DART OpenAPI 재무제표 |

## 데이터베이스 테이블

| 테이블 | 설명 |
|--------|------|
| `stocks` | 종목 기본 정보 (ticker, name, market, sector) |
| `short_volume` | 공매도 거래량 |
| `short_balance` | 공매도 잔고 |
| `investor_trading` | 투자자별 매매동향 |
| `stock_valuation` | PER/PBR/EPS/BPS/배당수익률 |
| `stock_financial` | DART 재무제표 (ROE, 부채비율, 영업이익률 등) |

## 스크립트

| 파일 | 설명 |
|------|------|
| `scripts/collect.py` | 일별 공매도·수급·밸류에이션 수집 |
| `scripts/collect_dart.py` | DART 재무제표 수집 (`--test TICKER`로 단건 테스트 가능) |
| `scripts/create_tables.py` | DB 테이블 DDL 실행 |
| `scripts/create_rpc.py` | Supabase RPC 함수 생성 |
| `scripts/corp_codes.json` | ticker → DART corp_code 매핑 |

## 데이터 출처

- 한국거래소(KRX) via pykrx
- 금융감독원 DART OpenAPI (재무제표)
