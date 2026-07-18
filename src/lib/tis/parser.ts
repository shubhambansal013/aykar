import { TISData, createEmptyTis, createTisProxy } from '../proto/compatibilityProxy';

/**
 * Extracts numeric amounts from a line of PDF-extracted text.
 * TIS amount columns are comma-grouped integers (e.g. "18,33,722") and are NOT
 * guaranteed to carry a decimal point, so the decimal part is optional here.
 * (A previous version required `\.\d{2}`, which silently matched nothing on real
 * TIS text using plain comma-grouped integers and returned 0 for every value -
 * do not reintroduce that requirement.)
 */
function extractAmounts(line: string): number[] {
  const matches = line.match(/-?\d[\d,]*(?:\.\d{1,2})?/g);
  if (!matches) return [];
  return matches.map(m => parseFloat(m.replace(/,/g, '')) || 0);
}

/**
 * Flexible fallback scanner: finds a label anywhere in the text and returns the
 * nearest trailing number, either on the same line or within the next few lines
 * (covering "Label: value", "Label ... value" and "Label\nReported Value: x\nDerived
 * Value: y" layouts where the last/most-refined number should win).
 * This is the generic, layout-tolerant path - used when the stricter, more reliable
 * structured-table parse (parseCategories, below) doesn't have a matching category,
 * e.g. because the source document isn't the standard numbered TIS table format.
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

/**
 * Parses taxpayer identity (PAN, name, address) and financial/assessment year from the
 * standard TIS "General Information" header block. This block's layout is consistent
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
    // Normalize "a,b,c" to "a, b, c" for display - the source PDF strips spaces after
    // commas in this block, but every other address field in the app is comma-space formatted.
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
 * Parses the top-level "Taxpayer Information Summary" category table:
 *   SR.NO  INFORMATION CATEGORY  PROCESSED BY SYSTEM  ACCEPTED BY TAXPAYER
 *      1   Salary                 18,33,722            18,33,722
 * This is the standard numbered-row TIS table format and generalizes to any TIS PDF
 * using it, regardless of which categories are present. Only the first occurrence of
 * each SR.NO is kept - the same category is repeated as a one-line recap before its
 * own detail annexure further down the document.
 * Returns an empty array (not an error) for text that isn't in this table format -
 * callers should fall back to `findValueForPatterns` in that case.
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
 * Best-effort parser for the per-category "detail" annexure tables (institution-level
 * breakdown). Rows wrap across multiple physical lines in the linearized PDF text, so
 * this groups lines starting at a leading row-part token ("Other" / "SFT" / "TDS/TCS")
 * into logical rows, then splits the joined text on the description/source boundary
 * using the trailing parenthesized TAN/PAN-like code as an anchor, and the 1-3 amount
 * columns after it. This is the least robust part of this file since the source PDF's
 * column layout isn't preserved in the extracted text; if it proves too fragile,
 * `categories` (above) remains the reliable source of truth for totals.
 */
function parseDetails(lines: string[], categories: Array<{ categoryName: string }>): any[] {
  const details: any[] = [];
  let currentCategory = '';
  const categoryNames = categories.map(c => c.categoryName);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const recapMatch = line.match(/^\s*\d+\s+(.+?)\s{2,}[\d,]+/);
    if (recapMatch && categoryNames.includes(recapMatch[1].trim())) {
      currentCategory = recapMatch[1].trim();
      continue;
    }

    const rowStart = line.match(/^\s*(\d+)\s+(SFT|Other|TDS)/i);
    if (!rowStart || !currentCategory) continue;

    const block: string[] = [line];
    let j = i + 1;
    while (
      j < lines.length &&
      !/^\s*\d+\s+(SFT|Other|TDS)/i.test(lines[j]) &&
      !/^SR\.?\s*NO/i.test(lines[j]) &&
      !categoryNames.some(name => new RegExp(`^\\s*\\d+\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s{2,}`, 'i').test(lines[j]))
    ) {
      block.push(lines[j]);
      j++;
    }
    const joined = block.join(' ').replace(/^\s*\d+\s+/, '');

    const sourceMatch = joined.match(/\(([A-Z0-9][A-Z0-9.]{8,18}[A-Z0-9])\)/);
    const amounts = extractAmounts(joined.replace(/\([^)]*\)/g, ''));

    details.push({
      parentCategory: currentCategory,
      part: rowStart[2].toUpperCase() === 'TDS' ? 'TDS/TCS' : rowStart[2],
      informationSource: sourceMatch ? sourceMatch[1] : undefined,
      reportedBySource: amounts[0],
      processedBySystem: amounts[1],
      acceptedByTaxpayer: amounts[2],
    });

    i = j - 1;
  }

  return details;
}

const SALARY_PATTERNS = [/Salary/i];
const SAVINGS_PATTERNS = [/Interest\s+from\s+savings\s+bank/i, /Savings\s+bank\s+interest/i];
const DEPOSIT_PATTERNS = [/Interest\s+on\s+deposits?/i, /Deposit\s+interest/i, /Interest\s+from\s+deposits?/i];
const DIVIDEND_PATTERNS = [/Dividend\s+Income/i, /\bDividend\b/i];

export function parseTISText(text: string): any {
  const lines = text.split('\n');

  const { metadata, profile } = parseMetadataAndProfile(text, lines);
  const categories = parseCategories(lines);
  const details = parseDetails(lines, categories);

  const findCategory = (nameRe: RegExp) => categories.find(c => nameRe.test(c.categoryName));

  // Structured table parse first (most reliable for the standard numbered TIS format);
  // fall back to flexible label scanning for any other layout.
  const salaryDerived = findCategory(/^salary$/i)?.processedBySystem || findValueForPatterns(lines, SALARY_PATTERNS);
  const interestSavings = findCategory(/savings\s+bank/i)?.processedBySystem || findValueForPatterns(lines, SAVINGS_PATTERNS);
  const interestDeposit = findCategory(/deposit/i)?.processedBySystem || findValueForPatterns(lines, DEPOSIT_PATTERNS);
  const dividendIncome = findCategory(/dividend/i)?.processedBySystem || findValueForPatterns(lines, DIVIDEND_PATTERNS);

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