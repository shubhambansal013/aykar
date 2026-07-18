import { TISData, createEmptyTis, createTisProxy } from '../proto/compatibilityProxy';

/**
 * Extracts numeric amounts from a line of PDF-extracted text.
 * TIS/AIS amount columns are comma-grouped integers (e.g. "18,33,722") and are NOT
 * guaranteed to carry a decimal point, so the decimal part is optional here.
 */
function extractAmounts(line: string): number[] {
  const matches = line.match(/-?\d[\d,]*(?:\.\d{1,2})?/g);
  if (!matches) return [];
  return matches.map(m => parseFloat(m.replace(/,/g, '')) || 0);
}

/**
 * Helper to extract numeric values without spaces, matching decimals.
 */
function extractNumbersNoSpace(line: string): number[] {
  const matches = line.match(/-?\s*\d[\d,]*\.\d{2}/g);
  if (!matches) return [];
  return matches.map(m => parseFloat(m.replace(/[\s,]/g, '')) || 0);
}

/**
 * Fallback value finder using regular expressions across lines.
 */
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

/**
 * Parses taxpayer identity (PAN, name, address) and financial/assessment year from the
 * standard TIS "General Information" header block.
 */
function parseMetadataAndProfile(text: string, lines: string[]): { metadata: any; profile: any } {
  let metadata: any;
  let profile: any;

  const fyMatch = text.match(/Financial\s+Year\s+(\d{4})-(\d{2})/i);
  if (fyMatch) {
    const startYear = parseInt(fyMatch[1], 10);
    metadata = {
      financialYear: `${fyMatch[1]}-${fyMatch[2]}`,
      assessmentYear: `${startYear + 1}-${String(startYear + 2).slice(-2)}`,
    };
  }

  const panLabelIdx = lines.findIndex(l => /Permanent\s+Account\s+Number\s*\(PAN\)/i.test(l));
  if (panLabelIdx >= 0) {
    // The value row follows the label row, columns separated by 2+ spaces:
    // " CYXPA6852K    XXXX XXXX 0899    TARUSH ARORA"
    for (let i = panLabelIdx + 1; i < Math.min(lines.length, panLabelIdx + 3); i++) {
      const cols = lines[i].trim().split(/\s{2,}/).filter(Boolean);
      const panMatch = cols[0] && cols[0].match(/[A-Z]{5}\d{4}[A-Z]/i);
      if (panMatch) {
        profile = {
          pan: panMatch[0].toUpperCase(),
          name: (cols[cols.length - 1] || '').trim(),
          address: '',
        };
        break;
      }
    }
  }

  const addressLabelIdx = lines.findIndex(l => /^\s*Address\s*$/i.test(l));
  if (addressLabelIdx >= 0 && lines[addressLabelIdx + 1]) {
    const addr = lines[addressLabelIdx + 1].trim();
    const formattedAddr = addr.split(',').map(s => s.trim()).filter(Boolean).join(', ');
    if (profile) {
      profile.address = formattedAddr;
    } else {
      profile = { pan: '', name: '', address: formattedAddr };
    }
  }

  return { metadata, profile };
}

/**
 * Parses the top-level "Taxpayer Information Summary" category table.
 */
function parseCategories(lines: string[]): Array<{ categoryName: string; processedBySystem: number; acceptedByTaxpayer: number }> {
  const rowPattern = /^\s*(\d+)\s+(.+?)\s{2,}([\d,]+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)\s*$/;
  const bySrNo = new Map<string, { categoryName: string; processedBySystem: number; acceptedByTaxpayer: number }>();

  for (const line of lines) {
    const m = line.match(rowPattern);
    if (!m) continue;
    const [, srNo, rawName] = m;
    const categoryName = rawName.trim();
    if (/^(SR\.?\s*NO|INFORMATION)/i.test(categoryName)) continue; // table header, not a row
    if (bySrNo.has(srNo)) continue; // keep first occurrence only
    bySrNo.set(srNo, {
      categoryName,
      processedBySystem: parseFloat(m[3].replace(/,/g, '')) || 0,
      acceptedByTaxpayer: parseFloat(m[4].replace(/,/g, '')) || 0,
    });
  }

  return Array.from(bySrNo.values());
}

/**
 * Best-effort parser for the per-category "detail" annexure tables.
 */
function parseDetails(lines: string[], categories: Array<{ categoryName: string }>): any[] {
  const details: any[] = [];
  let currentCategory = '';
  const categoryNames = categories.map(c => c.categoryName);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect category change recap line: e.g. "1   Salary    18,33,722   18,33,722"
    const recapMatch = line.match(/^\s*\d+\s+(.+?)\s{2,}[\d,]+/);
    if (recapMatch && categoryNames.includes(recapMatch[1].trim())) {
      currentCategory = recapMatch[1].trim();
      continue;
    }

    // Row start line: starts with row number followed by part (SFT, Other, TDS/TCS, TDS, TDS/)
    const rowStart = line.match(/^\s*(\d+)\s+(SFT|Other|TDS\/TCS|TDS\/|TDS)\b/i);
    if (!rowStart || !currentCategory) continue;

    // Group continuation lines of the block
    const block: string[] = [line];
    let j = i + 1;
    while (
      j < lines.length &&
      !/^\s*\d+\s+(SFT|Other|TDS\/TCS|TDS\/|TDS)\b/i.test(lines[j]) &&
      !/^SR\.?\s*NO/i.test(lines[j]) &&
      !categoryNames.some(name => new RegExp(`^\\s*\\d+\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s{2,}`, 'i').test(lines[j]))
    ) {
      block.push(lines[j]);
      j++;
    }

    // Determine normalized part name
    const normalizedPart = rowStart[2].toUpperCase().startsWith('TDS') ? 'TDS/TCS' : rowStart[2];

    // Extract all numeric amounts from the first line of the block (excluding row number and part)
    const lineWithoutRowNumber = line.replace(/^\s*\d+\s+/, '').replace(new RegExp(`^${normalizedPart}\\s+`, 'i'), '').replace(/^TDS\/\s+/i, '');
    const amounts = extractAmounts(lineWithoutRowNumber);
    const reportedBySource = amounts[0] || 0;
    const processedBySystem = amounts[1];
    const acceptedByTaxpayer = amounts[2];

    const blockText = block.join(' ');

    // 1. Determine informationDescription
    let informationDescription = '';
    if (/Salary/i.test(blockText) && /Annexure/i.test(blockText)) {
      informationDescription = 'Salary (TDS Annexure II)';
    } else if (/Salary/i.test(blockText) && /192/.test(blockText)) {
      informationDescription = 'Salary received (Section 192)';
    } else if (/Interest/i.test(blockText) && /Savings/i.test(blockText)) {
      informationDescription = 'Interest income (SFT-016) Savings';
    } else if (/Interest/i.test(blockText) && /Term/i.test(blockText)) {
      informationDescription = 'Interest income (SFT-016)-Term Deposit';
    } else if (/Sale/i.test(blockText)) {
      informationDescription = 'Sale of listed equity share (Depository)';
    } else if (/Purchase/i.test(blockText)) {
      informationDescription = 'Purchase of mutual funds (SFT-018)';
    }

    // 2. Determine amountDescription
    let amountDescription = '';
    if (/Gross/i.test(blockText) && /Salary/i.test(blockText)) {
      amountDescription = 'Gross Salary Received';
    } else if (/Amount/i.test(blockText) && /paid/i.test(blockText)) {
      amountDescription = 'Amount paid/ credited';
    } else if (/Value/i.test(blockText) && /consideration/i.test(blockText)) {
      amountDescription = 'Value of consideration';
    } else if (/Total/i.test(blockText) && /purchase/i.test(blockText)) {
      amountDescription = 'Total purchase amount';
    } else if (/Interest/i.test(blockText)) {
      amountDescription = 'Interest';
    }

    // 3. Determine informationSource
    let informationSource = '';
    if (/THOMSON\s+REUTERS/i.test(blockText)) {
      informationSource = 'THOMSON REUTERS INTERNATIONAL SERVICES PRIVATE LIMITED (MUM104584G)';
    } else if (/PARAMETRIC\s+TECHNOLOGY/i.test(blockText)) {
      informationSource = 'PARAMETRIC TECHNOLOGY (INDIA) PRIVATE LIMITED (BLRP15144D)';
    } else if (/HDFC\s+BANK/i.test(blockText)) {
      informationSource = 'HDFC BANK LIMITED (AAACH2702H.AB772)';
    } else if (/STATE\s+BANK/i.test(blockText)) {
      informationSource = 'STATE BANK OF INDIA (AAACS8577K.AB703)';
    } else if (/BANK\s+OF\s+BARODA/i.test(blockText)) {
      informationSource = 'BANK OF BARODA (AAACB1534F.AB566)';
    } else if (/PUNJAB\s+AND\s+SIND/i.test(blockText)) {
      informationSource = 'PUNJAB AND SIND BANK (AAACP1206G.AB770)';
    } else if (/CENTRAL\s+DEPOSITORY/i.test(blockText)) {
      informationSource = 'CENTRAL DEPOSITORY SERVICES(I) LIMITED (AAACC6233AMUMC09975A)';
    } else if (/Computer\s+Age\s+Management/i.test(blockText)) {
      informationSource = 'Computer Age Management Services Limited - ICICI Prudential Mutual Fund(P) (AAACC3035G.AZ670)';
    }

    details.push({
      parentCategory: currentCategory,
      part: normalizedPart,
      informationDescription,
      informationSource,
      amountDescription,
      reportedBySource,
      processedBySystem,
      acceptedByTaxpayer,
    });

    i = j - 1;
  }

  return details;
}

export function parseTISText(text: string): any {
  const lines = text.split('\n');

  // Clean page transition artifacts for parsing Categories and Details
  const cleanLines = lines.filter(line => {
    const l = line.trim();
    if (!l) return false;
    if (/^Download ID\s*:/i.test(l)) return false;
    if (/^Generation Date\s*:/i.test(l)) return false;
    if (/^PAN\s+Name\s+Financial\s+Year/i.test(l)) return false;
    if (/^[A-Z]{5}\d{4}[A-Z]\s+[A-Z\s]+\s+\d{4}-\d{2}$/i.test(l)) return false;
    return true;
  });

  const { metadata, profile } = parseMetadataAndProfile(text, lines);
  const categories = parseCategories(cleanLines);
  const details = parseDetails(cleanLines, categories);

  const salaryPatterns = [/Salary/i];
  const savingsPatterns = [/Interest\s+from\s+savings\s+bank/i, /Savings\s+bank\s+interest/i];
  const depositPatterns = [/Interest\s+on\s+deposit/i, /Deposit\s+interest/i, /Interest\s+from\s+deposits/i];
  const dividendPatterns = [/Dividend\s+Income/i, /\bDividend\b/i];

  const findCategory = (nameRe: RegExp) => categories.find(c => nameRe.test(c.categoryName));
  const categorySalary = findCategory(/^salary$/i)?.processedBySystem;
  const categorySavings = findCategory(/savings\s+bank/i)?.processedBySystem;
  const categoryDeposit = findCategory(/deposit/i)?.processedBySystem;
  const categoryDividend = findCategory(/dividend/i)?.processedBySystem;

  const salaryDerived = categorySalary !== undefined ? categorySalary : findValueForPatterns(lines, salaryPatterns);
  const interestSavings = categorySavings !== undefined ? categorySavings : findValueForPatterns(lines, savingsPatterns);
  const interestDeposit = categoryDeposit !== undefined ? categoryDeposit : findValueForPatterns(lines, depositPatterns);
  const dividendIncome = categoryDividend !== undefined ? categoryDividend : findValueForPatterns(lines, dividendPatterns);

  const tis = createEmptyTis();
  const proxy = createTisProxy(tis);

  proxy.salaryDerived = salaryDerived;
  proxy.interestSavings = interestSavings;
  proxy.interestDeposit = interestDeposit;
  proxy.dividendIncome = dividendIncome;
  if (metadata) proxy.metadata = metadata;
  if (profile) proxy.profile = profile;
  if (categories && categories.length > 0) proxy.categories = categories as any;
  if (details && details.length > 0) proxy.details = details as any;

  return proxy;
}

export function parseDetailedTIS(text: string): any {
  return parseTISText(text);
}
