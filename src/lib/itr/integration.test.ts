import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { webcrypto } from 'crypto';

// Polyfill Web Crypto API for Node.js/jsdom environment (required by pdfjs-dist for cryptographic operations/hashing)
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = webcrypto as any;
}

// Minimal DOMMatrix polyfill for Node.js/jsdom test runner environment
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    a: number = 1; b: number = 0; c: number = 0; d: number = 1; e: number = 0; f: number = 0;
    constructor(init?: string | number[]) {
      if (Array.isArray(init)) {
        this.a = init[0] ?? 1;
        this.b = init[1] ?? 0;
        this.c = init[2] ?? 0;
        this.d = init[3] ?? 1;
        this.e = init[4] ?? 0;
        this.f = init[5] ?? 0;
      }
    }
  } as any;
}

// Polyfill Promise.try for environments/Node versions that do not support it natively yet (e.g. Node 22 or older Vitest envs)
if (typeof Promise.try === 'undefined') {
  (Promise as any).try = function(fn: (...args: any[]) => any, ...args: any[]) {
    return new Promise((resolve, reject) => {
      try {
        resolve(fn(...args));
      } catch (err) {
        reject(err);
      }
    });
  };
}

import { extractTextFromPDF } from '../form16/extractor';
import { parseForm16Text } from '../form16/parser';

describe('Form-16 to ITR Integration Test with real PDF', () => {
  it('should correctly extract Form-16 data from sample_form16.pdf and match the verified ITR JSON output structure exactly', async () => {
    const pdfPath = path.resolve(process.cwd(), 'sample_form16.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);

    // Convert Buffer to ArrayBuffer
    const arrayBuffer = new Uint8Array(pdfBuffer).buffer;
    const extractedText = await extractTextFromPDF(arrayBuffer);
    const parsed = parseForm16Text(extractedText);

    const expectedJson = {
      "employer": {
        "name": "OPTUM GLOBAL SOLUTIONS (INDIA) PRIVATE LIMITED",
        "tan": "HYDQ00152F",
        "pan": "AAACQ2188G",
        "address": "5TH 6TH 7TH OFFICE LEVEL, SUNDEW PROPERTIES SEZ, APIIC LAYOUT,SURVEY NO.64, HITECH CITY, MADHAPUR, HYDERABAD - 500081, Telangana"
      },
      "employee": {
        "name": {
          "firstName": "MANAK",
          "middleName": "JEET",
          "lastName": "SINGH"
        },
        "pan": "AFNPS1912F",
        "address": "1101, GURGAON CITIZEN CGHS, PLOT NO 4, SECTOR 47, SUBHASH CHOWK, GURGAON - 122002 Haryana"
      },
      "assessmentYear": "2026-27",
      "period": {
        "from": "01-Apr-2025",
        "to": "31-Mar-2026"
      },
      "salary": {
        "grossSalary": 7280536,
        "salaryAsPer17_1": 7275532,
        "perquisites17_2": 5004,
        "profitsInLieu17_3": 0,
        "exemptAllowancesUs10": [
          {
            "nature": "House rent allowance under section 10(13A)",
            "amount": 1226539
          }
        ],
        "totalExemptAllowances": 1226539,
        "netSalary": 6053997,
        "standardDeduction16ia": 50000,
        "entertainmentAllowance16ii": 0,
        "professionalTax16iii": 2400,
        "totalDeductionsUs16": 52400,
        "incomeChargeableUnderHeadSalaries": 6001597
      },
      "otherIncome": {
        "houseProperty": 0,
        "otherSources": [],
        "totalOtherSources": 0
      },
      "grossTotalIncome": 6001597,
      "deductions80C": 150000,
      "deductions80CCC": 0,
      "deductions80CCD1": 0,
      "deductions80CCD1B": 49705,
      "deductions80CCD2": 0,
      "deductions80D": 22184,
      "deductions80E": 0,
      "deductions80G": 0,
      "deductions80TTA": 0,
      "totalChapterVIADeductions": 221889,
      "totalIncome": 5779708,
      "taxPayable": 1769096
    };

    // Sanitize parsed results to remove optional/extra fields not present in expected JSON (e.g. "code" inside "exemptAllowancesUs10")
    const sanitizedParsed = JSON.parse(JSON.stringify(parsed));
    sanitizedParsed.salary.exemptAllowancesUs10 = parsed.salary.exemptAllowancesUs10.map(({ nature, amount }) => ({ nature, amount }));

    expect(sanitizedParsed).toEqual(expectedJson);
  }, 20000);
});
