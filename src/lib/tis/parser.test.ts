import { describe, it, expect } from 'vitest';
import { parseTISText } from './parser';

describe('TIS Parser', () => {
  it('should parse derived values correctly', () => {
    const text = `
Taxpayer Information Summary
Salary: 1,250,000.00
Interest from savings bank: 15,200.00
Interest on deposit: 55,000.00
Dividend Income: 12,000.00
    `;

    const parsed = parseTISText(text);
    expect(parsed.salaryDerived).toBe(1250000);
    expect(parsed.interestSavings).toBe(15200);
    expect(parsed.interestDeposit).toBe(55000);
    expect(parsed.dividendIncome).toBe(12000);
  });

  it('should trigger fallback positional branches correctly', () => {
    const text = `
Salary from Optum 1,300,000.00
Interest from Savings Bank of amount 11,000.00
Interest from deposits of amount 41,000.00
Dividend of amount 7,100.00
    `;
    const parsed = parseTISText(text);
    expect(parsed.salaryDerived).toBe(1300000);
    expect(parsed.interestSavings).toBe(11000);
    expect(parsed.interestDeposit).toBe(41000);
    expect(parsed.dividendIncome).toBe(7100);
  });

  it('should parse realistic multi-line tabular TIS with separate labels and values', () => {
    const text = `
Taxpayer Information Summary
Salary
Reported Value: 1,200,000.00
Derived Value: 1,250,000.00

Interest from savings bank
Reported Value: 14,000.00
Derived Value: 15,200.00

Interest on deposits
Reported Value: 50,000.00
Derived Value: 55,000.00

Dividend Income
Reported Value: 10,000.00
Derived Value: 12,000.00
    `;

    const parsed = parseTISText(text);
    expect(parsed.salaryDerived).toBe(1250000);
    expect(parsed.interestSavings).toBe(15200);
    expect(parsed.interestDeposit).toBe(55000);
    expect(parsed.dividendIncome).toBe(12000);
  });
});
