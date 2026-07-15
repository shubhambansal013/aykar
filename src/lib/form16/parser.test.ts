import { describe, it, expect } from 'vitest';
import { parseForm16Text } from './parser';
import { BasicInfoParser } from './BasicInfoParser';
import { ParserUtils } from './ParserUtils';

describe('parseForm16Text', () => {
  it('should extract PAN and basic salary components', () => {
    const mockText = `
      PAN OF THE EMPLOYEE ABCDE1234F
      Assessment Year 2026-27
      Gross Salary 1,200,000.00
      Salary as per section 17(1) 1,100,000.00
      Standard deduction u/s 16(ia) 75,000.00
      TAN OF THE DEDUCTOR ABCD12345E
      80C 150,000.00
    `;
    const result = parseForm16Text(mockText);
    expect(result.employee.pan).toBe('ABCDE1234F');
    expect(result.employer.tan).toBe('ABCD12345E');
    expect(result.salary.grossSalary).toBe(1200000);
    expect(result.salary.standardDeduction16ia).toBe(75000);
    expect(result.deductions80C).toBe(150000);
  });

  it('should extract comprehensive Form 16 data', () => {
    const mockText = `
      Certificate No. CERT123456
      Name and address of the Employer: Acme Corp India Pvt Ltd, 123 Business Park, Bangalore 560001
      Name and address of the Employee: John Quincy Adams, 456 Residency Road, Bangalore 560025
      PAN OF THE DEDUCTOR ABCDE1234F
      TAN OF THE DEDUCTOR ABCD12345E
      PAN OF THE EMPLOYEE VWXYZ9876S
      Assessment Year 2024-25
      Period with the employer: From 01-Apr-2023 To 31-Mar-2024

      1. Gross Salary
      (a) Salary as per section 17(1) 1,500,000.00
      (b) Value of perquisites u/s 17(2) 50,000.00
      (c) Profits in lieu of salary u/s 17(3) 0.00
      Total Gross Salary 1,550,000.00

      2. Less: Allowances to the extent exempt u/s 10
      Exempt Allowance 10(13A) 120,000.00
      Exempt Allowance 10(14) 20,000.00
      Total Exempt Allowances 140,000.00

      3. Net Salary 1,410,000.00

      4. Deductions u/s 16
      Standard deduction u/s 16(ia) 50,000.00
      Entertainment allowance u/s 16(ii) 0.00
      Tax on employment u/s 16(iii) 2,400.00

      5. Income chargeable under the head "Salaries" 1,357,600.00

      6. Any other income reported by the employee
      Income from house property -50,000.00
      Income from other sources 10,000.00
      Total other income -40,000.00

      7. Gross Total Income 1,317,600.00

      8. Deductions under Chapter VI-A
      80C 150,000.00
      80CCC 10,000.00
      80CCD(1) 50,000.00
      80CCD(1B) 50,000.00
      80CCD(2) 60,000.00
      80D 25,000.00
      80E 15,000.00
      80G 5,000.00
      80TTA 10,000.00

      Total Chapter VI-A Deductions 375,000.00

      9. Total Income 942,600.00
      10. Tax Payable 100,500.00
    `;

    const result = parseForm16Text(mockText);

    // Employer
    expect(result.employer.name).toBe('Acme Corp India Pvt Ltd');
    expect(result.employer.address).toBe('123 Business Park, Bangalore 560001');
    expect(result.employer.pan).toBe('ABCDE1234F');
    expect(result.employer.tan).toBe('ABCD12345E');

    // Employee
    expect(result.employee.name.firstName).toBe('John');
    expect(result.employee.name.middleName).toBe('Quincy');
    expect(result.employee.name.lastName).toBe('Adams');
    expect(result.employee.address).toBe('456 Residency Road, Bangalore 560025');
    expect(result.employee.pan).toBe('VWXYZ9876S');

    // Period & AY
    expect(result.assessmentYear).toBe('2024');
    expect(result.period.from).toBe('01-Apr-2023');
    expect(result.period.to).toBe('31-Mar-2024');

    // Salary
    expect(result.salary.salaryAsPer17_1).toBe(1500000);
    expect(result.salary.perquisites17_2).toBe(50000);
    expect(result.salary.profitsInLieu17_3).toBe(0);
    expect(result.salary.grossSalary).toBe(1550000);

    // Exempt Allowances
    expect(result.salary.exemptAllowancesUs10).toContainEqual({ code: '10(13A)', amount: 120000 });
    expect(result.salary.exemptAllowancesUs10).toContainEqual({ code: '10(14)', amount: 20000 });
    expect(result.salary.totalExemptAllowances).toBe(140000);
    expect(result.salary.netSalary).toBe(1410000);

    // Deductions u/s 16
    expect(result.salary.standardDeduction16ia).toBe(50000);
    expect(result.salary.professionalTax16iii).toBe(2400);
    expect(result.salary.totalDeductionsUs16).toBe(52400);
    expect(result.salary.incomeChargeableUnderHeadSalaries).toBe(1357600);

    // Other Income
    expect(result.otherIncome.houseProperty).toBe(-50000);
    expect(result.otherIncome.totalOtherSources).toBe(10000);
    expect(result.grossTotalIncome).toBe(1317600);

    // Chapter VI-A
    expect(result.deductions80C).toBe(150000);
    expect(result.deductions80CCC).toBe(10000);
    expect(result.deductions80CCD1).toBe(50000);
    expect(result.deductions80CCD1B).toBe(50000);
    expect(result.deductions80CCD2).toBe(60000);
    expect(result.deductions80D).toBe(25000);
    expect(result.deductions80E).toBe(15000);
    expect(result.deductions80G).toBe(5000);
    expect(result.deductions80TTA).toBe(10000);

    expect(result.totalChapterVIADeductions).toBe(375000);
    expect(result.totalIncome).toBe(942600);
    expect(result.taxPayable).toBe(100500);
  });

  it('should handle missing values gracefully', () => {
    const result = parseForm16Text('random text');
    expect(result.salary.grossSalary).toBe(0);
    expect(result.employee.pan).toBe('');
    expect(result.employer.name).toBe('');
  });

  it('should cover edge cases for names and PAN fallback', () => {
    const mockText = `
      Name and address of the Employee: Solo, 123 Lane
      TAN OF THE DEDUCTOR ABCD12345E
      PAN OF THE DEDUCTOR ABCDE1234F
      Some other text with a PAN: VWXYZ9876S
    `;
    const result = parseForm16Text(mockText);
    expect(result.employee.name.lastName).toBe('Solo');
    expect(result.employee.pan).toBe('VWXYZ9876S');

    const mockText2 = `
      Name and address of the Employee: John Doe, 456 Avenue
    `;
    const result2 = parseForm16Text(mockText2);
    expect(result2.employee.name.firstName).toBe('John');
    expect(result2.employee.name.lastName).toBe('Doe');
  });

  it('should handle fallback to second PAN if first belongs to employer', () => {
    const mockText = `
      TAN OF THE DEDUCTOR ABCD12345E
      PAN OF THE DEDUCTOR ABCDE1234F
      Random PANs: ABCDE1234F, GHIJK1234L
    `;
    const result = parseForm16Text(mockText);
    expect(result.employee.pan).toBe('GHIJK1234L');
  });

  it('should calculate gross salary if total labels are missing', () => {
    const mockText = `
      Salary as per section 17(1) 1,000,000.00
      Value of perquisites u/s 17(2) 50,000.00
      Profits in lieu of salary u/s 17(3) 10,000.00
    `;
    const result = parseForm16Text(mockText);
    expect(result.salary.grossSalary).toBe(1060000);
    expect(result.salary.profitsInLieu17_3).toBe(10000);
  });

  it('should extract Gross Salary correctly without Total prefix', () => {
      const mockText = `
        Gross Salary 999,999.00
      `;
      const result = parseForm16Text(mockText);
      expect(result.salary.grossSalary).toBe(999999);
  });

  it('should test and cover all branches for full coverage requirements', () => {
    // 1. Employee Verification / Declaration Matching
    const textDecl = `I, SHUBHAM BANSAL, son of Suresh Bansal...`;
    const resDecl = parseForm16Text(textDecl);
    expect(resDecl.employee.name.firstName).toBe('SHUBHAM');
    expect(resDecl.employee.name.lastName).toBe('BANSAL');

    // 2. Single Employee Name
    const textSingle = `Name and address of the Employee: Solo\n123 Street`;
    const resSingle = parseForm16Text(textSingle);
    expect(resSingle.employee.name.lastName).toBe('Solo');

    // 3. Form 12BA Employer matching
    const textForm12baEmployer = `Name and address of the employer: Google IT Services Pvt Ltd\n11th-12th Floor`;
    const resForm12baEmployer = parseForm16Text(textForm12baEmployer);
    expect(resForm12baEmployer.employer.name).toBe('Google IT Services Pvt Ltd');

    // 4. Form 12BA Employee matching
    const textForm12baEmployee = `Name, designation and Permanent Account Number or Aadhaar Number of employee: SHUBHAM BANSAL, Software Engineer, CESPB7152N`;
    const resForm12baEmployee = parseForm16Text(textForm12baEmployee);
    expect(resForm12baEmployee.employee.name.firstName).toBe('SHUBHAM');
    expect(resForm12baEmployee.employee.name.lastName).toBe('BANSAL');

    // 5. Form 12BB Employee matching
    const textForm12bbEmployee = `Name and address of the employee : SHUBHAM BANSAL\nPermanent Account Number`;
    const resForm12bbEmployee = parseForm16Text(textForm12bbEmployee);
    expect(resForm12bbEmployee.employee.name.firstName).toBe('SHUBHAM');
    expect(resForm12bbEmployee.employee.name.lastName).toBe('BANSAL');

    // 6. Tax Payable fallbacks
    const textTax1 = `tax payable 25,000.00`;
    const resTax1 = parseForm16Text(textTax1);
    expect(resTax1.taxPayable).toBe(25000);

    const textTax2 = `Net tax payable 12,345.00`;
    const resTax2 = parseForm16Text(textTax2);
    expect(resTax2.taxPayable).toBe(12345);

    // 7. Extract Amount coverages with undefined / no match
    const textNoMatch = `random stuff here`;
    const resNoMatch = parseForm16Text(textNoMatch);
    expect(resNoMatch.salary.salaryAsPer17_1).toBe(0);

    // 8. Employer block with fallback split (not matching corporate legal suffixes)
    const textEmployerFallback = `Name and address of the Employer: MyShop\nCorner street, 12345\nName and address of the Employee: John Doe`;
    const resEmployerFallback = parseForm16Text(textEmployerFallback);
    expect(resEmployerFallback.employer.name).toBe('MyShop');
    expect(resEmployerFallback.employer.address).toBe('Corner street, 12345');

    // 9. Employee address not starting with name
    const textEmployeeNoPrefix = `Name and address of the Employee: John Doe\nMain Street 44`;
    const resEmployeeNoPrefix = parseForm16Text(textEmployeeNoPrefix);
    expect(resEmployeeNoPrefix.employee.name.firstName).toBe('John');
    expect(resEmployeeNoPrefix.employee.name.lastName).toBe('Doe');
    expect(resEmployeeNoPrefix.employee.address).toBe('Main Street 44');

    // 10. Fallback index "Gross Salary" matching in Gross Salary block
    const textGsBlockFallback = `Some Header\nGross Salary\n(a) 1234.56\n(b) 5678.90\n(c) 0.00\n(d) Total 6913.46`;
    const resGsBlockFallback = parseForm16Text(textGsBlockFallback);
    expect(resGsBlockFallback.salary.salaryAsPer17_1).toBe(1234.56);
    expect(resGsBlockFallback.salary.perquisites17_2).toBe(5678.9);
    expect(resGsBlockFallback.salary.grossSalary).toBe(6913.46);

    // 11. Allowances exempt u/s 10 with direct match on Total Exempt Allowances
    const textAllowancesTotal = `Allowances to the extent exempt u/s 10\nExempt Allowance 10(13A) 5000.00\nTotal Exempt Allowances 5000.00`;
    const resAllowancesTotal = parseForm16Text(textAllowancesTotal);
    expect(resAllowancesTotal.salary.totalExemptAllowances).toBe(5000);
  });

  it('should parse the user reported incorrect form-16 values with high precision', () => {
    const userReportedText = `
      Name and address of the Employer/Specified Bank  GOOGLE IT SERVICES INDIA PRIVATE LIMITED 11th-12th Floor, Carina-West tower, Bagmane constellation, Business park, BANGALORE - 560048 Karnataka +(91)91-9063835619 apac-psp-ops@google.com  Name and address of the Employee/Specified senior citizen  SHUBHAM BANSAL T2-703 Pareena Coban, Dhankot Sector 99A, Dhankot(49), Gurgaon - 122505 Haryana  PAN of the Deductor  AAICG1919K  TAN of the Deductor  BLRG25952D  PAN of the Employee/Specified senior citizen  CESPB7152N  Assessment Year  2026-27  CIT (TDS)  The Commissioner of Income Tax (TDS) Room No. 59, H.M.T. Bhawan, 4th Floor, Bellary Road, Ganganagar, Bangalore - 560032  Period with the Employer To  31-Mar-2026  From  01-Apr-2025

      1. Gross Salary
      Salary as per provisions contained in section 17(1) (a)   4712762.00
      Value of perquisites under section 17(2) (as per Form No. 12BA, wherever applicable) (b) 4011738.00
      Total Gross Salary 8724500.00

      Standard deduction under section 16(ia) (a) 75000.00
      Net tax payable 2488029.00
    `;

    const res = parseForm16Text(userReportedText);

    expect(res.employer.name).toBe('GOOGLE IT SERVICES INDIA PRIVATE LIMITED');
    expect(res.employer.address).toBe('11th-12th Floor, Carina-West tower, Bagmane constellation, Business park, BANGALORE - 560048 Karnataka +(91)91-9063835619 apac-psp-ops@google.com');
    expect(res.employer.tan).toBe('BLRG25952D');
    expect(res.employer.pan).toBe('AAICG1919K');

    expect(res.employee.pan).toBe('CESPB7152N');
    expect(res.employee.name.firstName).toBe('SHUBHAM');
    expect(res.employee.name.lastName).toBe('BANSAL');
    expect(res.employee.address).toBe('T2-703 Pareena Coban, Dhankot Sector 99A, Dhankot(49), Gurgaon - 122505 Haryana');

    expect(res.assessmentYear).toBe('2026');
    expect(res.period.from).toBe('01-Apr-2025');
    expect(res.period.to).toBe('31-Mar-2026');

    expect(res.salary.salaryAsPer17_1).toBe(4712762);
    expect(res.salary.perquisites17_2).toBe(4011738);
    expect(res.salary.grossSalary).toBe(8724500);
    expect(res.salary.standardDeduction16ia).toBe(75000);
    expect(res.taxPayable).toBe(2488029);
  });

  it('should test positional anchoring and tokenized name extraction from block', () => {
    // 1. Test name block extraction directly
    expect(BasicInfoParser.extractNameFromBlock('SHUBHAM BANSAL T2-703 Pareena Coban')).toBe('SHUBHAM BANSAL');
    expect(BasicInfoParser.extractNameFromBlock('ALBERT EINSTEIN Flat 12B')).toBe('ALBERT EINSTEIN');
    expect(BasicInfoParser.extractNameFromBlock('Solo, 123 Lane')).toBe('Solo');
    expect(BasicInfoParser.extractNameFromBlock('John Quincy Adams, 456 Residency Road')).toBe('John Quincy Adams');

    // 2. Test Form 12BA declaration name extraction
    const form12baDeclText = `I, ALBERT EINSTEIN, employee of M/s GOOGLE ...`;
    const resForm12ba = parseForm16Text(form12baDeclText);
    expect(resForm12ba.employee.name.firstName).toBe('ALBERT');
    expect(resForm12ba.employee.name.lastName).toBe('EINSTEIN');

    // 3. Test Chapter VI-A positional boundary column extraction
    const deductionsText = `
      Deductions under Chapter VI-A
      80C 1,80,000.00 1,50,000.00
      80D 30,000.00 25,000.00
      80TTA 10,000.00
      Total Income 500,000.00
    `;
    const resDeductions = parseForm16Text(deductionsText);
    expect(resDeductions.deductions80C).toBe(150000);
    expect(resDeductions.deductions80D).toBe(25000);
    expect(resDeductions.deductions80TTA).toBe(10000);
  });
});

describe('ParserUtils additional coverage tests', () => {
  it('should cover all branches of parseNormalizedNumber', () => {
    expect(ParserUtils.parseNormalizedNumber('')).toBe(0);
    expect(ParserUtils.parseNormalizedNumber('invalid')).toBe(0);
    expect(ParserUtils.parseNormalizedNumber('12,34,56.78')).toBe(123456.78);
    expect(ParserUtils.parseNormalizedNumber('-1,000.50')).toBe(-1000.5);
  });

  it('should cover branches of extractNumbersFromLine', () => {
    expect(ParserUtils.extractNumbersFromLine('no numbers here')).toEqual([]);
    expect(ParserUtils.extractNumbersFromLine('amount is 100.00')).toEqual([100]);
    expect(ParserUtils.extractNumbersFromLine('multiple 100.00 and -200.00')).toEqual([100, -200]);
  });

  it('should cover all edge cases of extractAmount', () => {
    // 1. rule with empty lineRegexes
    const ruleNoLine: any = {
      fallbackRegexes: [/fallback\s+([\d.]+)/i]
    };
    expect(ParserUtils.extractAmount('fallback 123.45', ruleNoLine)).toBe(123.45);

    // 2. rule with defined numericTokenIndex >= 0
    const ruleWithIndex: any = {
      lineRegexes: [/target/i],
      fallbackRegexes: [],
      numericTokenIndex: 0
    };
    expect(ParserUtils.extractAmount('target 10.00 20.00', ruleWithIndex)).toBe(10);

    // 3. rule with resolvedIndex out of bounds
    const ruleOutBounds: any = {
      lineRegexes: [/target/i],
      fallbackRegexes: [],
      numericTokenIndex: 5
    };
    expect(ParserUtils.extractAmount('target 10.00 20.00', ruleOutBounds)).toBe(0);

    // 4. fallback regex with undefined matches
    const ruleUndefinedMatch: any = {
      fallbackRegexes: [/fallback(\s+)?([\d.]+)?/i]
    };
    expect(ParserUtils.extractAmount('fallback', ruleUndefinedMatch)).toBe(0);
    expect(ParserUtils.extractAmount('no fallback match', ruleUndefinedMatch)).toBe(0);
  });

  it('should cover getScopedBlock with missing end boundaries', () => {
    const boundaries = {
      start: /start_block/i,
      end: /end_block/i
    };
    const text = 'start_block some text but no end boundary here';
    expect(ParserUtils.getScopedBlock(text, boundaries, 15)).toBe('start_block som');
  });
});
