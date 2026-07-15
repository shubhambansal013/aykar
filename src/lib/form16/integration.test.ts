import { describe, it, expect } from 'vitest';
import * as fs from 'fs';

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

import { extractTextFromPDF } from './extractor';
import { parseForm16Text } from './parser';

describe('Form 16 Integration Test', () => {
  it('should parse the sample Form 16 PDF and match the expected JSON output', async () => {
    const pdfPath = '/Users/bansalshubham/form16_test_data/form16.pdf';
    const expectedJsonPath = '/Users/bansalshubham/form16_test_data/form16output.json';

    const pdfBuffer = fs.readFileSync(pdfPath);
    const expectedJson = JSON.parse(fs.readFileSync(expectedJsonPath, 'utf-8'));

    // Convert Buffer to Uint8Array
    const arrayBuffer = new Uint8Array(pdfBuffer);
    const extractedText = await extractTextFromPDF(arrayBuffer);
    const parsedData = parseForm16Text(extractedText);

    // Assert Employer
    expect(parsedData.employer.name).toBe(expectedJson.employer.name);
    expect(parsedData.employer.tan).toBe(expectedJson.employer.tan);
    expect(parsedData.employer.pan).toBe(expectedJson.employer.pan);
    expect(parsedData.employer.address).toBe(expectedJson.employer.address);

    // Assert Employee
    expect(parsedData.employee.name.firstName).toBe(expectedJson.employee.name.firstName);
    expect(parsedData.employee.name.middleName).toBe(expectedJson.employee.name.middleName);
    expect(parsedData.employee.name.lastName).toBe(expectedJson.employee.name.lastName);
    expect(parsedData.employee.pan).toBe(expectedJson.employee.pan);
    expect(parsedData.employee.address).toBe(expectedJson.employee.address);

    // Assert Assessment Year and Period
    expect(parsedData.assessmentYear).toBe(expectedJson.assessmentYear);
    expect(parsedData.period.from).toBe(expectedJson.period.from);
    expect(parsedData.period.to).toBe(expectedJson.period.to);

    // Assert Salary components
    expect(parsedData.salary.grossSalary).toBe(expectedJson.salary.grossSalary);
    expect(parsedData.salary.salaryAsPer17_1).toBe(expectedJson.salary.salaryAsPer17_1);
    expect(parsedData.salary.perquisites17_2).toBe(expectedJson.salary.perquisites17_2);
    expect(parsedData.salary.profitsInLieu17_3).toBe(expectedJson.salary.profitsInLieu17_3);
    
    // Assert Exempt Allowances (ignore the 'code' key as it's not in the expected json)
    expect(parsedData.salary.exemptAllowancesUs10.length).toBe(expectedJson.salary.exemptAllowancesUs10.length);
    parsedData.salary.exemptAllowancesUs10.forEach((item, index) => {
      const expectedItem = expectedJson.salary.exemptAllowancesUs10[index];
      expect(item.nature).toBe(expectedItem.nature);
      expect(item.amount).toBe(expectedItem.amount);
    });

    expect(parsedData.salary.totalExemptAllowances).toBe(expectedJson.salary.totalExemptAllowances);
    expect(parsedData.salary.netSalary).toBe(expectedJson.salary.netSalary);
    expect(parsedData.salary.standardDeduction16ia).toBe(expectedJson.salary.standardDeduction16ia);
    expect(parsedData.salary.entertainmentAllowance16ii).toBe(expectedJson.salary.entertainmentAllowance16ii);
    expect(parsedData.salary.professionalTax16iii).toBe(expectedJson.salary.professionalTax16iii);
    expect(parsedData.salary.totalDeductionsUs16).toBe(expectedJson.salary.totalDeductionsUs16);
    expect(parsedData.salary.incomeChargeableUnderHeadSalaries).toBe(expectedJson.salary.incomeChargeableUnderHeadSalaries);

    // Assert Other Income
    expect(parsedData.otherIncome.houseProperty).toBe(expectedJson.otherIncome.houseProperty);
    expect(parsedData.otherIncome.totalOtherSources).toBe(expectedJson.otherIncome.totalOtherSources);

    // Assert Chapter VI-A Deductions
    expect(parsedData.deductions80C).toBe(expectedJson.deductions80C);
    expect(parsedData.deductions80CCC).toBe(expectedJson.deductions80CCC);
    expect(parsedData.deductions80CCD1).toBe(expectedJson.deductions80CCD1);
    expect(parsedData.deductions80CCD1B).toBe(expectedJson.deductions80CCD1B);
    expect(parsedData.deductions80CCD2).toBe(expectedJson.deductions80CCD2);
    expect(parsedData.deductions80D).toBe(expectedJson.deductions80D);
    expect(parsedData.deductions80E).toBe(expectedJson.deductions80E);
    expect(parsedData.deductions80G).toBe(expectedJson.deductions80G);
    expect(parsedData.deductions80TTA).toBe(expectedJson.deductions80TTA);
    expect(parsedData.totalChapterVIADeductions).toBe(expectedJson.totalChapterVIADeductions);

    // Assert Tax Payable and Total Income
    expect(parsedData.grossTotalIncome).toBe(expectedJson.grossTotalIncome);
    expect(parsedData.totalIncome).toBe(expectedJson.totalIncome);
    expect(parsedData.taxPayable).toBe(expectedJson.taxPayable);
  });
});
