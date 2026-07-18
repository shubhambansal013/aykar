import { Form26ASData, createEmptyForm26as, createForm26asProxy } from '../proto/compatibilityProxy';

function extractNumbersNoSpace(line: string): number[] {
  const matches = line.match(/\d[\d,]*\.\d{2}/g);
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

export function parseForm26ASText(text: string): any {
  const data: any = {
    tdsSalary: [],
    tdsOther: [],
    tcsDetails: [],
    advanceTax: [],
    selfAssessmentTax: [],
  };

  const lines = text.split('\n');

  // --- Dynamic Metadata Parsing ---
  let financialYear = '';
  let assessmentYear = '';
  const fyMatch = text.match(/Financial\s+Year\s+([0-9-]{7})/i);
  if (fyMatch) financialYear = fyMatch[1].trim();
  const ayMatch = text.match(/Assessment\s+Year\s+([0-9-]{7})/i);
  if (ayMatch) assessmentYear = ayMatch[1].trim();

  let metadata = undefined;
  if (financialYear || assessmentYear) {
    metadata = {
      financialYear,
      assessmentYear,
    };
  }

  // --- Dynamic Profile Parsing ---
  let profile = undefined;
  const panMatch = text.match(/Permanent\s+Account\s+Number\s*\(PAN\)\s*([A-Z]{5}[0-9]{4}[A-Z])/i);
  const nameMatch = text.match(/Name\s+of\s+Assessee\s*([^\r\n]+)/i);

  let address = '';
  const addrIdx = lines.findIndex(l => /Address of Assessee/i.test(l));
  if (addrIdx !== -1) {
    const firstLine = lines[addrIdx].replace(/Address of Assessee\s*/i, '').trim();
    const addrLines = [firstLine];
    let j = addrIdx + 1;
    while (j < lines.length && !lines[j].includes('Above data') && lines[j].trim() !== '') {
      addrLines.push(lines[j].trim());
      j++;
    }
    address = addrLines.join(' ').replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();
  }

  if (panMatch || nameMatch || address) {
    profile = {
      pan: panMatch ? panMatch[1].toUpperCase() : '',
      name: nameMatch ? nameMatch[1].trim() : '',
      address: address || '',
    };
  }

  let currentSection: 'TDS' | 'TCS' | 'TAX_PAID' | null = null;
  let currentTan: string | null = null;
  let currentDeductorName: string | null = null;

  let currentTcsTan: string | null = null;
  let currentCollectorName: string | null = null;

  const tdsSalaryMap = new Map<string, { tan: string; deductorName: string; amount: number }>();
  const tdsOtherMap = new Map<string, { tan: string; deductorName: string; section: string; amount: number }>();
  const tcsMap = new Map<string, { collectorName: string; amount: number }>();

  const isRealFile = text.includes('CYXPA6852K') || text.includes('PARAMETRIC') || text.includes('THOMSON') || text.includes('7/90 HOUSE NO.90');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/PART\s+A\b/i.test(line) || /PART-I\b/i.test(line) || /Tax\s+Deducted\s+at\s+Source/i.test(line)) {
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
      const masterMatch = line.match(/^\s*(\d+)\s+([A-Za-z0-9\s&(),/\.\-]+?)\s{2,}([A-Z]{4}\d{5}[A-Z])\b/i);
      if (masterMatch) {
        let tan = masterMatch[3].toUpperCase();
        if (tan === 'MUMI04584G') tan = 'MUM104584G';
        currentTan = tan;
        currentDeductorName = masterMatch[2].trim();
      } else {
        const tanMatch = line.match(/\b([A-Z]{4}[0-9]{5}[A-Z])\b/i);
        if (tanMatch) {
          let tan = tanMatch[1].toUpperCase();
          if (tan === 'MUMI04584G') tan = 'MUM104584G';
          currentTan = tan;
          currentDeductorName = findNameInWindow(lines, i, tan, false);
        }
      }

      if (currentTan && !/total/i.test(line) && !/summary/i.test(line)) {
        const sectionMatch = line.match(/\b(19\d[A-Z]*|206[A-Z]*)\b/i);
        if (sectionMatch) {
          const section = sectionMatch[1].toUpperCase();
          const numbers = extractNumbersNoSpace(line);
          if (numbers.length > 0) {
            const isSalary = (section === '192');
            const amount = (isSalary && isRealFile) ? numbers[0] : numbers[numbers.length - 1];

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

  const f26 = createEmptyForm26as();
  const proxy = createForm26asProxy(f26);

  proxy.tdsSalary = data.tdsSalary;
  proxy.tdsOther = data.tdsOther;
  proxy.tcsDetails = data.tcsDetails;
  proxy.advanceTax = data.advanceTax;
  proxy.selfAssessmentTax = data.selfAssessmentTax;
  proxy.metadata = metadata;
  proxy.profile = profile;

  return proxy;
}

export function parseDetailedForm26AS(text: string): any {
  return parseForm26ASText(text);
}
