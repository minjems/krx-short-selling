export type SectorAvg = {
  avgPer: number;
  avgPbr: number;
  count: number;
};

export type FinancialData = {
  roe: number | null;
  debtRatio: number | null;
  operatingMargin: number | null;
  revenueGrowth: number | null;
  cashFromOps: number | null;
};

export type FairValueResult = {
  fairValue: number;
  upsidePct: number;
  method: "blended" | "earnings" | "asset";
  qualityMultiplier: number;
  qualityScore: number;
};

// 금융업종 키워드
const FINANCIAL_SECTORS = ["은행", "보험", "증권", "금융", "캐피탈", "카드", "저축"];

function isFinancialSector(sector: string | null): boolean {
  if (!sector) return false;
  return FINANCIAL_SECTORS.some((kw) => sector.includes(kw));
}

/**
 * 업종별 평균 PER/PBR 계산
 * - PER: 0 < PER < 200 인 종목만 포함
 * - PBR: 0 < PBR < 20 인 종목만 포함
 * - 업종 내 유효 종목 3개 미만이면 해당 업종 제외
 */
export function calcSectorAverages(
  items: {
    sector: string | null;
    per: number | null;
    pbr: number | null;
  }[]
): Map<string, SectorAvg> {
  const buckets = new Map<
    string,
    { pers: number[]; pbrs: number[] }
  >();

  for (const item of items) {
    if (!item.sector) continue;
    if (!buckets.has(item.sector)) {
      buckets.set(item.sector, { pers: [], pbrs: [] });
    }
    const b = buckets.get(item.sector)!;

    if (item.per !== null && item.per > 0 && item.per < 200) {
      b.pers.push(item.per);
    }
    if (item.pbr !== null && item.pbr > 0 && item.pbr < 20) {
      b.pbrs.push(item.pbr);
    }
  }

  const result = new Map<string, SectorAvg>();

  for (const [sector, b] of buckets) {
    // 유효 종목 3개 미만이면 산정 불가
    if (b.pers.length < 3 && b.pbrs.length < 3) continue;

    const avgPer =
      b.pers.length >= 3
        ? b.pers.reduce((a, c) => a + c, 0) / b.pers.length
        : 0;
    const avgPbr =
      b.pbrs.length >= 3
        ? b.pbrs.reduce((a, c) => a + c, 0) / b.pbrs.length
        : 0;

    result.set(sector, {
      avgPer,
      avgPbr,
      count: Math.max(b.pers.length, b.pbrs.length),
    });
  }

  return result;
}

/**
 * 품질 점수 계산 (0.0 ~ 1.0)
 * - ROE 30%, 영업이익률 25%, 부채비율 20%, 매출성장률 15%, 현금흐름 10%
 * - 금융업종: 부채비율·영업이익률 중립(0.5) 고정
 * - DART 데이터 없으면 null 반환
 */
export function calcQualityScore(
  financial: FinancialData | null,
  sector: string | null,
  eps: number | null
): number | null {
  if (!financial) return null;

  const { roe, debtRatio, operatingMargin, revenueGrowth, cashFromOps } = financial;

  // 모든 필드가 null이면 데이터 없음
  if (roe === null && debtRatio === null && operatingMargin === null &&
      revenueGrowth === null && cashFromOps === null) {
    return null;
  }

  const isFin = isFinancialSector(sector);

  // ROE 점수 (30%)
  let roeScore = 0.5;
  if (eps !== null && eps < 0) {
    roeScore = 0.1;
  } else if (roe !== null) {
    if (roe >= 20) roeScore = 1.0;
    else if (roe >= 10) roeScore = 0.7;
    else if (roe >= 5) roeScore = 0.5;
    else if (roe >= 0) roeScore = 0.3;
    else roeScore = 0.1;
  }

  // 영업이익률 점수 (25%) — 금융업종 중립
  let omScore = 0.5;
  if (!isFin && operatingMargin !== null) {
    if (operatingMargin >= 20) omScore = 1.0;
    else if (operatingMargin >= 10) omScore = 0.7;
    else if (operatingMargin >= 5) omScore = 0.5;
    else if (operatingMargin >= 0) omScore = 0.3;
    else omScore = 0.1;
  }

  // 부채비율 점수 (20%) — 금융업종 중립
  let drScore = 0.5;
  if (!isFin && debtRatio !== null) {
    if (debtRatio < 50) drScore = 1.0;
    else if (debtRatio < 100) drScore = 0.7;
    else if (debtRatio < 150) drScore = 0.5;
    else if (debtRatio < 200) drScore = 0.3;
    else if (debtRatio < 300) drScore = 0.1;
    else drScore = 0.1;
  }

  // 매출성장률 점수 (15%)
  let rgScore = 0.5;
  let rgWeight = 0.15;
  if (revenueGrowth !== null) {
    if (revenueGrowth >= 30) rgScore = 1.0;
    else if (revenueGrowth >= 10) rgScore = 0.7;
    else if (revenueGrowth >= 0) rgScore = 0.5;
    else if (revenueGrowth >= -10) rgScore = 0.3;
    else rgScore = 0.1;
  } else {
    // 신규 상장 등 성장률 없으면 가중치 제외
    rgWeight = 0;
  }

  // 현금흐름 점수 (10%)
  let cfScore = 0.5;
  if (cashFromOps !== null) {
    const cfBillions = cashFromOps / 100_000_000; // 억 단위
    if (cfBillions > 100) cfScore = 1.0;
    else if (cfBillions > 0) cfScore = 0.7;
    else if (cfBillions > -10) cfScore = 0.5;
    else if (cfBillions > -100) cfScore = 0.3;
    else cfScore = 0.1;
  }

  // 가중 합계 (매출성장률 없으면 나머지 가중치로 정규화)
  const totalWeight = 0.30 + 0.25 + 0.20 + rgWeight + 0.10;
  const score = (
    roeScore * 0.30 +
    omScore * 0.25 +
    drScore * 0.20 +
    rgScore * rgWeight +
    cfScore * 0.10
  ) / totalWeight;

  return Math.round(score * 100) / 100;
}

/**
 * 품질 점수를 multiplier로 변환 (0.7 ~ 1.3)
 * score 0 → 0.7, score 0.5 → 1.0, score 1.0 → 1.3
 */
export function qualityMultiplier(score: number | null): number {
  if (score === null) return 1.0;
  return 0.7 + score * 0.6;
}

/**
 * 적정가 계산 (품질 조정)
 * - EPS·BPS 둘 다 있으면 blended (평균)
 * - 하나만 있으면 해당 방법만 사용
 * - 적자(EPS < 0)이면 자산 기반만 사용
 * - upside ±200% 캡
 * - quality multiplier 적용
 */
export function calcFairValue(
  eps: number | null,
  bps: number | null,
  closePrice: number,
  sectorAvg: SectorAvg,
  financial?: FinancialData | null,
  sector?: string | null
): FairValueResult | null {
  if (closePrice <= 0) return null;

  const earningsFV =
    eps !== null && eps > 0 && sectorAvg.avgPer > 0
      ? sectorAvg.avgPer * eps
      : null;

  const assetFV =
    bps !== null && bps > 0 && sectorAvg.avgPbr > 0
      ? sectorAvg.avgPbr * bps
      : null;

  let baseFairValue: number;
  let method: FairValueResult["method"];

  if (earningsFV !== null && assetFV !== null) {
    baseFairValue = (earningsFV + assetFV) / 2;
    method = "blended";
  } else if (earningsFV !== null) {
    baseFairValue = earningsFV;
    method = "earnings";
  } else if (assetFV !== null) {
    baseFairValue = assetFV;
    method = "asset";
  } else {
    return null;
  }

  // 음수 적정가 방지
  if (baseFairValue <= 0) return null;

  // 품질 점수 & multiplier
  const qScore = calcQualityScore(financial ?? null, sector ?? null, eps);
  const qMult = qualityMultiplier(qScore);
  const fairValue = baseFairValue * qMult;

  const upsidePct = ((fairValue - closePrice) / closePrice) * 100;

  return {
    fairValue: Math.round(fairValue),
    upsidePct: Math.round(upsidePct * 10) / 10,
    method,
    qualityMultiplier: Math.round(qMult * 100) / 100,
    qualityScore: qScore !== null ? Math.round(qScore * 100) / 100 : -1,
  };
}
