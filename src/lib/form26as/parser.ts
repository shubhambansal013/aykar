import { Form26ASData } from '../types';

function extractNumbersNoSpace(line: string): number[] {
  const matches = line.match(/-?\s*\d[\d,]*\.\d{2}/g);
  if (!matches) return [];
  return matches.map(m => parseFloat(m.replace(/[\s,]/g, '')) || 0);
}

function findNameInWindow(lines: string[], centerIdx: number, targetTan: string, isCollector: boolean = false): string {
  const start = Math.max(0, centerIdx - 2);
  const end = Math.min(lines.length - 1, centerIdx + 2);

  const nameKeywords = isCollector
    ? [/Collector\s*Name/i, /Name\s*of\s*Collector/i, /Name\s*of\s*the\s*Collector/i]
    : [/Deductor\s*Name/i, /Name\s*of\s*Deductor/i, /Name\s*of\s*the\s*Deductor/i];

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

  return isCollector ? 'Unknown Collector' : 'Unknown Deductor';
}

export function parseForm26ASText(text: string): Form26ASData {
  const data: Form26ASData = {
    tdsSalary: [],
    tdsOther: [],
    tcsDetails: [],
    advanceTax: [],
    selfAssessmentTax: [],
  };

  const lines = text.split('\n');

  let currentSection: 'TDS' | 'TCS' | 'TAX_PAID' | null = null;
  let currentTan: string | null = null;
  let currentDeductorName: string | null = null;

  let currentTcsTan: string | null = null;
  let currentCollectorName: string | null = null;

  const tdsSalaryMap = new Map<string, { tan: string; deductorName: string; amount: number }>();
  const tdsOtherMap = new Map<string, { tan: string; deductorName: string; section: string; amount: number }>();
  const tcsMap = new Map<string, { collectorName: string; amount: number }>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/PART\s+A\b/i.test(line) || /Tax\s+Deducted\s+at\s+Source/i.test(line)) {
      currentSection = 'TDS';
      continue;
    } else if (/PART\s+B\b/i.test(line) || /Tax\s+Collected\s+at\s+Source/i.test(line)) {
      currentSection = 'TCS';
      continue;
    } else if (/PART\s+C\b/i.test(line) || /Details\s+of\s+Tax\s+Paid/i.test(line)) {
      currentSection = 'TAX_PAID';
      continue;
    }

    if (currentSection === 'TDS') {
      const tanMatch = line.match(/\b([A-Z]{4}[0-9]{5}[A-Z])\b/i);
      if (tanMatch) {
        const tan = tanMatch[1].toUpperCase();
        currentTan = tan;
        currentDeductorName = findNameInWindow(lines, i, tan, false);
      }

      if (currentTan && !/total/i.test(line) && !/summary/i.test(line)) {
        const sectionMatch = line.match(/\b(19\d[A-Z]*|206[A-Z]*)\b/i);
        if (sectionMatch) {
          const section = sectionMatch[1].toUpperCase();
          const numbers = extractNumbersNoSpace(line);
          if (numbers.length > 0) {
            const amount = numbers[numbers.length - 1];
            const key = `${currentTan}_${section}`;
            if (section === '192') {
              const existing = tdsSalaryMap.get(key);
              if (existing) {
                existing.amount += amount;
              } else {
                tdsSalaryMap.set(key, { tan: currentTan, deductorName: currentDeductorName || '', amount });
              }
            } else {
              const existing = tdsOtherMap.get(key);
              if (existing) {
                existing.amount += amount;
              } else {
                tdsOtherMap.set(key, { tan: currentTan, deductorName: currentDeductorName || '', section, amount });
              }
            }
          }
        }
      }
    } else if (currentSection === 'TCS') {
      const tanMatch = line.match(/\b([A-Z]{4}[0-9]{5}[A-Z])\b/i);
      if (tanMatch) {
        const tan = tanMatch[1].toUpperCase();
        currentTcsTan = tan;
        currentCollectorName = findNameInWindow(lines, i, tan, true);
      }

      if (currentTcsTan && !/total/i.test(line) && !/summary/i.test(line)) {
        const numbers = extractNumbersNoSpace(line);
        if (numbers.length > 0) {
          const amount = numbers[numbers.length - 1];
          const key = currentTcsTan;
          const existing = tcsMap.get(key);
          if (existing) {
            existing.amount += amount;
          } else {
            tcsMap.set(key, { collectorName: currentCollectorName || '', amount });
          }
        }
      }
    } else if (currentSection === 'TAX_PAID') {
      const taxPaidMatch = line.match(/\b(\d{7})\b.*\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b.*\b(\d{5})\b/i);
      if (taxPaidMatch) {
        const bsrCode = taxPaidMatch[1];
        const date = taxPaidMatch[2];
        const challanNo = taxPaidMatch[3];
        const numbers = extractNumbersNoSpace(line);
        if (numbers.length > 0) {
          const amount = numbers[numbers.length - 1];
          const isSelfAssessment =
            /Self\s*Assessment/i.test(line) ||
            /Self/i.test(line) ||
            /\b300\b/.test(line) ||
            (i > 0 && (/Self/i.test(lines[i-1]) || /\b300\b/.test(lines[i-1]))) ||
            (i > 1 && (/Self/i.test(lines[i-2]) || /\b300\b/.test(lines[i-2])));

          const record = { bsrCode, date, challanNo, amount };
          if (isSelfAssessment) {
            data.selfAssessmentTax.push(record);
          } else {
            data.advanceTax.push(record);
          }
        }
      }
    }
  }

  data.tdsSalary = Array.from(tdsSalaryMap.values());
  data.tdsOther = Array.from(tdsOtherMap.values());
  data.tcsDetails = Array.from(tcsMap.values());

  return data;
}
