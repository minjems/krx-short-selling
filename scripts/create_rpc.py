"""Supabase RPC 함수 생성 + RLS 설정"""
import psycopg2

DB_HOST = "aws-1-ap-northeast-2.pooler.supabase.com"
DB_PORT = 5432
DB_NAME = "postgres"
DB_USER = "postgres.ufdoyszdnrsjnhvpqmzg"
DB_PASS = "XM3dbHSFldHey3z5"

SQL = """
-- RLS 설정
ALTER TABLE investor_trading ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous read" ON investor_trading;
CREATE POLICY "Allow anonymous read" ON investor_trading FOR SELECT USING (true);

-- 수급 랭킹 RPC 함수
CREATE OR REPLACE FUNCTION get_investor_ranking(
  p_investor_type VARCHAR(4),
  p_period INT,
  p_market VARCHAR(6),
  p_direction VARCHAR(4),
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  ticker VARCHAR(20),
  name VARCHAR(100),
  market VARCHAR(10),
  net_value BIGINT,
  net_volume BIGINT,
  buy_value BIGINT,
  sell_value BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_dates AS (
    SELECT DISTINCT it.trade_date
    FROM investor_trading it
    ORDER BY it.trade_date DESC
    LIMIT p_period
  )
  SELECT
    it.ticker,
    s.name,
    s.market,
    SUM(it.net_value)::BIGINT AS net_value,
    SUM(it.net_volume)::BIGINT AS net_volume,
    SUM(it.buy_value)::BIGINT AS buy_value,
    SUM(it.sell_value)::BIGINT AS sell_value
  FROM investor_trading it
  JOIN stocks s ON s.ticker = it.ticker
  JOIN recent_dates rd ON rd.trade_date = it.trade_date
  WHERE it.investor_type = p_investor_type
    AND (p_market = 'ALL' OR s.market = p_market)
  GROUP BY it.ticker, s.name, s.market
  ORDER BY
    CASE WHEN p_direction = 'buy' THEN SUM(it.net_value) END DESC NULLS LAST,
    CASE WHEN p_direction = 'sell' THEN SUM(it.net_value) END ASC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
"""

def main():
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
        user=DB_USER, password=DB_PASS
    )
    conn.autocommit = True
    cur = conn.cursor()

    print("RPC 함수 및 RLS 설정 중...")
    cur.execute(SQL)
    print("완료!")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
