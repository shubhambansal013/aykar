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

  it('should extract TDS from Part B1 transaction detail rows, not from summary row amounts', () => {
    const text = `
 Annual Information Statement (AIS)     Financial Year   2025-26
 Part B1-Information relating to tax deducted or collected at source
 Salary
 SR. NO.   INFORMATION CODE    INFORMATION DESCRIPTION    INFORMATION SOURCE    COUNT   AMOUNT
 1   TDS-192    Salary received (Section 192)    THOMSON REUTERS INTERNATIONAL SERVICES PRIVATE LIMITED  8   9,84,690
(MUMI04584G)
 SR. NO.   QUARTER    DATE OF PAYMENT/CREDIT    AMOUNT PAID/CREDITED   TDS DEDUCTED   TDS DEPOSITED   STATUS
 1   Q3(Oct-Dec)    30/11/2025     1,066    0    0   Active
 2   Q3(Oct-Dec)    31/10/2025     2,17,346    0    0   Active
 3   Q2(Jul-Sep)    30/09/2025     1,25,699    8,235    8,235   Active
 4   Q2(Jul-Sep)    31/08/2025     1,26,050    8,289    8,289   Active
 5   Q2(Jul-Sep)    31/07/2025     1,25,650    8,226    8,226   Active
 6   Q1(Apr-Jun)    30/06/2025     1,33,933    9,518    9,518   Active
 7   Q1(Apr-Jun)    31/05/2025     1,27,473    8,512    8,512   Active
 8   Q1(Apr-Jun)    30/04/2025     1,27,473    8,510    8,510   Active
 SR. NO.   INFORMATION CODE    INFORMATION DESCRIPTION    INFORMATION SOURCE    COUNT   AMOUNT
 2   TDS-192    Salary received (Section 192)    PARAMETRIC TECHNOLOGY (INDIA) PRIVATE LIMITED (BLRP15144D)    6   8,49,032
 SR. NO.   QUARTER    DATE OF PAYMENT/CREDIT    AMOUNT PAID/CREDITED   TDS DEDUCTED   TDS DEPOSITED   STATUS
 1   Q4(Jan-Mar)    31/03/2026     1,64,500    0    0   Active
 2   Q4(Jan-Mar)    28/02/2026     1,64,500    0    0   Active
 3   Q4(Jan-Mar)    31/01/2026     1,64,500    0    0   Active
 4   Q3(Oct-Dec)    31/12/2025     1,64,500    0    0   Active
 5   Q3(Oct-Dec)    30/11/2025     1,64,500    0    0   Active
 6   Q3(Oct-Dec)    31/10/2025     26,532    0    0   Active
 Part B2-Information relating to specified financial transaction (SFT)
    `;

    const parsed = parseAISText(text);

    // The TDS DEDUCTED column values for Thomson Reuters sum to:
    // 0 + 0 + 8,235 + 8,289 + 8,226 + 9,518 + 8,512 + 8,510 = 51,290
    expect(parsed.tdsDetails).toHaveLength(1);
    expect(parsed.tdsDetails[0]).toMatchObject({
      tan: 'MUMI04584G',
      section: '192',
      amount: 51290,
    });

    // Parametric Technology (BLRP15144D) has zero TDS across all its transaction rows,
    // so it must NOT appear in tdsDetails — its summary row amount (8,49,032) is salary,
    // not TDS, and must not be extracted as TDS.
    expect(parsed.tdsDetails.find(t => t.tan === 'BLRP15144D')).toBeUndefined();
  });

  it('should handle multiple TDS sections and mixed TAN positions within Part B1', () => {
    const text = `
 Part B1-Information relating to tax deducted or collected at source
 Interest
 SR. NO.   INFORMATION CODE    INFORMATION DESCRIPTION    INFORMATION SOURCE    COUNT   AMOUNT
 1   TDS-194A    Interest (Section 194A)    HDFC BANK LIMITED (ABCD12345E)    4   45,000
 SR. NO.   QUARTER    DATE OF PAYMENT/CREDIT    AMOUNT PAID/CREDITED   TDS DEDUCTED   TDS DEPOSITED   STATUS
 1   Q1(Apr-Jun)    30/06/2025     15,000    3,000    3,000   Active
 2   Q1(Apr-Jun)    30/09/2025     15,000    3,000    3,000   Active
 3   Q1(Apr-Jun)    31/12/2025     10,000    2,000    2,000   Active
 4   Q1(Apr-Jun)    31/03/2026     5,000    1,000    1,000   Active
    `;

    const parsed = parseAISText(text);

    expect(parsed.tdsDetails).toHaveLength(1);
    expect(parsed.tdsDetails[0]).toMatchObject({
      tan: 'ABCD12345E',
      section: '194A',
      amount: 9000, // 3,000 + 3,000 + 2,000 + 1,000
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
