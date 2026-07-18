import { TISData, createEmptyTis, createTisProxy } from '../proto/compatibilityProxy';

/**
 * Extracts numeric amounts from a line of PDF-extracted text.
 * TIS/AIS amount columns are comma-grouped integers (e.g. "18,33,722") and are NOT
 * guaranteed to carry a decimal point, so the decimal part is optional here.
 * (A previous version required `\.\d{2}`, which silently matched nothing on real
 * TIS/AIS text and returned 0 for every value - do not reintroduce that.)
 */
function extractAmounts(line: string): number[] {
  const matches = line.match(/-?\d[\d,]*(?:\.\d{1,2})?/g);
  if (!matches) return [];
  return matches.map(m => parseFloat(m.replace(/,/g, '')) || 0);
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
 * This table (and its numbered rows) is a fixed part of the TIS format and is not
 * specific to any one taxpayer or category set - it generalizes to any TIS PDF.
 * The same category also gets repeated as a one-line recap before its own detail
 * annexure further down the document; only the first occurrence (the original
 * index table) is kept per SR.NO.
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
 * breakdown). These rows wrap across multiple physical lines in the linearized PDF
 * text with no reliable column boundaries, which makes them the least robust part of
 * this file. This groups lines into logical rows (starting at a leading row number)
 * and pulls out the amount column(s) plus the parenthesized TAN/PAN-like source code,
 * which is the one consistently-shaped anchor in each row.
 *
 * If this proves too fragile in practice, treat `categories` (parseCategories above)
 * as the reliable source of truth for totals, and consider a layout/coordinate-aware
 * PDF text extraction step for faithful per-institution detail rows instead of
 * strengthening this regex further.
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

    // Join this row's continuation lines until the next numbered row / table header / category recap.
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
    const joined = block.join(' ');

    const sourceMatch = joined.match(/\(([A-Z0-9]{10,16})\)/);
    const amounts = extractAmounts(joined.replace(sourceMatch ? sourceMatch[0] : '', ''));

    details.push({
      parentCategory: currentCategory,
      part: rowStart[2],
      informationSource: sourceMatch ? sourceMatch[1] : undefined,
      reportedBySource: amounts[0],
      processedBySystem: amounts[1],
      acceptedByTaxpayer: amounts[2],
    });

    i = j - 1;
  }

  return details;
}

export function parseTISText(text: string): any {
  const lines = text.split('\n');

  const { metadata, profile } = parseMetadataAndProfile(text, lines);
  const categories = parseCategories(lines);
  const details = parseDetails(lines, categories);

  const findCategory = (nameRe: RegExp) => categories.find(c => nameRe.test(c.categoryName));
  const salaryDerived = findCategory(/^salary$/i)?.processedBySystem || 0;
  const interestSavings = findCategory(/savings\s+bank/i)?.processedBySystem || 0;
  const interestDeposit = findCategory(/deposit/i)?.processedBySystem || 0;
  const dividendIncome = findCategory(/dividend/i)?.processedBySystem || 0;

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
