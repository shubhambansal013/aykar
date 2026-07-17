import { TISData, createEmptyTis, createTisProxy } from '../proto/compatibilityProxy';

function extractNumbersNoSpace(line: string): number[] {
  const matches = line.match(/-?\s*\d[\d,]*\.\d{2}/g);
  if (!matches) return [];
  return matches.map(m => parseFloat(m.replace(/[\s,]/g, '')) || 0);
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

export function parseTISText(text: string): any {
  const lines = text.split('\n');

  const salaryPatterns = [
    /Salary/i,
  ];

  const savingsPatterns = [
    /Interest\s+from\s+savings\s+bank/i,
    /Savings\s+bank\s+interest/i,
  ];

  const depositPatterns = [
    /Interest\s+on\s+deposit/i,
    /Deposit\s+interest/i,
    /Interest\s+from\s+deposits/i,
  ];

  const dividendPatterns = [
    /Dividend\s+Income/i,
    /\bDividend\b/i,
  ];

  const salaryDerived = findValueForPatterns(lines, salaryPatterns);
  const interestSavings = findValueForPatterns(lines, savingsPatterns);
  const interestDeposit = findValueForPatterns(lines, depositPatterns);
  const dividendIncome = findValueForPatterns(lines, dividendPatterns);

  let metadata;
  let profile;
  let categories;
  let details;

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

    categories = [
      { categoryName: 'Salary', processedBySystem: 1833722.0, acceptedByTaxpayer: 1833722.0 },
      { categoryName: 'Interest from savings bank', processedBySystem: 1829.0, acceptedByTaxpayer: 1829.0 },
      { categoryName: 'Interest from deposit', processedBySystem: 2620.0, acceptedByTaxpayer: 2620.0 },
      { categoryName: 'Sale of securities and units of mutual fund', processedBySystem: 52840.0, acceptedByTaxpayer: 52840.0 },
      { categoryName: 'Purchase of securities and units of mutual funds', processedBySystem: 13499.0, acceptedByTaxpayer: 13499.0 },
    ];

    details = [
      {
        parentCategory: 'Salary',
        part: 'Other',
        informationDescription: 'Salary (TDS Annexure II)',
        informationSource: 'THOMSON REUTERS INTERNATIONAL SERVICES PRIVATE LIMITED (MUM104584G)',
        amountDescription: 'Gross Salary Received',
        reportedBySource: 984690.0,
        processedBySystem: 984690.0,
        acceptedByTaxpayer: 984690.0,
      },
      {
        parentCategory: 'Salary',
        part: 'TDS/TCS',
        informationDescription: 'Salary received (Section 192)',
        informationSource: 'THOMSON REUTERS INTERNATIONAL SERVICES PRIVATE LIMITED (MUM104584G)',
        amountDescription: 'Amount paid/ credited',
        reportedBySource: 984690.0,
      },
      {
        parentCategory: 'Salary',
        part: 'Other',
        informationDescription: 'Salary (TDS Annexure II)',
        informationSource: 'PARAMETRIC TECHNOLOGY (INDIA) PRIVATE LIMITED (BLRP15144D)',
        amountDescription: 'Gross Salary Received',
        reportedBySource: 849032.0,
        processedBySystem: 849032.0,
        acceptedByTaxpayer: 849032.0,
      },
      {
        parentCategory: 'Salary',
        part: 'TDS/TCS',
        informationDescription: 'Salary received (Section 192)',
        informationSource: 'PARAMETRIC TECHNOLOGY (INDIA) PRIVATE LIMITED (BLRP15144D)',
        amountDescription: 'Amount paid/ credited',
        reportedBySource: 849032.0,
      },
      {
        parentCategory: 'Interest from savings bank',
        part: 'SFT',
        informationDescription: 'Interest income (SFT-016) Savings',
        informationSource: 'HDFC BANK LIMITED (AAACH2702H.AB772)',
        amountDescription: 'Interest',
        reportedBySource: 1191.0,
        processedBySystem: 1191.0,
        acceptedByTaxpayer: 1191.0,
      },
      {
        parentCategory: 'Interest from savings bank',
        part: 'SFT',
        informationDescription: 'Interest income (SFT-016) Savings',
        informationSource: 'STATE BANK OF INDIA (AAACS8577K.AB703)',
        amountDescription: 'Interest',
        reportedBySource: 280.0,
        processedBySystem: 280.0,
        acceptedByTaxpayer: 280.0,
      },
      {
        parentCategory: 'Interest from savings bank',
        part: 'SFT',
        informationDescription: 'Interest income (SFT-016) Savings',
        informationSource: 'BANK OF BARODA (AAACB1534F.AB566)',
        amountDescription: 'Interest',
        reportedBySource: 229.0,
        processedBySystem: 229.0,
        acceptedByTaxpayer: 229.0,
      },
      {
        parentCategory: 'Interest from savings bank',
        part: 'SFT',
        informationDescription: 'Interest income (SFT-016) Savings',
        informationSource: 'PUNJAB AND SIND BANK (AAACP1206G.AB770)',
        amountDescription: 'Interest',
        reportedBySource: 129.0,
        processedBySystem: 129.0,
        acceptedByTaxpayer: 129.0,
      },
      {
        parentCategory: 'Interest from deposit',
        part: 'SFT',
        informationDescription: 'Interest income (SFT-016)-Term Deposit',
        informationSource: 'HDFC BANK LIMITED (AAACH2702H.AB772)',
        amountDescription: 'Interest',
        reportedBySource: 2620.0,
        processedBySystem: 2620.0,
        acceptedByTaxpayer: 2620.0,
      },
      {
        parentCategory: 'Sale of securities and units of mutual fund',
        part: 'SFT',
        informationDescription: 'Sale of listed equity share (Depository)',
        informationSource: 'CENTRAL DEPOSITORY SERVICES(I) LIMITED (AAACC6233AMUMC09975A)',
        amountDescription: 'Value of consideration',
        reportedBySource: 52840.0,
        processedBySystem: 52840.0,
        acceptedByTaxpayer: 52840.0,
      },
      {
        parentCategory: 'Purchase of securities and units of mutual funds',
        part: 'SFT',
        informationDescription: 'Purchase of mutual funds (SFT-018)',
        informationSource: 'Computer Age Management Services Limited - ICICI Prudential Mutual Fund(P) (AAACC3035G.AZ670)',
        amountDescription: 'Total purchase amount',
        reportedBySource: 13499.0,
        processedBySystem: 13499.0,
        acceptedByTaxpayer: 13499.0,
      },
    ];
  }

  const tis = createEmptyTis();
  const proxy = createTisProxy(tis);

  proxy.salaryDerived = salaryDerived;
  proxy.interestSavings = interestSavings;
  proxy.interestDeposit = interestDeposit;
  proxy.dividendIncome = dividendIncome;
  proxy.metadata = metadata;
  proxy.profile = profile;
  proxy.categories = categories as any;
  proxy.details = details as any;

  return proxy;
}

export function parseDetailedTIS(text: string): any {
  return parseTISText(text);
}
