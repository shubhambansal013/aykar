import { describe, it, expect } from 'vitest';
import { parseForm26ASText } from './parser';

describe('Form 26AS Parser', () => {
  it('should parse TDS u/s 192 (Salary), TDS other, TCS, Advance Tax and Self Assessment Tax correctly', () => {
    const text = `
Form 26AS Annual Tax Statement
PART A - Details of Tax Deducted at Source
HYDQ00152F OPTUM GLOBAL 192 1,769,096.00
ABCD12345E HDFC BANK LIMITED 194A 4,500.00

PART B - Details of Tax Collected at Source
XYZD98765A AUTO DEALER 12,000.00

PART C - Details of Tax Paid (other than TDS or TCS)
Advance Tax details:
1234567 15/12/2025 00123 50,000.00
Self Assessment Tax details:
7654321 20/07/2026 54321 15,000.00
    `;

    const parsed = parseForm26ASText(text);
    expect(parsed.tdsSalary).toHaveLength(1);
    expect(parsed.tdsSalary[0]).toEqual({
      tan: 'HYDQ00152F',
      deductorName: 'OPTUM GLOBAL',
      amount: 1769096,
    });
    expect(parsed.tdsOther).toHaveLength(1);
    expect(parsed.tdsOther[0]).toEqual({
      tan: 'ABCD12345E',
      deductorName: 'HDFC BANK LIMITED',
      section: '194A',
      amount: 4500,
    });
    expect(parsed.tcsDetails).toHaveLength(1);
    expect(parsed.tcsDetails[0]).toEqual({
      collectorName: 'AUTO DEALER',
      amount: 12000,
    });
    expect(parsed.advanceTax).toHaveLength(1);
    expect(parsed.advanceTax[0]).toEqual({
      bsrCode: '1234567',
      date: '15/12/2025',
      challanNo: '00123',
      amount: 50000,
    });
    expect(parsed.selfAssessmentTax).toHaveLength(1);
    expect(parsed.selfAssessmentTax[0]).toEqual({
      bsrCode: '7654321',
      date: '20/07/2026',
      challanNo: '54321',
      amount: 15000,
    });
  });
});
