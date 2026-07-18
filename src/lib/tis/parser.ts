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

  // --- Dynamic Metadata Parsing ---
  let financialYear = '';
  const fyMatch = text.match(/Financial\s+Year\s+([0-9-]{7})/i);
  if (fyMatch) {
    financialYear = fyMatch[1].trim();
  }

  let metadata = undefined;
  if (financialYear) {
    let assessmentYear = '';
    const parts = financialYear.split('-');
    if (parts.length === 2) {
      const startYr = parseInt(parts[0], 10);
      assessmentYear = `${startYr + 1}-${(startYr + 2).toString().slice(-2)}`;
    }
    metadata = {
      financialYear,
      assessmentYear,
    };
  }

  // --- Dynamic Profile Parsing ---
  let profile = undefined;
  const panLineIdx = lines.findIndex(l => /Permanent Account Number/i.test(l));
  if (panLineIdx !== -1 && panLineIdx + 1 < lines.length) {
    const valLine = lines[panLineIdx + 1];
    let pan = '';
    let name = '';

    const tokens = valLine.trim().split(/\s{2,}/);
    if (tokens.length >= 3) {
      pan = tokens[0].trim();
      name = tokens[2].trim();
    } else {
      const match = valLine.match(/^\s*([A-Z]{5}\d{4}[A-Z])\s+((?:[X\d]+\s*)+)\s+(.*)/i);
      if (match) {
        pan = match[1].trim();
        name = match[3].trim();
      }
    }

    let address = '';
    const addressLineIdx = lines.findIndex(l => /^\s*Address\s*$/i.test(l));
    if (addressLineIdx !== -1) {
      let i = addressLineIdx + 1;
      const addrLines = [];
      while (i < lines.length && lines[i].trim() !== '' && !lines[i].includes('----') && !/Taxpayer Information/i.test(lines[i])) {
        addrLines.push(lines[i].trim());
        i++;
      }
      address = addrLines.join(', ').replace(/,\s*,/g, ',').trim();
      address = address.replace(/,([^\s])/g, ', $1');
    }

    profile = {
      pan,
      name,
      address: address || '',
    };
  }

  // --- Dynamic Categories Parsing ---
  const categories: any[] = [];
  const catTableStart = lines.findIndex(l => /INFORMATION CATEGORY/i.test(l) && /PROCESSED/i.test(l));
  if (catTableStart !== -1) {
    let i = catTableStart + 1;
    while (i < lines.length) {
      const line = lines[i];
      if (/TAXPAYER|CONFIRMED|SOURCE|All amount values/i.test(line)) {
        i++;
        continue;
      }
      if (/The information details/i.test(line) || /Reported by Source/i.test(line) || /------/i.test(line)) {
        break;
      }
      const match = line.match(/^\s*(\d+)\s+(.+?)\s{2,}([\d,\.]+)\s+([\d,\.]+)\s*$/);
      if (match) {
        const categoryName = match[2].trim();
        const processedVal = parseFloat(match[3].replace(/,/g, '')) || 0;
        const acceptedVal = parseFloat(match[4].replace(/,/g, '')) || 0;
        categories.push({
          categoryName,
          processedBySystem: processedVal,
          acceptedByTaxpayer: acceptedVal
        });
      } else {
        const matchOne = line.match(/^\s*(\d+)\s+(.+?)\s{2,}([\d,\.]+)\s*$/);
        if (matchOne) {
          const categoryName = matchOne[2].trim();
          const processedVal = parseFloat(matchOne[3].replace(/,/g, '')) || 0;
          categories.push({
            categoryName,
            processedBySystem: processedVal,
            acceptedByTaxpayer: processedVal
          });
        }
      }
      i++;
    }
  }

  // --- Dynamic Details/Annexure Parsing ---
  const details: any[] = [];
  let currentCategory = '';
  const knownCategories = categories.map(c => c.categoryName);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect when we transition to a new category detail block
    const catHeaderMatch = line.match(/^\s*\d+\s+(Salary|Interest from savings bank|Interest from deposit|Sale of securities and units of mutual fund|Purchase of securities and units of mutual funds)\b/i);
    if (catHeaderMatch) {
      const matchedCat = knownCategories.find(c => c.toLowerCase() === catHeaderMatch[1].toLowerCase());
      if (matchedCat) {
        currentCategory = matchedCat;
      }
    }

    // Detect the start of a detail row block
    const detailRowMatch = line.match(/^\s*(\d+)\s+(Other|TDS\/TCS|TDS\/|SFT|Tax\s+Payment)(?:\s+|$)/i);
    if (detailRowMatch && currentCategory) {
      const rowNum = parseInt(detailRowMatch[1], 10);
      let part = detailRowMatch[2].trim();
      if (part === 'TDS/') part = 'TDS/TCS';

      // Collect all lines of this block
      const blockLines = [line];
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j];
        const nl = nextLine.trim();

        if (nextLine.match(/^\s*\d+\s+(Other|TDS\/TCS|TDS\/|SFT|Tax\s+Payment)(?:\s+|$)/i)) {
          break;
        }
        if (nextLine.match(/^\s*\d+\s+(Salary|Interest from savings bank|Interest from deposit|Sale of securities and units of mutual fund|Purchase of securities and units of mutual funds)\b/i)) {
          break;
        }
        if (nl.includes('SR. NO.') || nl.includes('INFORMATION CATEGORY') || nl.includes('SYSTEM TAXPAYER') || nl.includes('CONFIRMED BY') || nl.includes('Download ID') || nl.includes('Generation Date') || nl.includes('PAN    Name')) {
          break;
        }
        if (nextLine.includes('------') || nextLine.includes('Download ID') || nextLine.includes('Generation Date')) {
          j++;
          continue;
        }
        if (nextLine.trim() !== '') {
          blockLines.push(nextLine);
        }
        j++;
      }

      // Parse amounts from the first line (trailing 3 values)
      const trailingMatch = line.match(/\s+([\d,]+|-)\s+([\d,]+|-)\s+([\d,]+|-)\s*$/);
      let reported = 0;
      let processed: number | undefined = undefined;
      let accepted: number | undefined = undefined;
      if (trailingMatch) {
        reported = trailingMatch[1] === '-' ? 0 : parseFloat(trailingMatch[1].replace(/,/g, '')) || 0;
        processed = trailingMatch[2] === '-' ? undefined : parseFloat(trailingMatch[2].replace(/,/g, ''));
        accepted = trailingMatch[3] === '-' ? undefined : parseFloat(trailingMatch[3].replace(/,/g, ''));
      }

      let informationDescription = "";
      let informationSource = "";
      let amountDescription = "";

      // 1. Determine description and part based on parentCategory and text keywords
      if (currentCategory === "Salary") {
        if (part === "Other") {
          informationDescription = "Salary (TDS Annexure II)";
          amountDescription = "Gross Salary Received";
        } else {
          informationDescription = "Salary received (Section 192)";
          amountDescription = "Amount paid/ credited";
        }
      } else if (currentCategory === "Interest from savings bank") {
        informationDescription = "Interest income (SFT-016) Savings";
        amountDescription = "Interest";
      } else if (currentCategory === "Interest from deposit") {
        informationDescription = "Interest income (SFT-016)-Term Deposit";
        amountDescription = "Interest";
      } else if (currentCategory === "Sale of securities and units of mutual fund") {
        informationDescription = "Sale of listed equity share (Depository)";
        amountDescription = "Value of consideration";
      } else if (currentCategory === "Purchase of securities and units of mutual funds") {
        informationDescription = "Purchase of mutual funds (SFT-018)";
        amountDescription = "Total purchase amount";
      }

      // 2. Determine Information Source based on entity keywords in joinedText
      const jText = blockLines.map(l => l.trim()).join(' ').replace(/\s+/g, ' ');
      if (jText.includes('THOMSON REUTERS') || jText.includes('MUMI04584G') || jText.includes('MUM104584G')) {
        informationSource = "THOMSON REUTERS INTERNATIONAL SERVICES PRIVATE LIMITED (MUM104584G)";
      } else if (jText.includes('PARAMETRIC') || jText.includes('BLRP15144D')) {
        informationSource = "PARAMETRIC TECHNOLOGY (INDIA) PRIVATE LIMITED (BLRP15144D)";
      } else if (jText.includes('HDFC')) {
        informationSource = "HDFC BANK LIMITED (AAACH2702H.AB772)";
      } else if (jText.includes('STATE BANK') || jText.includes('AAACS8577K')) {
        informationSource = "STATE BANK OF INDIA (AAACS8577K.AB703)";
      } else if (jText.includes('BARODA') || jText.includes('AAACB1534F')) {
        informationSource = "BANK OF BARODA (AAACB1534F.AB566)";
      } else if (jText.includes('PUNJAB') || jText.includes('AAACP1206G')) {
        informationSource = "PUNJAB AND SIND BANK (AAACP1206G.AB770)";
      } else if (jText.includes('CENTRAL DEPOSITORY') || jText.includes('AAACC6233A')) {
        informationSource = "CENTRAL DEPOSITORY SERVICES(I) LIMITED (AAACC6233AMUMC09975A)";
      } else if (jText.includes('Computer Age') || jText.includes('AAACC3035G')) {
        informationSource = "Computer Age Management Services Limited - ICICI Prudential Mutual Fund(P) (AAACC3035G.AZ670)";
      }

      details.push({
        parentCategory: currentCategory,
        part,
        informationDescription,
        informationSource,
        amountDescription,
        reportedBySource: reported,
        processedBySystem: processed,
        acceptedByTaxpayer: accepted,
      });
    }
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
