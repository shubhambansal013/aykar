import { AISData, createEmptyAis, createAisProxy } from '../proto/compatibilityProxy';
import { SecuritySale } from '../../generated/sources/ais';

/**
 * Parses individual SFT-17-LES "Sale of securities and units of mutual fund" records.
 * Supports multi-line wrapped transaction blocks with page header/footer interruptions.
 */
function parseSecuritySales(lines: string[]): SecuritySale[] {
  const sales: SecuritySale[] = [];

  const startIdx = lines.findIndex(l => /Sale\s+of\s+securities\s+and\s+units/i.test(l));
  if (startIdx === -1) {
    return sales;
  }

  const nextSectionIdx = lines.findIndex(
    (l, idx) => idx > startIdx && (/Purchase\s+of\s+securities/i.test(l) || /Part\s+B/i.test(l))
  );
  const endIdx = nextSectionIdx !== -1 ? nextSectionIdx : lines.length;

  const sectionLines = lines.slice(startIdx, endIdx);

  let activeInfoCode = 'SFT-17-LES(M)';
  let activeInfoDescription = 'Sale of listed equity share (Depository)';
  let activeInformationSource = 'CENTRAL DEPOSITORY SERVICES(I) LIMITED';

  for (let i = 0; i < sectionLines.length; i++) {
    const line = sectionLines[i];

    // Check for SFT summary lines
    const summaryMatch = line.match(/^\s*(\d+)\s+(SFT-17-LES(?:\([A-Z]\))?)\s+(.+?)\s{2,}(.+?)\s{2,}\d+\s+([\d,.]+)/i);
    if (summaryMatch) {
      activeInfoCode = summaryMatch[2].trim();
      activeInfoDescription = summaryMatch[3].trim();
      activeInformationSource = summaryMatch[4].trim();
      continue;
    }

    // Check for transaction starting lines (e.g., S.No and date)
    const txStartMatch = line.match(/^\s*(\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+(.+)$/);
    if (txStartMatch) {
      const blockLines = [line];
      let j = i + 1;
      while (j < sectionLines.length) {
        const subLine = sectionLines[j];
        if (/^\s*\d+\s+\d{2}\/\d{2}\/\d{4}\b/.test(subLine)) {
          break;
        }
        if (/^\s*\d+\s+SFT-/.test(subLine)) {
          break;
        }
        if (/^\s*(Interest|Purchase|Part\s+B)/i.test(subLine)) {
          break;
        }
        blockLines.push(subLine);
        j++;
      }

      // Fast-forward outer loop index
      i = j - 1;

      // Now parse the collected transaction block
      const firstLine = blockLines[0].trim();
      const tokens = firstLine.split(/\s+/);
      if (tokens.length >= 10) {
        const status = tokens[tokens.length - 1];
        const indexedCostOfAcquisition = parseFloat(tokens[tokens.length - 2].replace(/,/g, '')) || 0;
        const fairMarketValue = parseFloat(tokens[tokens.length - 3].replace(/,/g, '')) || 0;
        const unitFmv = parseFloat(tokens[tokens.length - 4].replace(/,/g, '')) || 0;
        const costOfAcquisition = parseFloat(tokens[tokens.length - 5].replace(/,/g, '')) || 0;
        const salesConsideration = parseFloat(tokens[tokens.length - 6].replace(/,/g, '')) || 0;
        const salePricePerUnit = parseFloat(tokens[tokens.length - 7].replace(/,/g, '')) || 0;
        const quantity = parseFloat(tokens[tokens.length - 8].replace(/,/g, '')) || 0;
        const assetTypePrefix = tokens[tokens.length - 9]; // "Long" or "Short"
        const creditType = tokens[tokens.length - 10];
        const debitType = tokens[tokens.length - 11];
        const securityClassPrefix = tokens[tokens.length - 12]; // "Listed"

        const assetType = assetTypePrefix.toLowerCase().startsWith('long') ? 'Long term' : 'Short term';
        const securityClass = securityClassPrefix.toLowerCase().startsWith('listed') ? 'Listed Equity Share' : 'Listed Equity Share';

        // Extract and construct security name
        const firstLineName = tokens.slice(2, tokens.length - 12).join(' ');

        // Collect subsequent lines name parts
        const cleanedSubLines: string[] = [];
        const isPageHeaderFooter = (l: string): boolean => {
          const trimmed = l.trim();
          return (
            /Download\s+ID/i.test(trimmed) ||
            /Generation\s+Date/i.test(trimmed) ||
            /^\s*PAN\s+Name\s+Financial\s+Year/i.test(trimmed) ||
            /^\s*[A-Z]{5}\d{4}[A-Z]\s+[A-Z\s]+\s+\d{4}-\d{2}/i.test(trimmed) ||
            /SR\.\s+DATE\s+OF\s+SALE/i.test(trimmed) ||
            /NO\.\s+TRANSFER\s+CLASS/i.test(trimmed) ||
            /^\s*VALUE\s*$/i.test(trimmed)
          );
        };

        for (let k = 1; k < blockLines.length; k++) {
          const subL = blockLines[k].trim();
          if (isPageHeaderFooter(subL)) continue;

          // Columns are separated by 2 or more spaces; the first part is always the security name
          const parts = subL.split(/\s{2,}/);
          const cleaned = parts[0].trim();
          if (cleaned) {
            cleanedSubLines.push(cleaned);
          }
        }

        const securityName = [firstLineName, ...cleanedSubLines].filter(Boolean).join(' ');

        // Extract ISIN code (12 characters alphanumeric, starting with INE)
        const isinMatch = securityName.match(/\b(INE[A-Z0-9]{8}\d)\b/);
        const securityCodeIsin = isinMatch ? isinMatch[1] : '';

        const sale: SecuritySale = {
          infoCode: activeInfoCode,
          infoDescription: activeInfoDescription,
          informationSource: activeInformationSource,
          dateOfSaleTransfer: txStartMatch[2],
          securityName,
          securityCodeIsin,
          securityClass,
          debitType,
          creditType,
          assetType,
          quantity,
          salePricePerUnit,
          salesConsideration,
          costOfAcquisition,
          unitFmv,
          fairMarketValue,
          indexedCostOfAcquisition,
          status,
        };

        sales.push(sale);
      }
    }
  }

  return sales;
}

/**
 * Extracts numeric amounts from a line of PDF-extracted text.
 * AIS amount columns are comma-grouped integers (e.g. "9,84,690") and are NOT
 * guaranteed to carry a decimal point, so the decimal part is optional here.
 */
function extractAmounts(line: string): number[] {
  const matches = line.match(/-?\d[\d,]*(?:\.\d{1,2})?/g);
  if (!matches) return [];
  return matches.map(m => parseFloat(m.replace(/,/g, '')) || 0);
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

/**
 * Parses taxpayer identity (PAN, name, address) and financial/assessment year from the
 * standard AIS "Part A - General Information" header block. This layout is consistent
 * across taxpayers - it is not specific to any one PAN.
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
    const addr = lines[addressLabelIdx + 1].trim().replace(/,(?=\S)/g, ', ');
    if (profile) {
      profile.address = addr;
    } else {
      profile = { pan: '', name: '', address: addr };
    }
  }

  return { metadata, profile };
}

/**
 * AIS's "Part B1/B2" sections list one summary row per source (e.g. per bank), not a
 * single rolled-up total the way TIS does - so the category total has to be summed
 * across each source's summary row. Summary rows are identified by an info-code token
 * (SFT-xxx / TDS-xxx); the per-transaction breakdown rows underneath each summary row
 * are skipped so amounts aren't double-counted.
 */
function sumInfoCodeSection(lines: string[], sectionTitleRe: RegExp, stopRes: RegExp[]): number {
  let inSection = false;
  let total = 0;
  for (const line of lines) {
    if (sectionTitleRe.test(line)) { inSection = true; continue; }
    if (!inSection) continue;
    if (stopRes.some(re => re.test(line))) { inSection = false; continue; }
    if (/^\s*\d+\s+(SFT|TDS)[-–]/i.test(line)) {
      const nums = extractAmounts(line);
      if (nums.length > 0) total += nums[nums.length - 1];
    }
  }
  return total;
}

const SECTION_STOPS = [
  /^\s*Interest\s+from\s+deposit/i,
  /^\s*Sale\s+of\s+securities/i,
  /^\s*Purchase\s+of\s+securities/i,
  /^\s*Dividend/i,
  /^\s*Part\s+B\d/i,
  /^\s*Salary\s*$/i,
];

/**
 * Flexible fallback scanner: finds a label anywhere in the text and returns the
 * nearest trailing number (same line, or within the next few lines). Used when the
 * stricter, more reliable SFT/TDS-row-sum (sumInfoCodeSection) doesn't find a match,
 * e.g. because the source document isn't in the standard AIS Part B1/B2 layout.
 */
function findValueForPatterns(lines: string[], patterns: RegExp[]): number {
  let maxValue = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!patterns.some(pat => pat.test(line))) continue;

    let foundNumbers = extractAmounts(line);
    if (foundNumbers.length === 0) {
      const end = Math.min(lines.length - 1, i + 3);
      for (let j = i + 1; j <= end; j++) {
        const subLine = lines[j];
        if (/Interest\s+from\s+savings/i.test(subLine) ||
            /Interest\s+on\s+deposit/i.test(subLine) ||
            /Dividend/i.test(subLine) ||
            /Salary/i.test(subLine)) {
          break;
        }
        foundNumbers.push(...extractAmounts(subLine));
      }
    }

    if (foundNumbers.length > 0) {
      const val = foundNumbers[foundNumbers.length - 1];
      if (val > maxValue) maxValue = val;
    }
  }
  return maxValue;
}

const SAVINGS_PATTERNS = [/Interest\s+from\s+savings\s+bank/i, /Savings\s+bank\s+interest/i];
const DEPOSIT_PATTERNS = [/Interest\s+on\s+deposits?/i, /Deposit\s+interest/i, /Interest\s+from\s+deposits?/i, /Interest\s+on\s+time\s+deposit/i];
const DIVIDEND_PATTERNS = [/Dividend\s+Income/i, /\bDividend\b/i];

export function parseAISText(text: string): AISData {
  const lines = text.split('\n');

  const { metadata, profile } = parseMetadataAndProfile(text, lines);

  const interestSavings = sumInfoCodeSection(lines, /^\s*Interest\s+from\s+savings\s+bank\s*$/i, SECTION_STOPS) || findValueForPatterns(lines, SAVINGS_PATTERNS);
  const interestDeposit = sumInfoCodeSection(lines, /^\s*Interest\s+from\s+deposit\s*$/i, SECTION_STOPS) || findValueForPatterns(lines, DEPOSIT_PATTERNS);
  const dividendIncome = sumInfoCodeSection(lines, /^\s*Dividend\s*$/i, SECTION_STOPS) || findValueForPatterns(lines, DIVIDEND_PATTERNS);

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
        const numbers = extractAmounts(line.replace(sectionMatch[0], ''));
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

  // Parse SFT-17-LES "Sale of securities" transactions
  const securitySales = parseSecuritySales(lines);

  // Compute aggregate short-term and long-term (112A) capital gains
  let shortTermCapitalGains = 0;
  let longTermCapitalGains112A = 0;
  for (const sale of securitySales) {
    const gain = (sale.salesConsideration || 0) - (sale.costOfAcquisition || 0);
    if (sale.assetType === 'Short term') {
      shortTermCapitalGains += gain;
    } else if (sale.assetType === 'Long term') {
      longTermCapitalGains112A += gain;
    }
  }

  const ais = createEmptyAis();
  ais.sftInfo = {
    savingsInterest: [],
    depositInterest: [],
    securitySales,
    securityPurchases: [],
  };

  const proxy = createAisProxy(ais);

  proxy.interestSavings = interestSavings;
  proxy.interestDeposit = interestDeposit;
  proxy.dividendIncome = dividendIncome;
  proxy.shortTermCapitalGains = shortTermCapitalGains;
  proxy.longTermCapitalGains112A = longTermCapitalGains112A;
  proxy.tdsDetails = Array.from(tdsDetailsMap.values());
  proxy.metadata = metadata;
  proxy.profile = profile;

  return proxy;
}

export function parseDetailedAIS(text: string): any {
  return parseAISText(text);
}