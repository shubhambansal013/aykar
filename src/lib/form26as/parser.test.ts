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

  it('should parse realistic multi-line Form 26AS with separate TAN/Name lines and multiple transactions', () => {
    const text = `
PART A - Details of Tax Deducted at Source
Name of the Deductor : OPTUM GLOBAL SOLUTIONS INDIA PRIVATE LIMITED
TAN of the Deductor : HYDQ00152F
S.No. Section Date of Transaction Status of Booking Amount Paid (Rs.) Tax Deducted (Rs.) TDS Deposited (Rs.)
1 192 15/05/2023 F 1,00,000.00 10,000.00 10,000.00
2 192 15/06/2023 F 1,00,000.00 10,000.00 10,000.00
Total 2,00,000.00 20,000.00 20,000.00

Name of Deductor: HDFC BANK LIMITED
TAN of Deductor: ABCD12345E
S.No. Section Date Status Amount Paid Tax Deducted TDS Deposited
1 194A 30/06/2023 F 50,000.00 5,000.00 5,000.00
2 194A 30/09/2023 F 50,000.00 5,000.00 5,000.00
Total u/s 194A: 1,00,000.00 10,000.00 10,000.00

PART B - Details of Tax Collected at Source
Collector Name: AUTO DEALER INDIA
TAN of Collector: XYZD98765A
S.No. Section Date Status Amount Collected Tax Deposited
1 206C 12/10/2023 F 1,20,000.00 12,000.00 12,000.00

PART C - Details of Tax Paid (other than TDS or TCS)
S.No. Minor Head BSR Code Date of Deposit Challan Serial No Tax (Rs.)
1 Minor Head 100 1234567 15/12/2023 00123 50,000.00
2 Minor Head 300 7654321 20/07/2024 54321 15,000.00
    `;

    const parsed = parseForm26ASText(text);
    expect(parsed.tdsSalary).toHaveLength(1);
    expect(parsed.tdsSalary[0]).toEqual({
      tan: 'HYDQ00152F',
      deductorName: 'OPTUM GLOBAL SOLUTIONS INDIA PRIVATE LIMITED',
      amount: 20000, // 10,000 + 10,000. Total line is skipped.
    });
    expect(parsed.tdsOther).toHaveLength(1);
    expect(parsed.tdsOther[0]).toEqual({
      tan: 'ABCD12345E',
      deductorName: 'HDFC BANK LIMITED',
      section: '194A',
      amount: 10000, // 5,000 + 5,000. Total line is skipped.
    });
    expect(parsed.tcsDetails).toHaveLength(1);
    expect(parsed.tcsDetails[0]).toEqual({
      collectorName: 'AUTO DEALER INDIA',
      amount: 12000,
    });
    expect(parsed.advanceTax).toHaveLength(1);
    expect(parsed.advanceTax[0]).toEqual({
      bsrCode: '1234567',
      date: '15/12/2023',
      challanNo: '00123',
      amount: 50000,
    });
    expect(parsed.selfAssessmentTax).toHaveLength(1);
    expect(parsed.selfAssessmentTax[0]).toEqual({
      bsrCode: '7654321',
      date: '20/07/2024',
      challanNo: '54321',
      amount: 15000,
    });
  });
});
