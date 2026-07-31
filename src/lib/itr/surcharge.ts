export type TaxRegime = 'OLD' | 'NEW';

export interface SurchargeSlab {
  limit: number;
  rate: number;
}

export interface SurchargeInput {
  regime: TaxRegime;
  totalIncome: number;
  taxAfterRebate: number;
  slabRates: SurchargeSlab[];
  stcgAt20: number;
  ltcg112a: number;
  stcgTax: number;
  ltcgTax: number;
}

export interface SurchargeResult {
  rate: number;
  surcharge: number;
  marginalRelief: number;
}

export const SURCHARGE_THRESHOLD = 5_000_000;

const NEW_REGIME_MAX_RATE = 0.25;
const OLD_REGIME_MAX_RATE = 0.37;
const CG_SURCHARGE_CAP = 0.15;

export function surchargeRateFor(regime: TaxRegime, totalIncome: number): number {
  if (totalIncome <= 5_000_000) return 0;
  if (totalIncome <= 10_000_000) return 0.10;
  if (totalIncome <= 20_000_000) return 0.15;
  if (totalIncome <= 50_000_000) return 0.25;
  return regime === 'NEW' ? NEW_REGIME_MAX_RATE : OLD_REGIME_MAX_RATE;
}

function surchargeThreshold(totalIncome: number): number {
  if (totalIncome > 50_000_000) return 50_000_000;
  if (totalIncome > 20_000_000) return 20_000_000;
  if (totalIncome > 10_000_000) return 10_000_000;
  return 5_000_000;
}

function slabTax(income: number, slabs: SurchargeSlab[]): number {
  let prevLimit = 0;
  let total = 0;
  for (const slab of slabs) {
    if (income <= prevLimit) break;
    const taxable = Math.min(income, slab.limit) - prevLimit;
    if (taxable > 0) {
      total += taxable * slab.rate;
    }
    prevLimit = slab.limit;
  }
  return total;
}

export function computeSurcharge(input: SurchargeInput): SurchargeResult {
  const { regime, totalIncome, taxAfterRebate, slabRates, stcgAt20, ltcg112a, stcgTax, ltcgTax } = input;

  if (totalIncome <= SURCHARGE_THRESHOLD) {
    return { rate: 0, surcharge: 0, marginalRelief: 0 };
  }

  const rate = surchargeRateFor(regime, totalIncome);
  const threshold = surchargeThreshold(totalIncome);
  const rateAtThreshold = surchargeRateFor(regime, threshold);

  // Enhanced surcharge (25%/37%) is not levied on tax on capital gains u/s 111A/112A
  // (and dividend income); the maximum surcharge on such tax is capped at 15%.
  const specialRateTax = stcgTax + ltcgTax;
  const normalTax = taxAfterRebate - specialRateTax;
  const rawSurcharge = normalTax * rate + specialRateTax * Math.min(rate, CG_SURCHARGE_CAP);

  // Marginal relief: income tax + surcharge must not exceed the income tax payable
  // on the lower surcharge threshold plus the income exceeding that threshold.
  const slabTaxableAtThreshold = Math.max(0, threshold - stcgAt20 - ltcg112a);
  const taxAtThreshold = slabTax(slabTaxableAtThreshold, slabRates) + stcgTax + ltcgTax;
  const surchargeAtThreshold = (taxAtThreshold - specialRateTax) * rateAtThreshold
    + specialRateTax * Math.min(rateAtThreshold, CG_SURCHARGE_CAP);

  const cap = Math.max(
    0,
    taxAtThreshold + surchargeAtThreshold + (totalIncome - threshold) - taxAfterRebate,
  );

  const surcharge = Math.min(rawSurcharge, cap);
  const marginalRelief = rawSurcharge - surcharge;

  return { rate, surcharge, marginalRelief };
}
