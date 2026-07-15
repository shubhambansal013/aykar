import { AISData } from '../types';
import { ParserUtils } from '../form16/ParserUtils';

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

  return {
    interestSavings,
    interestDeposit,
    dividendIncome,
    tdsDetails: Array.from(tdsDetailsMap.values()),
  };
}
