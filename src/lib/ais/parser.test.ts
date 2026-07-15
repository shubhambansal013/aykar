import { describe, it, expect } from 'vitest';
import { parseAISText } from './parser';

describe('AIS Parser', () => {
  it('should parse interest savings, deposit interest, dividend, and TDS rows correctly', () => {
    const text = `
Annual Information Statement
Interest from savings bank: 12,500.00
Interest on deposit: 45,000.00
Dividend Income: 8,200.00

TDS on Interest/Other details:
ABCD12345E HDFC BANK LIMITED 194A 4,500.00
HYDQ00152F OPTUM GLOBAL 192 150,000.00
    `;

    const parsed = parseAISText(text);
    expect(parsed.interestSavings).toBe(12500);
    expect(parsed.interestDeposit).toBe(45000);
    expect(parsed.dividendIncome).toBe(8200);
    expect(parsed.tdsDetails).toHaveLength(2);
    expect(parsed.tdsDetails[0]).toEqual({
      tan: 'ABCD12345E',
      deductorName: 'HDFC BANK LIMITED',
      section: '194A',
      amount: 4500,
    });
    expect(parsed.tdsDetails[1]).toEqual({
      tan: 'HYDQ00152F',
      deductorName: 'OPTUM GLOBAL',
      section: '192',
      amount: 150000,
    });
  });

  it('should trigger fallback positional branches correctly', () => {
    const text = `
Interest from Savings Bank of amount 11,000.00
Interest from deposits of amount 41,000.00
Dividend of amount 7,100.00
    `;
    const parsed = parseAISText(text);
    expect(parsed.interestSavings).toBe(11000);
    expect(parsed.interestDeposit).toBe(41000);
    expect(parsed.dividendIncome).toBe(7100);
  });
});
