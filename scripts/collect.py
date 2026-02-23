"""
KRX 공매도 + 투자자별 수급 + 밸류에이션 데이터 수집 스크립트
data.krx.co.kr 직접 스크래핑으로 데이터를 가져와서 Supabase에 저장
"""
import os
import sys
import time
from datetime import datetime, timedelta

import requests
import psycopg2
from psycopg2.extras import execute_values

# DB 연결 정보 (환경변수 우선, 없으면 기본값)
DB_HOST = os.getenv("DB_HOST", "aws-1-ap-northeast-2.pooler.supabase.com")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres.ufdoyszdnrsjnhvpqmzg")
DB_PASS = os.getenv("DB_PASS", "XM3dbHSFldHey3z5")

# KRX API 설정
KRX_URL = "https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd"
KRX_HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Referer": "https://data.krx.co.kr/contents/MDC/MDI/outerLoader/index.cmd",
    "Content-Type": "application/x-www-form-urlencoded",
}

# 시장 코드 매핑
MARKET_VOLUME_CODE = {"KOSPI": "STK", "KOSDAQ": "KSQ"}
MARKET_BALANCE_CODE = {"KOSPI": "1", "KOSDAQ": "2"}

# 투자자 유형 코드
INVESTOR_TYPES = {"8000": "개인", "9000": "외국인", "7050": "기관합계"}


def krx_post(params):
    """KRX API POST 요청"""
    res = requests.post(KRX_URL, headers=KRX_HEADERS, data=params, timeout=30)
    res.raise_for_status()
    return res.json().get("OutBlock_1", [])


def parse_int(s):
    """콤마 포함 문자열을 int로 변환"""
    if not s or s == "-":
        return 0
    return int(s.replace(",", ""))


def parse_float(s):
    """콤마 포함 문자열을 float로 변환"""
    if not s or s == "-":
        return 0.0
    return float(s.replace(",", ""))


def parse_nullable_float(s):
    """콤마 포함 문자열을 float로 변환, "-"이면 None"""
    if not s or s == "-" or s.strip() == "":
        return None
    return float(s.replace(",", ""))


def parse_nullable_int(s):
    """콤마 포함 문자열을 int로 변환, "-"이면 None"""
    if not s or s == "-" or s.strip() == "":
        return None
    return int(s.replace(",", ""))


def get_connection():
    return psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
        user=DB_USER, password=DB_PASS
    )


def format_date(date_str):
    """YYYYMMDD -> YYYY-MM-DD"""
    return f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"


def fetch_close_prices(date_str, market):
    """종목 시세에서 종가 맵 가져오기 {ticker: close_price}"""
    mkt_code = MARKET_VOLUME_CODE[market]
    items = krx_post({
        "bld": "dbms/MDC/STAT/standard/MDCSTAT01501",
        "mktId": mkt_code,
        "trdDd": date_str,
        "share": "1",
        "money": "1",
        "csvxls_isNo": "false",
    })
    price_map = {}
    for item in items:
        ticker = item.get("ISU_SRT_CD", "")
        close = parse_int(item.get("TDD_CLSPRC", "0"))
        if ticker:
            price_map[ticker] = close
    return price_map, items


def upsert_stocks(conn, market, date_str=None):
    """종목 마스터 데이터 업서트 (KRX 전종목 시세에서 가져옴)"""
    if date_str is None:
        date_str = datetime.now().strftime("%Y%m%d")

    price_map, items = fetch_close_prices(date_str, market)

    cur = conn.cursor()
    rows = []
    for item in items:
        ticker = item.get("ISU_SRT_CD", "")
        name = item.get("ISU_ABBRV", "")
        if ticker and name:
            rows.append((ticker, name, market))

    if rows:
        execute_values(
            cur,
            """
            INSERT INTO stocks (ticker, name, market)
            VALUES %s
            ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, market = EXCLUDED.market
            """,
            rows
        )
    conn.commit()
    cur.close()
    print(f"  [{market}] 종목 {len(rows)}개 업서트 완료")
    return price_map


def ensure_stocks_exist(conn, tickers_with_names, market):
    """누락된 종목을 stocks 테이블에 삽입 (상장폐지 종목 등)"""
    if not tickers_with_names:
        return
    cur = conn.cursor()
    execute_values(
        cur,
        """
        INSERT INTO stocks (ticker, name, market)
        VALUES %s
        ON CONFLICT (ticker) DO NOTHING
        """,
        tickers_with_names
    )
    conn.commit()
    cur.close()


def collect_short_volume(conn, date_str, price_maps=None):
    """특정 날짜의 공매도 거래량 수집"""
    if price_maps is None:
        price_maps = {}
    cur = conn.cursor()

    for market in ["KOSPI", "KOSDAQ"]:
        try:
            mkt_code = MARKET_VOLUME_CODE[market]
            items = krx_post({
                "trdDd": date_str,
                "mktId": mkt_code,
                "inqCond": "STMFRTSCIFDRFS",
                "bld": "dbms/MDC/STAT/srt/MDCSTAT30101",
            })

            if not items:
                print(f"  [{market}] {date_str} 공매도 거래량 데이터 없음")
                continue

            # 공매도 데이터에 나오는 종목을 stocks에 미리 등록
            stock_rows = [(item["ISU_CD"], item["ISU_ABBRV"], market)
                          for item in items if item.get("ISU_CD")]
            ensure_stocks_exist(conn, stock_rows, market)

            pm = price_maps.get(market, {})
            rows = []
            for item in items:
                ticker = item.get("ISU_CD", "")
                total_vol = parse_int(item.get("ACC_TRDVOL", "0"))
                short_vol = parse_int(item.get("CVSRTSELL_TRDVOL", "0"))
                ratio = parse_float(item.get("TRDVOL_WT", "0"))
                close = pm.get(ticker, 0)

                if total_vol > 0 and ticker:
                    rows.append((
                        format_date(date_str),
                        ticker, total_vol, short_vol, ratio, close
                    ))

            if rows:
                execute_values(
                    cur,
                    """
                    INSERT INTO short_volume (trade_date, ticker, total_volume, short_volume, short_ratio, close_price)
                    VALUES %s
                    ON CONFLICT (trade_date, ticker) DO UPDATE SET
                        total_volume = EXCLUDED.total_volume,
                        short_volume = EXCLUDED.short_volume,
                        short_ratio = EXCLUDED.short_ratio,
                        close_price = EXCLUDED.close_price
                    """,
                    rows
                )
                conn.commit()
                print(f"  [{market}] {date_str} 공매도 거래량 {len(rows)}건 저장")

        except Exception as e:
            print(f"  [{market}] {date_str} 공매도 거래량 수집 실패: {e}")
            conn.rollback()

    cur.close()


def collect_short_balance(conn, date_str):
    """특정 날짜의 공매도 잔고 수집"""
    cur = conn.cursor()

    for market in ["KOSPI", "KOSDAQ"]:
        try:
            mkt_code = MARKET_BALANCE_CODE[market]
            items = krx_post({
                "trdDd": date_str,
                "mktTpCd": mkt_code,
                "bld": "dbms/MDC/STAT/srt/MDCSTAT30501",
            })

            if not items:
                print(f"  [{market}] {date_str} 공매도 잔고 데이터 없음")
                continue

            # 공매도 잔고 데이터에 나오는 종목을 stocks에 미리 등록
            stock_rows = [(item["ISU_CD"], item["ISU_ABBRV"], market)
                          for item in items if item.get("ISU_CD")]
            ensure_stocks_exist(conn, stock_rows, market)

            rows = []
            for item in items:
                ticker = item.get("ISU_CD", "")
                qty = parse_int(item.get("BAL_QTY", "0"))
                amt = parse_int(item.get("BAL_AMT", "0"))
                ratio = parse_float(item.get("BAL_RTO", "0"))

                if qty > 0 and ticker:
                    rows.append((
                        format_date(date_str),
                        ticker, qty, amt, ratio
                    ))

            if rows:
                execute_values(
                    cur,
                    """
                    INSERT INTO short_balance (trade_date, ticker, balance_quantity, balance_amount, balance_ratio)
                    VALUES %s
                    ON CONFLICT (trade_date, ticker) DO UPDATE SET
                        balance_quantity = EXCLUDED.balance_quantity,
                        balance_amount = EXCLUDED.balance_amount,
                        balance_ratio = EXCLUDED.balance_ratio
                    """,
                    rows
                )
                conn.commit()
                print(f"  [{market}] {date_str} 공매도 잔고 {len(rows)}건 저장")

        except Exception as e:
            print(f"  [{market}] {date_str} 공매도 잔고 수집 실패: {e}")
            conn.rollback()

    cur.close()


def krx_post_output(params):
    """KRX API POST 요청 (output 키 사용 - 투자자별 매매동향용)"""
    res = requests.post(KRX_URL, headers=KRX_HEADERS, data=params, timeout=30)
    res.raise_for_status()
    return res.json().get("output", [])


def collect_investor_trading(conn, date_str):
    """특정 날짜의 투자자별 매매동향 수집"""
    cur = conn.cursor()

    for market in ["KOSPI", "KOSDAQ"]:
        mkt_code = MARKET_VOLUME_CODE[market]

        for inv_code, inv_name in INVESTOR_TYPES.items():
            try:
                items = krx_post_output({
                    "bld": "dbms/MDC/STAT/standard/MDCSTAT02401",
                    "strtDd": date_str,
                    "endDd": date_str,
                    "mktId": mkt_code,
                    "invstTpCd": inv_code,
                })

                if not items:
                    print(f"  [{market}] {date_str} {inv_name} 매매동향 데이터 없음")
                    continue

                # 종목 등록 (ISU_SRT_CD 사용)
                stock_rows = [(item["ISU_SRT_CD"], item.get("ISU_NM", ""), market)
                              for item in items if item.get("ISU_SRT_CD")]
                ensure_stocks_exist(conn, stock_rows, market)

                rows = []
                for item in items:
                    ticker = item.get("ISU_SRT_CD", "")
                    if not ticker:
                        continue
                    rows.append((
                        format_date(date_str),
                        ticker,
                        inv_code,
                        parse_int(item.get("ASK_TRDVOL", "0")),
                        parse_int(item.get("BID_TRDVOL", "0")),
                        parse_int(item.get("NETBID_TRDVOL", "0")),
                        parse_int(item.get("ASK_TRDVAL", "0")),
                        parse_int(item.get("BID_TRDVAL", "0")),
                        parse_int(item.get("NETBID_TRDVAL", "0")),
                    ))

                if rows:
                    execute_values(
                        cur,
                        """
                        INSERT INTO investor_trading
                          (trade_date, ticker, investor_type, sell_volume, buy_volume,
                           net_volume, sell_value, buy_value, net_value)
                        VALUES %s
                        ON CONFLICT (trade_date, ticker, investor_type) DO UPDATE SET
                            sell_volume = EXCLUDED.sell_volume,
                            buy_volume = EXCLUDED.buy_volume,
                            net_volume = EXCLUDED.net_volume,
                            sell_value = EXCLUDED.sell_value,
                            buy_value = EXCLUDED.buy_value,
                            net_value = EXCLUDED.net_value
                        """,
                        rows
                    )
                    conn.commit()
                    print(f"  [{market}] {date_str} {inv_name} 매매동향 {len(rows)}건 저장")

                time.sleep(1)

            except Exception as e:
                print(f"  [{market}] {date_str} {inv_name} 매매동향 수집 실패: {e}")
                conn.rollback()

    cur.close()


def collect_valuation(conn, date_str):
    """특정 날짜의 PER/PBR/배당수익률 수집 (MDCSTAT03501)"""
    cur = conn.cursor()

    try:
        items = krx_post_output({
            "bld": "dbms/MDC/STAT/standard/MDCSTAT03501",
            "mktId": "ALL",
            "trdDd": date_str,
        })

        if not items:
            print(f"  {date_str} 밸류에이션 데이터 없음")
            cur.close()
            return

        rows = []
        for item in items:
            ticker = item.get("ISU_SRT_CD", "")
            if not ticker:
                continue
            rows.append((
                format_date(date_str),
                ticker,
                parse_nullable_float(item.get("PER", "-")),
                parse_nullable_float(item.get("PBR", "-")),
                parse_nullable_int(item.get("EPS", "-")),
                parse_nullable_int(item.get("BPS", "-")),
                parse_nullable_int(item.get("DPS", "-")),
                parse_nullable_float(item.get("DVD_YLD", "-")),
                parse_int(item.get("TDD_CLSPRC", "0")),
            ))

        if rows:
            execute_values(
                cur,
                """
                INSERT INTO stock_valuation
                  (trade_date, ticker, per, pbr, eps, bps, dps, dvd_yld, close_price)
                VALUES %s
                ON CONFLICT (trade_date, ticker) DO UPDATE SET
                    per = EXCLUDED.per,
                    pbr = EXCLUDED.pbr,
                    eps = EXCLUDED.eps,
                    bps = EXCLUDED.bps,
                    dps = EXCLUDED.dps,
                    dvd_yld = EXCLUDED.dvd_yld,
                    close_price = EXCLUDED.close_price
                """,
                rows
            )
            conn.commit()
            print(f"  {date_str} 밸류에이션 {len(rows)}건 저장")

    except Exception as e:
        print(f"  {date_str} 밸류에이션 수집 실패: {e}")
        conn.rollback()

    cur.close()


def collect_sector(conn, date_str):
    """업종 분류 수집 (MDCSTAT03901) -> stocks 테이블 sector 컬럼 업데이트"""
    cur = conn.cursor()
    total = 0

    for mkt_code in ["STK", "KSQ"]:
        try:
            res = requests.post(KRX_URL, headers=KRX_HEADERS, data={
                "bld": "dbms/MDC/STAT/standard/MDCSTAT03901",
                "mktId": mkt_code,
                "trdDd": date_str,
            }, timeout=30)
            res.raise_for_status()
            items = res.json().get("block1", [])

            if not items:
                continue

            rows = []
            for item in items:
                ticker = item.get("ISU_SRT_CD", "")
                sector = item.get("IDX_IND_NM", "")
                if ticker and sector:
                    rows.append((sector, ticker))

            if rows:
                cur.executemany(
                    "UPDATE stocks SET sector = %s WHERE ticker = %s",
                    rows
                )
                conn.commit()
                total += len(rows)

            time.sleep(0.5)

        except Exception as e:
            print(f"  [{mkt_code}] 업종 분류 수집 실패: {e}")
            conn.rollback()

    if total:
        print(f"  업종 분류 {total}건 업데이트")
    else:
        print(f"  {date_str} 업종 분류 데이터 없음")

    cur.close()


def collect_daily(date_str=None):
    """하루치 데이터 수집"""
    if date_str is None:
        date_str = datetime.now().strftime("%Y%m%d")

    print(f"\n=== {date_str} 데이터 수집 시작 ===")
    conn = get_connection()
    conn.autocommit = False

    try:
        # 종목 마스터 업데이트 + 종가 맵 확보
        print("종목 마스터 업데이트...")
        price_maps = {}
        price_maps["KOSPI"] = upsert_stocks(conn, "KOSPI", date_str)
        time.sleep(1)
        price_maps["KOSDAQ"] = upsert_stocks(conn, "KOSDAQ", date_str)
        time.sleep(1)

        # 공매도 거래량 (종가 포함)
        print(f"공매도 거래량 수집 ({date_str})...")
        collect_short_volume(conn, date_str, price_maps)
        time.sleep(1)

        # 공매도 잔고
        print(f"공매도 잔고 수집 ({date_str})...")
        collect_short_balance(conn, date_str)
        time.sleep(1)

        # 투자자별 매매동향
        print(f"투자자별 매매동향 수집 ({date_str})...")
        collect_investor_trading(conn, date_str)
        time.sleep(1)

        # 밸류에이션 (PER/PBR/배당수익률)
        print(f"밸류에이션 수집 ({date_str})...")
        collect_valuation(conn, date_str)
        time.sleep(1)

        # 업종 분류
        print("업종 분류 업데이트...")
        collect_sector(conn, date_str)

        print(f"=== {date_str} 수집 완료 ===\n")

    except Exception as e:
        print(f"수집 중 오류: {e}")
        conn.rollback()
    finally:
        conn.close()


def collect_bulk(start_date, end_date):
    """기간 데이터 벌크 수집"""
    print(f"\n벌크 수집: {start_date} ~ {end_date}")
    conn = get_connection()
    conn.autocommit = False

    # 먼저 종목 마스터 업데이트
    print("종목 마스터 업데이트...")
    upsert_stocks(conn, "KOSPI")
    time.sleep(1)
    upsert_stocks(conn, "KOSDAQ")
    conn.close()

    # 날짜별 수집
    current = datetime.strptime(start_date, "%Y%m%d")
    end = datetime.strptime(end_date, "%Y%m%d")

    while current <= end:
        date_str = current.strftime("%Y%m%d")
        # 주말 건너뛰기
        if current.weekday() < 5:
            print(f"\n--- {date_str} ---")
            conn = get_connection()
            conn.autocommit = False
            # 종가 맵 가져오기
            price_maps = {}
            for mkt in ["KOSPI", "KOSDAQ"]:
                try:
                    price_maps[mkt], _ = fetch_close_prices(date_str, mkt)
                    time.sleep(0.5)
                except Exception:
                    price_maps[mkt] = {}
            collect_short_volume(conn, date_str, price_maps)
            time.sleep(1)
            collect_short_balance(conn, date_str)
            time.sleep(1)
            collect_investor_trading(conn, date_str)
            time.sleep(1)
            collect_valuation(conn, date_str)
            conn.close()
            time.sleep(1)  # API 부하 방지
        current += timedelta(days=1)

    # 벌크 수집 마지막에 업종 분류 1회 업데이트
    conn = get_connection()
    conn.autocommit = False
    print("\n업종 분류 업데이트...")
    collect_sector(conn, end_date)
    conn.close()

    print("벌크 수집 완료!")


if __name__ == "__main__":
    if len(sys.argv) == 1:
        # 인자 없으면 오늘 수집
        collect_daily()
    elif len(sys.argv) == 2:
        # 날짜 하나면 해당 날짜 수집
        collect_daily(sys.argv[1])
    elif len(sys.argv) == 3:
        # 날짜 두개면 벌크 수집
        collect_bulk(sys.argv[1], sys.argv[2])
    else:
        print("사용법:")
        print("  python collect.py              # 오늘 수집")
        print("  python collect.py 20260224      # 특정 날짜 수집")
        print("  python collect.py 20251124 20260224  # 기간 벌크 수집")
