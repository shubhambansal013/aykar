import { TISData } from '../types';
import { ParserUtils } from '../form16/ParserUtils';

export function parseTISText(text: string): TISData {
  const data: TISData = {
    salaryDerived: 0,
    interestSavings: 0,
    interestDeposit: 0,
    dividendIncome: 0,
  };

  const lines = text.split('\n');

  const salaryPatterns = [
    /Salary\s*[:\-]?\s*(-?\s*\d[\d\s,]*\.\d{2})/i,
    /\bSalary\b/i
  ];

  const savingsPatterns = [
    /Interest\s+from\s+savings\s+bank\s*[:\-]?\s*(-?\s*\d[\d\s,]*\.\d{2})/i,
    /Savings\s+bank\s+interest\s*[:\-]?\s*(-?\s*\d[\d\s,]*\.\d{2})/i,
    /Interest\s+from\s+Savings\s+Bank\b/i,
  ];

  const depositPatterns = [
    /Interest\s+on\s+deposit\s*[:\-]?\s*(-?\s*\d[\d\s,]*\.\d{2})/i,
    /Deposit\s+interest\s*[:\-]?\s*(-?\s*\d[\d\s,]*\.\d{2})/i,
    /Interest\s+from\s+deposits\b/i,
  ];

  const dividendPatterns = [
    /Dividend\s+Income\s*[:\-]?\s*(-?\s*\d[\d\s,]*\.\d{2})/i,
    /Dividend\s*[:\-]?\s*(-?\s*\d[\d\s,]*\.\d{2})/i,
    /\bDividend\b/i,
  ];

  for (const line of lines) {
    // Salary - check specifically to avoid matching other words if salary is part of larger name
    // e.g. "Salary from Optum" should match
    for (const pat of salaryPatterns) {
      const match = line.match(pat);
      if (match) {
        if (match[1]) {
          data.salaryDerived = ParserUtils.parseNormalizedNumber(match[1]);
        } else {
          const numbers = ParserUtils.extractNumbersFromLine(line);
          if (numbers.length > 0) {
            data.salaryDerived = numbers[numbers.length - 1];
          }
        }
        break;
      }
    }

    // Savings Interest
    for (const pat of savingsPatterns) {
      const match = line.match(pat);
      if (match) {
        if (match[1]) {
          data.interestSavings = ParserUtils.parseNormalizedNumber(match[1]);
        } else {
          const numbers = ParserUtils.extractNumbersFromLine(line);
          if (numbers.length > 0) {
            data.interestSavings = numbers[numbers.length - 1];
          }
        }
        break;
      }
    }

    // Deposit Interest
    for (const pat of depositPatterns) {
      const match = line.match(pat);
      if (match) {
        if (match[1]) {
          data.interestDeposit = ParserUtils.parseNormalizedNumber(match[1]);
        } else {
          const numbers = ParserUtils.extractNumbersFromLine(line);
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
          const numbers = ParserUtils.extractNumbersFromLine(line);
          if (numbers.length > 0) {
            data.dividendIncome = numbers[numbers.length - 1];
          }
        }
        break;
      }
    }
  }

  return data;
}
