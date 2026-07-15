import { Form26ASData } from '../types';

function extractNumbersNoSpace(line: string): number[] {
  const matches = line.match(/-?\s*\d[\d,]*\.\d{2}/g);
  if (!matches) return [];
  return matches.map(m => parseFloat(m.replace(/[\s,]/g, '')) || 0);
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

  // Let's iterate through lines and parse the sections.
  let currentSection: 'TDS' | 'TCS' | 'TAX_PAID' | null = null;

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
      const matches = [...line.matchAll(/\b([A-Z]{4}[0-9]{5}[A-Z])\s+([A-Za-z0-9\s.,()&]{3,40}?)\s+\b(19[2-9][A-Z]*|206[A-Z]*|194[A-Z]*)\b/gi)];
      for (const match of matches) {
        const tan = match[1];
        const name = match[2].trim();
        const section = match[3];
        const numbers = extractNumbersNoSpace(line);
        if (numbers.length > 0) {
          const amount = numbers[numbers.length - 1];
          if (section === '192') {
            data.tdsSalary.push({
              tan,
              deductorName: name,
              amount,
            });
          } else {
            data.tdsOther.push({
              tan,
              deductorName: name,
              section,
              amount,
            });
          }
        }
      }
    } else if (currentSection === 'TCS') {
      const matches = [...line.matchAll(/\b([A-Z]{4}[0-9]{5}[A-Z])\s+([A-Za-z0-9\s.,()&]+?)(?=\s+-?\s*\d)/gi)];
      for (const match of matches) {
        const collectorName = match[2].trim();
        const numbers = extractNumbersNoSpace(line);
        if (numbers.length > 0) {
          const amount = numbers[numbers.length - 1];
          data.tcsDetails.push({
            collectorName,
            amount,
          });
        }
      }
    } else if (currentSection === 'TAX_PAID') {
      // Advance Tax / Self-Assessment Tax: BSR Code, Date, Challan No
      const taxPaidMatch = line.match(/\b(\d{7})\b.*\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b.*\b(\d{5})\b/i);
      if (taxPaidMatch) {
        const bsrCode = taxPaidMatch[1];
        const date = taxPaidMatch[2];
        const challanNo = taxPaidMatch[3];
        const numbers = extractNumbersNoSpace(line);
        if (numbers.length > 0) {
          const amount = numbers[numbers.length - 1];
          const isSelfAssessment = /Self\s*Assessment/i.test(line) || /Self/i.test(line) || (i > 0 && /Self/i.test(lines[i-1]));
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

  return data;
}
