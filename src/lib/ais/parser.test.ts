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

  it('should parse realistic multi-line tabular AIS with separate labels and values', () => {
    const text = `
Annual Information Statement
Part B - Tax Deducted at Source (TDS)
Name of Deductor: ICICI BANK LIMITED
TAN of Deductor: MUMI01234F
Section: 194A
Transaction Details:
1 194A 15/07/2023 F 2,500.00
2 194A 15/10/2023 F 2,500.00

SFT Information:
Savings bank interest
State Bank of India
Reported Value: 10,000.00
Derived Value: 10,200.00

Interest on deposits
HDFC Bank
Reported Value: 20,000.00
Derived Value: 22,000.00

Dividend Income
Reliance Industries Ltd
Reported Value: 3,000.00
Derived Value: 3,500.00
    `;

    const parsed = parseAISText(text);
    expect(parsed.interestSavings).toBe(10200);
    expect(parsed.interestDeposit).toBe(22000);
    expect(parsed.dividendIncome).toBe(3500);
    expect(parsed.tdsDetails).toHaveLength(1);
    expect(parsed.tdsDetails[0]).toEqual({
      tan: 'MUMI01234F',
      deductorName: 'ICICI BANK LIMITED',
      section: '194A',
      amount: 5000, // 2,500 + 2,500
    });
  });

  it('should parse security sales transactions and calculate STCG and LTCG(112A) correctly', () => {
    const text = `
------------------------------------------------------------------------------------- Annual Information Statement (Part B) --------------------------------------------------------------------------------------
 (All amount values are in INR)
 Part B2-Information relating to specified financial transaction (SFT)
 Sale of securities and units of mutual fund
 SR. NO.   INFORMATION CODE    INFORMATION DESCRIPTION    INFORMATION SOURCE    COUNT   AMOUNT
6   SFT-17-LES(M)    Sale of listed equity share (Depository)    CENTRAL DEPOSITORY SERVICES(I) LIMITED  3   52,840.00
(AAACC6233AMUMC09975A)
SR. DATE OF SALE/ SECURITY NAME (SECURITY CODE)     SECURITY DEBIT CREDIT ASSET QUANTITY   SALE PRICE SALES COST OF UNIT FAIR INDEXED COST OF STATUS
NO. TRANSFER  CLASS TYPE TYPE TYPE PER UNIT CONSIDERATION ACQUISITION FMV MARKET ACQUISITION
VALUE
1   25/02/2026   WAAREE ENERGIES LIMITED # EQUITY  Listed Market   Market   Long 5.00   3,001.00   15,005   7,515.00   0   0   0   Active
SHARES(INE377N01017)  Equity Share  term
 Download ID : CYXPA6852K202607050531     IP Address :
Generation Date : 05/07/2026, 05:31:10     Page 1 of 2
 PAN    Name    Financial Year
 CYXPA6852K    TARUSH ARORA    2025-26
SR. DATE OF SALE/ SECURITY NAME (SECURITY CODE)     SECURITY DEBIT CREDIT ASSET QUANTITY   SALE PRICE SALES COST OF UNIT FAIR INDEXED COST OF STATUS
NO. TRANSFER  CLASS TYPE TYPE TYPE PER UNIT CONSIDERATION ACQUISITION FMV MARKET ACQUISITION
VALUE
2   22/12/2025   ICICI PRUDENTIAL ASSET MANAGEMENT COMPANY  Listed Market   Market   Short 6.00   2,590.00   15,540   12,990.00   0   0   0   Active
LIMITED#NEW EQUITY SHARES WITH FV RE.1/-AFTER  Equity Share  term
SUB-DIVISION(INE346A01027)
3   15/10/2025   LG ELECTRONICS INDIA LIMITED # EQUITY  Listed Market   Market   Short 13.00   1,715.00   22,295   14,820.00   0   0   0   Active
SHARES(INE324D01010)  Equity Share  term
    `;

    const parsed = parseAISText(text);
    expect(parsed.shortTermCapitalGains).toBe(10025);
    expect(parsed.longTermCapitalGains112A).toBe(7490);

    const sft = (parsed as any).__bundle?.sftInfo;
    expect(sft).toBeDefined();
    expect(sft.securitySales).toHaveLength(3);

    const sale1 = sft.securitySales[0];
    expect(sale1.securityName).toBe('WAAREE ENERGIES LIMITED # EQUITY SHARES(INE377N01017)');
    expect(sale1.securityCodeIsin).toBe('INE377N01017');
    expect(sale1.assetType).toBe('Long term');
    expect(sale1.quantity).toBe(5);
    expect(sale1.salesConsideration).toBe(15005);
    expect(sale1.costOfAcquisition).toBe(7515);

    const sale2 = sft.securitySales[1];
    expect(sale2.securityName).toBe('ICICI PRUDENTIAL ASSET MANAGEMENT COMPANY LIMITED#NEW EQUITY SHARES WITH FV RE.1/-AFTER SUB-DIVISION(INE346A01027)');
    expect(sale2.securityCodeIsin).toBe('INE346A01027');
    expect(sale2.assetType).toBe('Short term');
    expect(sale2.quantity).toBe(6);
    expect(sale2.salesConsideration).toBe(15540);
    expect(sale2.costOfAcquisition).toBe(12990);

    const sale3 = sft.securitySales[2];
    expect(sale3.securityName).toBe('LG ELECTRONICS INDIA LIMITED # EQUITY SHARES(INE324D01010)');
    expect(sale3.securityCodeIsin).toBe('INE324D01010');
    expect(sale3.assetType).toBe('Short term');
    expect(sale3.quantity).toBe(13);
    expect(sale3.salesConsideration).toBe(22295);
    expect(sale3.costOfAcquisition).toBe(14820);
  });
});
