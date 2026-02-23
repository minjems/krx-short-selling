"""Supabase 테이블 생성 스크립트"""
import psycopg2

DB_HOST = "aws-1-ap-northeast-2.pooler.supabase.com"
DB_PORT = 5432
DB_NAME = "postgres"
DB_USER = "postgres.ufdoyszdnrsjnhvpqmzg"
DB_PASS = "XM3dbHSFldHey3z5"

SQL = """
-- 1. 종목 마스터 테이블
CREATE TABLE IF NOT EXISTS stocks (
  ticker VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  market VARCHAR(10) NOT NULL CHECK (market IN ('KOSPI', 'KOSDAQ')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 공매도 거래량 테이블 (일별)
CREATE TABLE IF NOT EXISTS short_volume (
  id BIGSERIAL PRIMARY KEY,
  trade_date DATE NOT NULL,
  ticker VARCHAR(10) NOT NULL REFERENCES stocks(ticker),
  total_volume BIGINT,
  short_volume BIGINT,
  short_ratio NUMERIC(6,2),
  close_price INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trade_date, ticker)
);

-- 3. 공매도 잔고 테이블 (일별)
CREATE TABLE IF NOT EXISTS short_balance (
  id BIGSERIAL PRIMARY KEY,
  trade_date DATE NOT NULL,
  ticker VARCHAR(10) NOT NULL REFERENCES stocks(ticker),
  balance_quantity BIGINT,
  balance_amount BIGINT,
  balance_ratio NUMERIC(6,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trade_date, ticker)
);

-- 4. 투자자별 매매동향 테이블 (일별)
CREATE TABLE IF NOT EXISTS investor_trading (
  trade_date    DATE        NOT NULL,
  ticker        VARCHAR(20) NOT NULL REFERENCES stocks(ticker),
  investor_type VARCHAR(4)  NOT NULL,
  sell_volume   BIGINT DEFAULT 0,
  buy_volume    BIGINT DEFAULT 0,
  net_volume    BIGINT DEFAULT 0,
  sell_value    BIGINT DEFAULT 0,
  buy_value     BIGINT DEFAULT 0,
  net_value     BIGINT DEFAULT 0,
  PRIMARY KEY (trade_date, ticker, investor_type)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_short_volume_date ON short_volume(trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_short_volume_ticker ON short_volume(ticker);
CREATE INDEX IF NOT EXISTS idx_short_volume_ratio ON short_volume(trade_date DESC, short_ratio DESC);
CREATE INDEX IF NOT EXISTS idx_short_balance_date ON short_balance(trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_short_balance_ticker ON short_balance(ticker);
CREATE INDEX IF NOT EXISTS idx_inv_type_date ON investor_trading(investor_type, trade_date);
CREATE INDEX IF NOT EXISTS idx_inv_ticker_date ON investor_trading(ticker, trade_date);
"""

def main():
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
        user=DB_USER, password=DB_PASS
    )
    conn.autocommit = True
    cur = conn.cursor()

    print("테이블 생성 중...")
    cur.execute(SQL)
    print("테이블 생성 완료!")

    # 확인
    cur.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    """)
    tables = cur.fetchall()
    print(f"\n생성된 테이블: {[t[0] for t in tables]}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
