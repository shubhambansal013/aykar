import { describe, it, expect } from 'vitest';
import { extractTextFromPDF } from '../extractor';
import { parseForm16Text } from '../parser';
import { readFile } from 'fs/promises';
import path from 'path';

describe('Form16 integration test with real PDF', () => {
  it('should extract correct data from the provided Form 16 PDF', async () => {
    const pdfPath = path.resolve(process.cwd(), 'sample_form16.pdf');
    const pdfBuffer = await readFile(pdfPath);
    const text = await extractTextFromPDF(pdfBuffer);
    // For debugging, write text to file
    await import('fs/promises').then(fs => fs.writeFile('debug_extracted.txt', text));
    const parsed = parseForm16Text(text);
    console.log('Parsed object:', JSON.stringify(parsed, null, 2));

    // Expected output as provided by the user
    const expected = {
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

    // Debug: print differences
    if (JSON.stringify(parsed) !== JSON.stringify(expected)) {
      console.log('Expected:', JSON.stringify(expected, null, 2));
    }

    // Compare the parsed object with expected
    expect(parsed).toEqual(expected);
  });
});
