import { AISData } from '../types';
import { ParserUtils } from '../form16/ParserUtils';

function extractNumbersNoSpace(line: string): number[] {
  const matches = line.match(/-?\s*\d[\d,]*\.\d{2}/g);
  if (!matches) return [];
  return matches.map(m => parseFloat(m.replace(/[\s,]/g, '')) || 0);
}

export function parseAISText(text: string): AISData {
  const data: AISData = {
    interestSavings: 0,
    interestDeposit: 0,
    dividendIncome: 0,
    tdsDetails: [],
  };

  const lines = text.split('\n');

  // Regex patterns to find Savings Bank Interest, Deposit Interest, Dividend
  const savingsPatterns = [
    /Interest\s+from\s+savings\s+bank\s*[:\-]?\s*(-?\s*\d[\d\s,]*\.\d{2})/i,
    /Savings\s+bank\s+interest\s*[:\-]?\s*(-?\s*\d[\d\s,]*\.\d{2})/i,
    /Interest\s+from\s+Savings\s+Bank\b/i,
  ];

  const depositPatterns = [
    /Interest\s+on\s+deposit\s*[:\-]?\s*(-?\s*\d[\d\s,]*\.\d{2})/i,
    /Deposit\s+interest\s*[:\-]?\s*(-?\s*\d[\d\s,]*\.\d{2})/i,
    /Interest\s+on\s+time\s+deposit\s*[:\-]?\s*(-?\s*\d[\d\s,]*\.\d{2})/i,
    /Interest\s+from\s+deposits\b/i,
  ];

  const dividendPatterns = [
    /Dividend\s+Income\s*[:\-]?\s*(-?\s*\d[\d\s,]*\.\d{2})/i,
    /Dividend\s*[:\-]?\s*(-?\s*\d[\d\s,]*\.\d{2})/i,
    /\bDividend\b/i,
  ];

  // Try to find the values
  for (const line of lines) {
    // Interest from savings bank
    for (const pat of savingsPatterns) {
      const match = line.match(pat);
      if (match) {
        if (match[1]) {
          data.interestSavings = ParserUtils.parseNormalizedNumber(match[1]);
        } else {
          // Positional
          const numbers = extractNumbersNoSpace(line);
          if (numbers.length > 0) {
            data.interestSavings = numbers[numbers.length - 1];
          }
        }
        break;
      }
    }

    // Interest on deposit
    for (const pat of depositPatterns) {
      const match = line.match(pat);
      if (match) {
        if (match[1]) {
          data.interestDeposit = ParserUtils.parseNormalizedNumber(match[1]);
        } else {
          const numbers = extractNumbersNoSpace(line);
          if (numbers.length > 0) {
            data.interestDeposit = numbers[numbers.length - 1];
          }
        }
        break;
      }
    }

    // Dividend
    for (const pat of dividendPatterns) {
      const match = line.match(pat);
      if (match) {
        if (match[1]) {
          data.dividendIncome = ParserUtils.parseNormalizedNumber(match[1]);
        } else {
          const numbers = extractNumbersNoSpace(line);
          if (numbers.length > 0) {
            data.dividendIncome = numbers[numbers.length - 1];
          }
        }
        break;
      }
    }
  }

  // Parse TDS Details in AIS: Look for TDS rows
  // Example TDS pattern: "TDS on..." or "TDS u/s" or "Tax Deducted at Source"
  // Format: [TAN] [Deductor Name] [Section] [Amount]
  for (const line of lines) {
    const matches = [...line.matchAll(/\b([A-Z]{4}[0-9]{5}[A-Z])\s+([A-Za-z0-9\s.,()&]{3,40}?)\s+\b(19[2-9][A-Z]*|206[A-Z]*|194[A-Z]*)\b/gi)];
    for (const match of matches) {
      const tan = match[1];
      const name = match[2].trim();
      const section = match[3];
      const numbers = extractNumbersNoSpace(line);
      if (numbers.length > 0) {
        const amount = numbers[numbers.length - 1];
        data.tdsDetails.push({
          tan,
          deductorName: name,
          section,
          amount,
        });
      }
    }
  }

  return data;
}
