import { describe, it, expect } from 'vitest';
import { parseForm16Text } from '../form16/parser';

describe('Form-16 to ITR Integration Test', () => {
  it('should correctly extract Form-16 data for OPTUM and match the verified ITR JSON output structure exactly', () => {
    const optumForm16Text = `
      Name and address of the Employer/Specified Bank: OPTUM GLOBAL SOLUTIONS (INDIA) PRIVATE LIMITED, 5TH 6TH 7TH OFFICE LEVEL, SUNDEW PROPERTIES SEZ, APIIC LAYOUT,SURVEY NO.64, HITECH CITY, MADHAPUR, HYDERABAD - 500081, Telangana
      Name and address of the Employee/Specified senior citizen: MANAK JEET SINGH, 1101, GURGAON CITIZEN CGHS, PLOT NO 4, SECTOR 47, SUBHASH CHOWK, GURGAON - 122002 Haryana
      PAN of the Deductor: AAACQ2188G
      TAN of the Deductor: HYDQ00152F
      PAN of the Employee: AFNPS1912F
      Assessment Year: 2026-27
      Period with the employer: From 01-Apr-2025 To 31-Mar-2026

      1. Gross Salary
      (a) Salary as per section 17(1) 7,275,532.00
      (b) Value of perquisites u/s 17(2) 5,004.00
      (c) Profits in lieu of salary u/s 17(3) 0.00
      Total Gross Salary 7,280,536.00

      2. Less: Allowances to the extent exempt u/s 10
      House rent allowance under section 10(13A) 1,226,539.00
      Total Exempt Allowances 1,226,539.00

      3. Net Salary 6,053,997.00

      4. Deductions u/s 16
      Standard deduction u/s 16(ia) 50,000.00
      Entertainment allowance u/s 16(ii) 0.00
      Tax on employment u/s 16(iii) 2,400.00

      5. Income chargeable under the head "Salaries" 6,001,597.00

      6. Any other income reported by the employee
      Income from house property 0.00
      Income from other sources 0.00
      Total other income 0.00

      7. Gross Total Income 6,001,597.00

      8. Deductions under Chapter VI-A
      80C 1,50,000.00
      80CCC 0.00
      80CCD(1) 0.00
      80CCD(1B) 49,705.00
      80CCD(2) 0.00
      80D 22,184.00
      80E 0.00
      80G 0.00
      80TTA 0.00
      Total Chapter VI-A Deductions 221,889.00

      9. Total Income 5,779,708.00
      10. Tax Payable 1,769,096.00
    `;

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

    const parsed = parseForm16Text(optumForm16Text);

    // Sanitize parsed results to remove optional/extra fields not present in expected JSON (e.g. "code" inside "exemptAllowancesUs10")
    const sanitizedParsed = JSON.parse(JSON.stringify(parsed));
    sanitizedParsed.salary.exemptAllowancesUs10 = parsed.salary.exemptAllowancesUs10.map(({ nature, amount }) => ({ nature, amount }));

    expect(sanitizedParsed).toEqual(expectedJson);
  });
});
