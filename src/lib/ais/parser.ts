import { AISData, createEmptyAis, createAisProxy } from '../proto/compatibilityProxy';

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

  // NOTE: tdsTcsInfo / sftInfo / taxPayments / otherInfo (the per-transaction / per-institution
  // drill-down used only by the "Inspect Documents" debug view) are intentionally left
  // undefined here. They used to be entirely hardcoded to one taxpayer's exact transactions,
  // which is worse than not having them - fabricated data that looks real. None of the
  // actual tax calculations depend on these four fields (see reconciliation.ts, which only
  // reads interestSavings / interestDeposit / dividendIncome / tdsDetails, all computed
  // generically above). Building a faithful generic parser for these nested, multi-line
  // wrapped tables is a separate, larger effort - flagging as follow-up work rather than
  // re-hardcoding a "close enough" version.

  const ais = createEmptyAis();
  const proxy = createAisProxy(ais);

  proxy.interestSavings = interestSavings;
  proxy.interestDeposit = interestDeposit;
  proxy.dividendIncome = dividendIncome;
  proxy.tdsDetails = Array.from(tdsDetailsMap.values());
  proxy.metadata = metadata;
  proxy.profile = profile;

  return proxy;
}

export function parseDetailedAIS(text: string): any {
  return parseAISText(text);
}