import { describe, it, expect } from 'vitest';
import { computeSurcharge, surchargeRateFor } from './surcharge';

const OLD_SLABS = [
  { limit: 250000, rate: 0.0 },
  { limit: 500000, rate: 0.05 },
  { limit: 1000000, rate: 0.20 },
  { limit: Infinity, rate: 0.30 },
];

describe('surchargeRateFor', () => {
  it('returns 0 up to ₹50 lakh', () => {
    expect(surchargeRateFor('OLD', 5_000_000)).toBe(0);
    expect(surchargeRateFor('NEW', 4_999_999)).toBe(0);
  });

  it('returns 10% between ₹50 lakh and ₹1 crore', () => {
    expect(surchargeRateFor('OLD', 5_000_001)).toBe(0.10);
    expect(surchargeRateFor('NEW', 10_000_000)).toBe(0.10);
  });

  it('returns 15% between ₹1 crore and ₹2 crore', () => {
    expect(surchargeRateFor('OLD', 10_000_001)).toBe(0.15);
    expect(surchargeRateFor('NEW', 20_000_000)).toBe(0.15);
  });

  it('returns 25% between ₹2 crore and ₹5 crore', () => {
    expect(surchargeRateFor('OLD', 20_000_001)).toBe(0.25);
    expect(surchargeRateFor('NEW', 50_000_000)).toBe(0.25);
  });

  it('caps the new regime top rate at 25% but keeps 37% in the old regime above ₹5 crore', () => {
    expect(surchargeRateFor('NEW', 50_000_001)).toBe(0.25);
    expect(surchargeRateFor('OLD', 50_000_001)).toBe(0.37);
  });
});

describe('computeSurcharge', () => {
  it('returns zero surcharge below the ₹50 lakh threshold', () => {
    const result = computeSurcharge({
      regime: 'OLD',
      totalIncome: 4_000_000,
      taxAfterRebate: 800_000,
      slabRates: OLD_SLABS,
      stcgAt20: 0,
      ltcg112a: 0,
      stcgTax: 0,
      ltcgTax: 0,
    });
    expect(result).toEqual({ rate: 0, surcharge: 0, marginalRelief: 0 });
  });

  it('applies 10% surcharge at ₹62.5 lakh without marginal relief', () => {
    const result = computeSurcharge({
      regime: 'OLD',
      totalIncome: 6_250_000,
      taxAfterRebate: 1_687_500,
      slabRates: OLD_SLABS,
      stcgAt20: 0,
      ltcg112a: 0,
      stcgTax: 0,
      ltcgTax: 0,
    });
    // tax on threshold (₹50L) = 13,12,500; cap = 13,12,500 + 12,50,000 - 16,87,500 = 8,75,000
    expect(result.rate).toBe(0.10);
    expect(result.surcharge).toBe(168_750);
    expect(result.marginalRelief).toBe(0);
  });

  it('grants marginal relief just above the ₹50 lakh threshold', () => {
    const result = computeSurcharge({
      regime: 'OLD',
      totalIncome: 5_050_000,
      taxAfterRebate: 1_327_500,
      slabRates: OLD_SLABS,
      stcgAt20: 0,
      ltcg112a: 0,
      stcgTax: 0,
      ltcgTax: 0,
    });
    // cap = 13,12,500 + 50,000 - 13,27,500 = 35,000; raw = 1,32,750
    expect(result.surcharge).toBe(35_000);
    expect(result.marginalRelief).toBe(97_750);
  });

  it('caps surcharge on capital gains u/s 111A/112A at 15% even in the 25% band', () => {
    const result = computeSurcharge({
      regime: 'OLD',
      totalIncome: 30_000_000,
      taxAfterRebate: 7_000_000,
      slabRates: OLD_SLABS,
      stcgAt20: 5_000_000,
      ltcg112a: 0,
      stcgTax: 1_000_000,
      ltcgTax: 0,
    });
    // normal tax = 60L -> 60L * 25% = 15L; CG tax = 10L -> 10L * 15% = 1.5L
    // without cap it would be 70L * 25% = 17.5L
    expect(result.rate).toBe(0.25);
    expect(result.surcharge).toBe(1_650_000);
    expect(result.marginalRelief).toBe(0);
  });
});
