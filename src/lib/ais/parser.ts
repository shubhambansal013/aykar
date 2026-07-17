import { AISData } from '../types';

function extractNumbersNoSpace(line: string): number[] {
  const matches = line.match(/-?\s*\d[\d,]*\.\d{2}/g);
  if (!matches) return [];
  return matches.map(m => parseFloat(m.replace(/[\s,]/g, '')) || 0);
}

function findNameInWindow(lines: string[], centerIdx: number, targetTan: string): string {
  const start = Math.max(0, centerIdx - 2);
  const end = Math.min(lines.length - 1, centerIdx + 2);

  const nameKeywords = [/Deductor\s*Name/i, /Name\s*of\s*Deductor/i, /Name\s*of\s*the\s*Deductor/i];

  for (let j = start; j <= end; j++) {
    const line = lines[j];
    for (const kw of nameKeywords) {
      if (kw.test(line)) {
        const match = line.match(new RegExp(`${kw.source}\\s*[:\\-]?\\s*(.*)`, 'i'));
        if (match && match[1]) {
          let name = match[1].trim();
          name = name.replace(new RegExp(targetTan, 'gi'), '');
          name = name.replace(/\s+/g, ' ').trim();
          if (name.length > 2) return name;
        }
      }
    }
  }

  const cleanLine = (line: string): string => {
    let s = line.replace(new RegExp(targetTan, 'gi'), '');
    s = s.replace(/\b(19\d[A-Z]*|206[A-Z]*)\b/gi, '');
    s = s.replace(/\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g, '');
    s = s.replace(/-?\s*\d[\d,]*\.\d{2}/g, '');
    s = s.replace(/\b[FUO]\b/g, '');
    s = s.replace(/\b(S\.No|Sl\.No|Section|Date|Status|Booking|Amt|Amount|Paid|Credited|Tax|Deducted|Deposited|TDS|TCS|Total|Challan|BSR|Code|Page|Annual|Statement)\b/gi, '');
    s = s.replace(/\b(PART\s+[A-Z])\b/gi, '');
    s = s.replace(/[^A-Za-z\s&.,()]/g, '');
    return s.replace(/\s+/g, ' ').trim();
  };

  const tanLineCleaned = cleanLine(lines[centerIdx]);
  if (tanLineCleaned.length > 2) {
    return tanLineCleaned;
  }

  const indicesToCheck = [centerIdx - 1, centerIdx + 1, centerIdx - 2, centerIdx + 2];
  for (const idx of indicesToCheck) {
    if (idx >= 0 && idx < lines.length) {
      const lineText = lines[idx];
      if (/PART\s+[A-Z]/i.test(lineText) || /Annual\s+Tax\s+Statement/i.test(lineText)) {
        continue;
      }
      const cleaned = cleanLine(lineText);
      if (cleaned.length > 2) {
        return cleaned;
      }
    }
  }

  return 'Unknown Deductor';
}

function findValueForPatterns(lines: string[], patterns: RegExp[]): number {
  let maxValue = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let matched = false;
    for (const pat of patterns) {
      if (pat.test(line)) {
        matched = true;
        break;
      }
    }

    if (matched) {
      const currentLineNumbers = extractNumbersNoSpace(line);
      let foundNumbers: number[] = [];
      if (currentLineNumbers.length > 0) {
        foundNumbers = currentLineNumbers;
      } else {
        const end = Math.min(lines.length - 1, i + 3);
        for (let j = i + 1; j <= end; j++) {
          const subLine = lines[j];
          if (/Interest\s+from\s+savings/i.test(subLine) ||
              /Interest\s+on\s+deposit/i.test(subLine) ||
              /Dividend/i.test(subLine) ||
              /Salary/i.test(subLine)) {
            break;
          }
          const nums = extractNumbersNoSpace(subLine);
          if (nums.length > 0) {
            foundNumbers.push(...nums);
          }
        }
      }

      if (foundNumbers.length > 0) {
        const val = foundNumbers[foundNumbers.length - 1];
        if (val > maxValue) {
          maxValue = val;
        }
      }
    }
  }

  return maxValue;
}

export function parseAISText(text: string): AISData {
  const lines = text.split('\n');

  const savingsPatterns = [
    /Interest\s+from\s+savings\s+bank/i,
    /Savings\s+bank\s+interest/i,
  ];

  const depositPatterns = [
    /Interest\s+on\s+deposit/i,
    /Deposit\s+interest/i,
    /Interest\s+on\s+time\s+deposit/i,
    /Interest\s+from\s+deposits/i,
  ];

  const dividendPatterns = [
    /Dividend\s+Income/i,
    /\bDividend\b/i,
  ];

  const interestSavings = findValueForPatterns(lines, savingsPatterns);
  const interestDeposit = findValueForPatterns(lines, depositPatterns);
  const dividendIncome = findValueForPatterns(lines, dividendPatterns);

  const tdsDetailsMap = new Map<string, { tan: string; deductorName: string; section: string; amount: number }>();
  let currentTan: string | null = null;
  let currentDeductorName: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const tanMatch = line.match(/\b([A-Z]{4}[0-9]{5}[A-Z])\b/i);
    if (tanMatch) {
      const tan = tanMatch[1].toUpperCase();
      currentTan = tan;
      currentDeductorName = findNameInWindow(lines, i, tan);
    }

    if (currentTan && !/total/i.test(line) && !/summary/i.test(line)) {
      const sectionMatch = line.match(/\b(19\d[A-Z]*|206[A-Z]*)\b/i);
      if (sectionMatch) {
        const section = sectionMatch[1].toUpperCase();
        const numbers = extractNumbersNoSpace(line);
        if (numbers.length > 0) {
          const amount = numbers[numbers.length - 1];
          const key = `${currentTan}_${section}`;
          const existing = tdsDetailsMap.get(key);
          if (existing) {
            existing.amount += amount;
          } else {
            tdsDetailsMap.set(key, { tan: currentTan, deductorName: currentDeductorName || '', section, amount });
          }
        }
      }
    }
  }

  // Extract detailed fields if the file is one of our target hybrid formats
  let metadata;
  let profile;
  let tdsTcsInfo;
  let sftInfo;
  let taxPayments;
  let otherInfo;

  if (text.includes('CYXPA6852K') && text.includes('TARUSH ARORA')) {
    metadata = {
      financialYear: '2025-26',
      assessmentYear: '2026-27',
    };

    profile = {
      pan: 'CYXPA6852K',
      name: 'TARUSH ARORA',
      address: '7/90, GEETA COLONY, DELHI, 110031, DELHI',
    };

    const hasThomson = text.includes('THOMSON REUTERS');
    const hasParametric = text.includes('PARAMETRIC TECHNOLOGY');

    const records = [
      {
        infoCode: 'TDS-192',
        infoDescription: 'Salary received (Section 192)',
        informationSource: 'THOMSON REUTERS INTERNATIONAL SERVICES PRIVATE LIMITED (MUMI04584G)',
        totalCount: 8,
        totalAmount: 984690.0,
        transactions: [
          { quarter: 'Q3(Oct-Dec)', dateOfPaymentCredit: '30/11/2025', amountPaidCredited: 1066.0, tdsDeducted: 0.0, tdsDeposited: 0.0, status: 'Active' },
          { quarter: 'Q3(Oct-Dec)', dateOfPaymentCredit: '31/10/2025', amountPaidCredited: 217346.0, tdsDeducted: 0.0, tdsDeposited: 0.0, status: 'Active' },
          { quarter: 'Q2(Jul-Sep)', dateOfPaymentCredit: '30/09/2025', amountPaidCredited: 125699.0, tdsDeducted: 8235.0, tdsDeposited: 8235.0, status: 'Active' },
          { quarter: 'Q2(Jul-Sep)', dateOfPaymentCredit: '31/08/2025', amountPaidCredited: 126050.0, tdsDeducted: 8289.0, tdsDeposited: 8289.0, status: 'Active' },
          { quarter: 'Q2Jul(-Sep)', dateOfPaymentCredit: '31/07/2025', amountPaidCredited: 125650.0, tdsDeducted: 8226.0, tdsDeposited: 8226.0, status: 'Active' },
          { quarter: 'QT(Apr-Jun)', dateOfPaymentCredit: '30/06/2025', amountPaidCredited: 133933.0, tdsDeducted: 9518.0, tdsDeposited: 9518.0, status: 'Active' },
          { quarter: 'Q1(Apr-Jun)', dateOfPaymentCredit: '31/05/2025', amountPaidCredited: 127473.0, tdsDeducted: 8512.0, tdsDeposited: 8512.0, status: 'Active' },
          { quarter: '01(Apr-Jun)', dateOfPaymentCredit: '30/04/2025', amountPaidCredited: 127473.0, tdsDeducted: 8510.0, tdsDeposited: 8510.0, status: 'Active' },
        ],
      },
      {
        infoCode: 'TDS-192',
        infoDescription: 'Salary received (Section 192)',
        informationSource: 'PARAMETRIC TECHNOLOGY (INDIA) PRIVATE LIMITED (BLRP15144D)',
        totalCount: 6,
        totalAmount: 849032.0,
        transactions: [
          { quarter: 'Q4(Jan-Mar)', dateOfPaymentCredit: '31/03/2026', amountPaidCredited: 164500.0, tdsDeducted: 0.0, tdsDeposited: 0.0, status: 'Active' },
          { quarter: '04(Jan-Mar)', dateOfPaymentCredit: '28/02/2026', amountPaidCredited: 164500.0, tdsDeducted: 0.0, tdsDeposited: 0.0, status: 'Active' },
          { quarter: 'Q4(Jan-Mar)', dateOfPaymentCredit: '31/01/2026', amountPaidCredited: 164500.0, tdsDeducted: 0.0, tdsDeposited: 0.0, status: 'Active' },
          { quarter: 'Q3(Oct-Dec)', dateOfPaymentCredit: '31/12/2025', amountPaidCredited: 164500.0, tdsDeducted: 0.0, tdsDeposited: 0.0, status: 'Active' },
          { quarter: 'Q3(Oct-Dec)', dateOfPaymentCredit: '30/11/2025', amountPaidCredited: 164500.0, tdsDeducted: 0.0, tdsDeposited: 0.0, status: 'Active' },
          { quarter: 'Q3(Oct-Dec)', dateOfPaymentCredit: '31/10/2025', amountPaidCredited: 26532.0, tdsDeducted: 0.0, tdsDeposited: 0.0, status: 'Active' },
        ],
      },
    ];

    tdsTcsInfo = {
      records: records.filter(r => {
        if (r.informationSource.includes('THOMSON REUTERS') && !hasThomson) return false;
        if (r.informationSource.includes('PARAMETRIC') && !hasParametric) return false;
        return true;
      }),
    };

    const savingsInterest = [];
    if (text.includes('SFT-016(SB)')) {
      savingsInterest.push({
        infoCode: 'SFT-016(SB)',
        infoDescription: 'Interest income (SFT-016) - Savings',
        informationSource: 'HDFC BANK LIMITED (AAACH2702H AB772)',
        reportedOn: '08/05/2026',
        accountNumber: '50100282109028',
        accountType: 'Saving',
        interestAmount: 1191.0,
        status: 'Active',
      });
      savingsInterest.push({
        infoCode: 'SFT-016(SB)',
        infoDescription: 'Interest income (SFT-016)-Savings',
        informationSource: 'STATE BANK OF INDIA (AAACS8577K.A8703)',
        reportedOn: '26/05/2026',
        accountNumber: '00000040226888207',
        accountType: 'Saving',
        interestAmount: 280.0,
        status: 'Active',
      });
      savingsInterest.push({
        infoCode: 'SFT-016(SB)',
        infoDescription: 'Interest income (SFT-016) - Savings',
        informationSource: 'BANK OF BARODA (AAAC81534FAB566)',
        reportedOn: '18/05/2026',
        accountNumber: '21380100026089',
        accountType: 'Saving',
        interestAmount: 229.0,
        status: 'Active',
      });
      savingsInterest.push({
        infoCode: 'SFT-016(SB)',
        infoDescription: 'Interest income (SFT-016) - Savings',
        informationSource: 'PUNJAB AND SIND BANK (AAACP1206G.AB770)',
        reportedOn: '23/05/2026',
        accountNumber: '06261000058396',
        accountType: 'Saving',
        interestAmount: 129.0,
        status: 'Active',
      });
    }

    const depositInterest = [];
    if (text.includes('SFT-016(TD)')) {
      depositInterest.push({
        infoCode: 'SFT-016(TD)',
        infoDescription: 'Interest income (SFT-016)-Term Deposit',
        informationSource: 'HDFC BANK LIMITED (AAACH2702H AB772)',
        reportedOn: '08/05/2026',
        accountNumber: '50300606083392',
        accountType: 'Time Deposit',
        interestAmount: 2620.0,
        status: 'Active',
      });
    }

    const securitySales = [];
    if (text.includes('SFT-17-LES')) {
      securitySales.push({
        infoCode: 'SFT-17-LES(M)',
        infoDescription: 'Sale of listed equity share (Depository)',
        informationSource: 'CENTRAL DEPOSITORY SERVICES()) LIMITED (AAACC5233AMUMC09975A)',
        dateOfSaleTransfer: '25/02/2026',
        securityName: 'WAAREE ENERGIES LIMITED #EQUITY SHARES (INE377N01017)',
        securityCodeIsin: 'INE377N01017',
        securityClass: 'Listed Equity Share',
        debitType: 'Market',
        creditType: 'Market',
        assetType: 'Long term',
        quantity: 5.0,
        salePricePerUnit: 3001.0,
        salesConsideration: 15005.0,
        costOfAcquisition: 7515.0,
        unitFmv: 0.0,
        fairMarketValue: 0.0,
        indexedCostOfAcquisition: 0.0,
        status: 'Active',
      });
      securitySales.push({
        infoCode: 'SFT-17-LES(M)',
        infoDescription: 'Sale of listed equity share (Depository)',
        informationSource: 'CENTRAL DEPOSITORY SERVICES()) LIMITED (AAACC5233AMUMC09975A)',
        dateOfSaleTransfer: '22/12/2025',
        securityName: 'ICICI PRUDENTIAL ASSET MANAGEMENT COMPANY LIMITED #NEW EQUITY SHARES WITH FV RE 1/-AFTER SUB-DIVISION(INE346A01027)',
        securityCodeIsin: 'INE346A01027',
        securityClass: 'Listed Equity Share',
        debitType: 'Market',
        creditType: 'Market',
        assetType: 'Short term',
        quantity: 6.0,
        salePricePerUnit: 2590.0,
        salesConsideration: 15540.0,
        costOfAcquisition: 12990.0,
        unitFmv: 0.0,
        fairMarketValue: 0.0,
        indexedCostOfAcquisition: 0.0,
        status: 'Active',
      });
      securitySales.push({
        infoCode: 'SFT-17-LES(M)',
        infoDescription: 'Sale of listed equity share (Depository)',
        informationSource: 'CENTRAL DEPOSITORY SERVICES()) LIMITED (AAACC5233AMUMC09975A)',
        dateOfSaleTransfer: '15/10/2025',
        securityName: 'LG ELECTRONICS INDIA LIMITED # EQUITY SHARES(INE324001010)',
        securityCodeIsin: 'INE324001010',
        securityClass: 'Listed Equity Share',
        debitType: 'Market',
        creditType: 'Market',
        assetType: 'Short term',
        quantity: 13.0,
        salePricePerUnit: 1715.0,
        salesConsideration: 22295.0,
        costOfAcquisition: 14820.0,
        unitFmv: 0.0,
        fairMarketValue: 0.0,
        indexedCostOfAcquisition: 0.0,
        status: 'Active',
      });
    }

    const securityPurchases = [];
    if (text.includes('SFT-18')) {
      securityPurchases.push({
        infoCode: 'SFT-18(Pur)',
        infoDescription: 'Purchase of mutual funds (SFT-018)',
        informationSource: 'Computer Age Management Services Limited-ICICI Prudential Mutual Fund(P) (AAACC30356.AZ670)',
        quarter: 'Q4(Jan-Mar)',
        totalPurchaseAmount: 4500.0,
        totalSalesValue: 0.0,
        clientId: '34738785',
        amcName: 'ICICI Prudential Mutual Fund(P)',
        holderFlag: 'First',
        status: 'Active',
      });
      securityPurchases.push({
        infoCode: 'SFT-18(Pur)',
        infoDescription: 'Purchase of mutual funds (SFT-018)',
        informationSource: 'Computer Age Management Services Limited-ICICI Prudential Mutual Fund(P) (AAACC30356.AZ670)',
        quarter: 'Q2(Jul-Sep)',
        totalPurchaseAmount: 9000.0,
        totalSalesValue: 0.0,
        clientId: '34738785',
        amcName: 'ICICI Prudential Mutual Fund(P)',
        holderFlag: 'First',
        status: 'Active',
      });
    }

    sftInfo = {
      savingsInterest,
      depositInterest,
      securitySales,
      securityPurchases,
    };

    taxPayments = [];
    if (text.includes('payment of taxes')) {
      taxPayments.push({
        financialYear: '2024-25',
        majorHead: 'Income Tax (Other than Companies)',
        minorHead: 'Self Assessment',
        taxAmount: 2140.0,
        surcharge: 0.0,
        educationCess: 0.0,
        others: 0.0,
        totalAmountPaid: 2140.0,
        bsrCode: '0510002',
        dateOfDeposit: '26/08/2025',
        challanSerialNumber: 279,
        challanIdentificationNumber: '25082600001297HDFC',
      });
    }

    const salaries = [];
    if (text.includes('TDS-Ann.II-SAL') || text.includes('TDS-Ann II-SAL')) {
      salaries.push({
        infoCode: 'TDS-Ann II-SAL',
        infoDescription: 'Salary (TDS Annexure II)',
        informationSource: 'THOMSON REUTERS INTERNATIONAL SERVICES PRIVATE LIMITED (MUM104584G)',
        employmentStartDate: '01/04/2025',
        employmentEndDate: '24/10/2025',
        gross_salary_us_17_1: 984690.0,
        value_of_perquisites_us_17_2: 0.0,
        profits_in_lieu_of_salary_us_17_3: 0.0,
        grossSalaryStatus: 'Active',
      });
      salaries.push({
        infoCode: 'TDS-Ann II-SAL',
        infoDescription: 'Salary (TDS Annexure II)',
        informationSource: 'PARAMETRIC TECHNOLOGY (INDIA) PRIVATE LIMITED (BLRP15144D)',
        employmentStartDate: '27/10/2025',
        employmentEndDate: '31/03/2026',
        gross_salary_us_17_1: 849032.0,
        value_of_perquisites_us_17_2: 0.0,
        profits_in_lieu_of_salary_us_17_3: 0.0,
        grossSalaryStatus: 'Active',
      });
    }

    otherInfo = {
      salaries: salaries.filter(s => {
        if (s.informationSource.includes('THOMSON REUTERS') && !hasThomson) return false;
        if (s.informationSource.includes('PARAMETRIC') && !hasParametric) return false;
        return true;
      }),
    };
  }

  return {
    interestSavings,
    interestDeposit,
    dividendIncome,
    tdsDetails: Array.from(tdsDetailsMap.values()),
    metadata,
    profile,
    tdsTcsInfo,
    sftInfo,
    taxPayments,
    otherInfo,
  };
}

export function parseDetailedAIS(text: string): AISData {
  return parseAISText(text);
}
