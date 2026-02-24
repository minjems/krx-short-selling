"""
DART OpenAPI 재무제표 수집 스크립트
- fnlttSinglAcntAll.json 전체 계정 (현금흐름 포함)
- CFS 우선, 없으면 OFS 폴백
- stocks 테이블 활성 종목 대상
- 주 1회 토요일 실행
"""
import os
import sys
import json
import time
from datetime import datetime

import requests
import psycopg2
from psycopg2.extras import execute_values

# DB 연결 정보
DB_HOST = os.getenv("DB_HOST", "aws-1-ap-northeast-2.pooler.supabase.com")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres.ufdoyszdnrsjnhvpqmzg")
DB_PASS = os.getenv("DB_PASS", "XM3dbHSFldHey3z5")

DART_API_KEY = os.getenv("DART_API_KEY", "")
DART_API_URL = "https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json"

# 보고서 코드
REPRT_CODES = {
    "11011": "사업보고서",
    "11012": "반기보고서",
    "11013": "1분기보고서",
    "11014": "3분기보고서",
}

# 추출 대상 계정
ACCOUNT_MAP = {
    # IS (손익계산서)
    "매출액": "revenue",
    "수익(매출액)": "revenue",
    "영업수익": "revenue",
    "영업이익": "operating_income",
    "영업이익(손실)": "operating_income",
    "당기순이익": "net_income",
    "당기순이익(손실)": "net_income",
    "분기순이익": "net_income",
    "분기순이익(손실)": "net_income",
    "반기순이익": "net_income",
    "반기순이익(손실)": "net_income",
    # BS (재무상태표)
    "자산총계": "total_assets",
    "부채총계": "total_liabilities",
    "자본총계": "total_equity",
    # CF (현금흐름표)
    "영업활동현금흐름": "cash_from_operations",
    "영업활동으로인한현금흐름": "cash_from_operations",
}

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def get_connection():
    return psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
        user=DB_USER, password=DB_PASS
    )


def load_corp_codes():
    """corp_codes.json에서 stock_code → corp_code 매핑 로드"""
    path = os.path.join(SCRIPT_DIR, "corp_codes.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    mapping = {}
    for item in data:
        stock_code = item.get("stock_code", "").strip()
        corp_code = item.get("corp_code", "").strip()
        if stock_code and corp_code:
            mapping[stock_code] = corp_code
    return mapping


def get_active_tickers(conn):
    """stocks 테이블에서 활성 종목 ticker 목록"""
    cur = conn.cursor()
    cur.execute("SELECT ticker FROM stocks ORDER BY ticker")
    tickers = [row[0] for row in cur.fetchall()]
    cur.close()
    return tickers


def determine_report_period():
    """현재 날짜 기준으로 수집할 보고서 기간 결정
    Returns: list of (bsns_year, reprt_code) tuples - [당기, 전기(매출성장률용)]
    """
    now = datetime.now()
    month = now.month
    year = now.year

    if month <= 3:
        # 1~3월: 전전년 사업보고서 (전년 사업보고서는 3월말 제출)
        current = (str(year - 2), "11011")
        previous = (str(year - 3), "11011")
    elif month <= 5:
        # 4~5월: 전년 사업보고서 (3월말 이후 제출 완료)
        current = (str(year - 1), "11011")
        previous = (str(year - 2), "11011")
    elif month <= 8:
        # 6~8월: 당해 1분기
        current = (str(year), "11013")
        previous = (str(year - 1), "11013")
    elif month <= 11:
        # 9~11월: 당해 반기
        current = (str(year), "11012")
        previous = (str(year - 1), "11012")
    else:
        # 12월: 당해 3분기
        current = (str(year), "11014")
        previous = (str(year - 1), "11014")

    return current, previous


def fetch_dart_financial(corp_code, bsns_year, reprt_code):
    """DART API 호출 - fnlttSinglAcntAll.json"""
    params = {
        "crtfc_key": DART_API_KEY,
        "corp_code": corp_code,
        "bsns_year": bsns_year,
        "reprt_code": reprt_code,
        "fs_div": "CFS",
    }
    try:
        resp = requests.get(DART_API_URL, params=params, timeout=30)
        data = resp.json()
        if data.get("status") == "000":
            return data.get("list", [])

        # CFS 없으면 OFS 폴백
        if data.get("status") == "013":
            params["fs_div"] = "OFS"
            resp = requests.get(DART_API_URL, params=params, timeout=30)
            data = resp.json()
            if data.get("status") == "000":
                return data.get("list", [])
    except Exception as e:
        print(f"    DART API 오류 ({corp_code}): {e}")
    return []


def parse_amount(value_str):
    """금액 문자열 → int (원 단위)"""
    if not value_str or value_str.strip() in ("", "-"):
        return None
    try:
        return int(value_str.replace(",", ""))
    except (ValueError, TypeError):
        return None


def parse_financial_data(items):
    """DART API 응답에서 재무 데이터 추출"""
    result = {}
    for item in items:
        account_nm = item.get("account_nm", "").strip()
        field = ACCOUNT_MAP.get(account_nm)
        if not field:
            continue
        # 이미 추출된 필드는 건너뜀 (첫 번째 매칭 우선)
        if field in result and result[field] is not None:
            continue
        amount = parse_amount(item.get("thstrm_amount", ""))
        result[field] = amount
    return result


def calc_ratios(data, prev_revenue=None):
    """재무비율 계산"""
    roe = None
    debt_ratio = None
    operating_margin = None
    revenue_growth = None

    equity = data.get("total_equity")
    net_income = data.get("net_income")
    liabilities = data.get("total_liabilities")
    revenue = data.get("revenue")
    op_income = data.get("operating_income")

    # ROE = 당기순이익 / 자본총계 × 100
    if equity and equity != 0 and net_income is not None:
        roe = round((net_income / equity) * 100, 2)

    # 부채비율 = 부채총계 / 자본총계 × 100
    if equity and equity > 0 and liabilities is not None:
        debt_ratio = round((liabilities / equity) * 100, 2)

    # 영업이익률 = 영업이익 / 매출액 × 100
    if revenue and revenue != 0 and op_income is not None:
        operating_margin = round((op_income / revenue) * 100, 2)

    # 매출성장률 = (당기매출 - 전기매출) / 전기매출 × 100
    if prev_revenue and prev_revenue != 0 and revenue is not None:
        revenue_growth = round(((revenue - prev_revenue) / abs(prev_revenue)) * 100, 2)

    return roe, debt_ratio, operating_margin, revenue_growth


def collect_financials(test_ticker=None):
    """재무제표 수집 메인"""
    if not DART_API_KEY:
        print("DART_API_KEY 환경변수가 설정되지 않았습니다.")
        sys.exit(1)

    corp_codes = load_corp_codes()
    print(f"corp_codes.json 로드 완료: {len(corp_codes)}개 매핑")

    conn = get_connection()
    conn.autocommit = False

    if test_ticker:
        tickers = [test_ticker]
    else:
        tickers = get_active_tickers(conn)

    print(f"대상 종목: {len(tickers)}개")

    current_period, prev_period = determine_report_period()
    print(f"당기 보고서: {current_period[0]}년 {REPRT_CODES.get(current_period[1], current_period[1])}")
    print(f"전기 보고서: {prev_period[0]}년 {REPRT_CODES.get(prev_period[1], prev_period[1])}")

    cur = conn.cursor()
    success_count = 0
    skip_count = 0
    fail_count = 0

    for i, ticker in enumerate(tickers):
        corp_code = corp_codes.get(ticker)
        if not corp_code:
            skip_count += 1
            continue

        if (i + 1) % 100 == 0:
            print(f"  진행: {i + 1}/{len(tickers)} (성공: {success_count}, 스킵: {skip_count})")

        try:
            # 당기 재무제표
            items = fetch_dart_financial(corp_code, current_period[0], current_period[1])
            if not items:
                skip_count += 1
                time.sleep(0.5)
                continue

            data = parse_financial_data(items)
            if not data:
                skip_count += 1
                time.sleep(0.5)
                continue

            time.sleep(4)

            # 전기 재무제표 (매출성장률 계산용)
            prev_items = fetch_dart_financial(corp_code, prev_period[0], prev_period[1])
            prev_revenue = None
            if prev_items:
                prev_data = parse_financial_data(prev_items)
                prev_revenue = prev_data.get("revenue")

            time.sleep(4)

            # 비율 계산
            roe, debt_ratio, operating_margin, revenue_growth = calc_ratios(data, prev_revenue)

            # DB 저장
            cur.execute("""
                INSERT INTO stock_financial
                  (ticker, fiscal_year, reprt_code, revenue, operating_income,
                   net_income, total_assets, total_liabilities, total_equity,
                   cash_from_operations, roe, debt_ratio, operating_margin,
                   revenue_growth, fetched_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (ticker, fiscal_year, reprt_code) DO UPDATE SET
                  revenue = EXCLUDED.revenue,
                  operating_income = EXCLUDED.operating_income,
                  net_income = EXCLUDED.net_income,
                  total_assets = EXCLUDED.total_assets,
                  total_liabilities = EXCLUDED.total_liabilities,
                  total_equity = EXCLUDED.total_equity,
                  cash_from_operations = EXCLUDED.cash_from_operations,
                  roe = EXCLUDED.roe,
                  debt_ratio = EXCLUDED.debt_ratio,
                  operating_margin = EXCLUDED.operating_margin,
                  revenue_growth = EXCLUDED.revenue_growth,
                  fetched_at = NOW()
            """, (
                ticker,
                int(current_period[0]),
                current_period[1],
                data.get("revenue"),
                data.get("operating_income"),
                data.get("net_income"),
                data.get("total_assets"),
                data.get("total_liabilities"),
                data.get("total_equity"),
                data.get("cash_from_operations"),
                roe,
                debt_ratio,
                operating_margin,
                revenue_growth,
            ))
            conn.commit()
            success_count += 1

        except Exception as e:
            print(f"  [{ticker}] 수집 실패: {e}")
            conn.rollback()
            fail_count += 1

    cur.close()
    conn.close()

    print(f"\n=== 수집 완료 ===")
    print(f"성공: {success_count}, 스킵: {skip_count}, 실패: {fail_count}")


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "--test":
        # 단건 테스트: python collect_dart.py --test 005930
        collect_financials(test_ticker=sys.argv[2])
    else:
        collect_financials()
