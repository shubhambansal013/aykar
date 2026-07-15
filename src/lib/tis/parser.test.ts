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
});
