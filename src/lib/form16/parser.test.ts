import { describe, it, expect } from 'vitest';
import { parseForm16Text, mergeForm16Data } from './parser';
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
    expect(result.assessmentYear).toBe('2024-25');
    expect(result.period.from).toBe('01-Apr-2023');
    expect(result.period.to).toBe('31-Mar-2024');

    // Salary
    expect(result.salary.salaryAsPer17_1).toBe(1500000);
    expect(result.salary.perquisites17_2).toBe(50000);
    expect(result.salary.profitsInLieu17_3).toBe(0);
    expect(result.salary.grossSalary).toBe(1550000);

    // Exempt Allowances
    expect(result.salary.exemptAllowancesUs10).toContainEqual({ code: '10(13A)', nature: 'Exempt Allowance 10(13A)', amount: 120000 });
    expect(result.salary.exemptAllowancesUs10).toContainEqual({ code: '10(14)', nature: 'Exempt Allowance 10(14)', amount: 20000 });
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

  it('should correctly extract Part A TDS from standard Form-16 text', () => {
    // Full Form 16 with Part A (table format) and Part B
    const form16WithPartA = `
      Name and address of the Employer: Acme Corp India Pvt Ltd
      PAN OF THE DEDUCTOR ABCDE1234F
      TAN OF THE DEDUCTOR ABCD12345E
      PAN OF THE EMPLOYEE VWXYZ9876S
      Assessment Year 2024-25
      Period with the employer: From 01-Apr-2023 To 31-Mar-2024

      PART A
      Quarter(s)  Receipt No.  Amount Paid/Credited  Tax Deducted at Source  Tax Deposited
      Q1    Apr-Jun    1000000.00    250000.00    250000.00
      Q2    Jul-Sep    2000000.00    500000.00    500000.00
      Q3    Oct-Dec    2000000.00    500000.00    500000.00
      Q4    Jan-Mar    1500000.00    375000.00    375000.00
      Total (Rs.)    6500000.00    1625000.00    1625000.00

      Details of Tax Deducted and Deposited - Challan
      ...

      1. Gross Salary
      (a) Salary as per section 17(1) 1,500,000.00
      Total Gross Salary 1,500,000.00

      7. Gross Total Income 1,500,000.00
      9. Total Income 1,500,000.00
      10. Tax Payable 100,500.00
    `;

    const result = parseForm16Text(form16WithPartA);
    expect(result.totalTdsDeducted).toBe(1625000);
    expect(result.totalTdsDeposited).toBe(1625000);
    expect(result.taxPayable).toBe(100500);
  });

  it('should extract Part A TDS from labeled format (without Total (Rs.) table)', () => {
    const labeledFormat = `
      Name and address of the Employer: Beta Corp
      PAN OF THE EMPLOYEE VWXYZ9876S
      TAN OF THE DEDUCTOR ABCD12345E
      Assessment Year 2024-25

      PART A
      Total amount paid/credited: 6,500,000.00
      Total tax deducted at source: 1,625,000.00
      Total tax deposited: 1,625,000.00

      1. Gross Salary
      Gross Total Income 1,500,000.00
      Total Income 1,200,000.00
    `;

    const result = parseForm16Text(labeledFormat);
    expect(result.totalTdsDeducted).toBe(1625000);
    expect(result.totalTdsDeposited).toBe(1625000);
  });

  it('should return 0 for totalTdsDeducted and totalTdsDeposited when no Part A data', () => {
    const noPartA = `
      Name and address of the Employer: Gamma Corp
      PAN OF THE EMPLOYEE VWXYZ9876S
      1. Gross Salary
      Gross Total Income 500,000.00
      Total Income 400,000.00
      Tax Payable 20,000.00
    `;

    const result = parseForm16Text(noPartA);
    expect(result.totalTdsDeducted).toBe(0);
    expect(result.totalTdsDeposited).toBe(0);
    expect(result.taxPayable).toBe(20000);
  });

  it('should not extract TDS from tax payable line (false positive guard)', () => {
    const text = `
      Tax payable 25,000.00
      Net tax payable 22,500.00
    `;
    const result = parseForm16Text(text);
    expect(result.totalTdsDeducted).toBe(0);
    expect(result.totalTdsDeposited).toBe(0);
    expect(result.taxPayable).toBe(22500); // Net tax payable takes precedence
  });

  it('should test and cover all branches for full coverage requirements', () => {
    // 1. Employee Verification / Declaration Matching
    const textDecl = `I, ROHAN VERMA, son of Vijay Verma...`;
    const resDecl = parseForm16Text(textDecl);
    expect(resDecl.employee.name.firstName).toBe('ROHAN');
    expect(resDecl.employee.name.lastName).toBe('VERMA');

    // 2. Single Employee Name
    const textSingle = `Name and address of the Employee: Solo\n123 Street`;
    const resSingle = parseForm16Text(textSingle);
    expect(resSingle.employee.name.lastName).toBe('Solo');

    // 3. Form 12BA Employer matching
    const textForm12baEmployer = `Name and address of the employer: Innoventa Systems Pvt Ltd\n21st Floor`;
    const resForm12baEmployer = parseForm16Text(textForm12baEmployer);
    expect(resForm12baEmployer.employer.name).toBe('Innoventa Systems Pvt Ltd');

    // 4. Form 12BA Employee matching
    const textForm12baEmployee = `Name, designation and Permanent Account Number or Aadhaar Number of employee: ROHAN VERMA, Software Engineer, AROHV1234F`;
    const resForm12baEmployee = parseForm16Text(textForm12baEmployee);
    expect(resForm12baEmployee.employee.name.firstName).toBe('ROHAN');
    expect(resForm12baEmployee.employee.name.lastName).toBe('VERMA');

    // 5. Form 12BB Employee matching
    const textForm12bbEmployee = `Name and address of the employee : ROHAN VERMA\nPermanent Account Number`;
    const resForm12bbEmployee = parseForm16Text(textForm12bbEmployee);
    expect(resForm12bbEmployee.employee.name.firstName).toBe('ROHAN');
    expect(resForm12bbEmployee.employee.name.lastName).toBe('VERMA');

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
      Name and address of the Employer/Specified Bank  INNOVENTA SYSTEMS INDIA PRIVATE LIMITED 21st Floor, Skyline Tower, Sector 62, NOIDA - 201309 Uttar Pradesh +(91)98-76543210 hr@innoventa.in  Name and address of the Employee/Specified senior citizen  ROHAN VERMA A-101, Maple Residency, Sector 49, Gurugram - 122018 Haryana  PAN of the Deductor  AABBI7890C  TAN of the Deductor  BLRV56789F  PAN of the Employee/Specified senior citizen  AROHV1234F  Assessment Year  2026-27  CIT (TDS)  The Commissioner of Income Tax (TDS) Room No. 59, H.M.T. Bhawan, 4th Floor, Bellary Road, Ganganagar, Bangalore - 560032  Period with the Employer To  31-Mar-2026  From  01-Apr-2025

      1. Gross Salary
      Salary as per provisions contained in section 17(1) (a)   4712762.00
      Value of perquisites under section 17(2) (as per Form No. 12BA, wherever applicable) (b) 4011738.00
      Total Gross Salary 8724500.00

      Standard deduction under section 16(ia) (a) 75000.00
      Net tax payable 2488029.00
    `;

    const res = parseForm16Text(userReportedText);

    expect(res.employer.name).toBe('INNOVENTA SYSTEMS INDIA PRIVATE LIMITED');
    expect(res.employer.address).toBe('21st Floor, Skyline Tower, Sector 62, NOIDA - 201309 Uttar Pradesh +(91)98-76543210 hr@innoventa.in');
    expect(res.employer.tan).toBe('BLRV56789F');
    expect(res.employer.pan).toBe('AABBI7890C');

    expect(res.employee.pan).toBe('AROHV1234F');
    expect(res.employee.name.firstName).toBe('ROHAN');
    expect(res.employee.name.lastName).toBe('VERMA');
    expect(res.employee.address).toBe('A-101, Maple Residency, Sector 49, Gurugram - 122018 Haryana');

    expect(res.assessmentYear).toBe('2026-27');
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
    expect(BasicInfoParser.extractNameFromBlock('ROHAN VERMA A-101 Maple Residency')).toBe('ROHAN VERMA');
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

  it('should cover the default code and nature fallback logic in SalaryParser', () => {
    const text = `
      Allowances to the extent exempt u/s 10
      Exempt Allowance 50,000.00
      Total Exempt Allowances 50,000.00
    `;
    const result = parseForm16Text(text);
    expect(result.salary.exemptAllowancesUs10).toContainEqual({
      code: '10',
      nature: 'Exempt Allowance 10',
      amount: 50000
    });
  });

  it('should fallback to sum of individual allowances when Total Exempt Allowances is missing', () => {
    const text = `
      Allowances to the extent exempt u/s 10
      Exempt Allowance 10(13A) 25,000.00
      Exempt Allowance 10(14) 15,000.00
      Total Exempt Allowances
    `;
    const result = parseForm16Text(text);
    expect(result.salary.totalExemptAllowances).toBe(40000);
  });

  it('should correctly extract Form-16 data for NEXUS HEALTHCARE/PRIYA DEVI PATEL and verify ITR json structure', () => {
    const nexusForm16Text = `
      Name and address of the Employer/Specified Bank: NEXUS HEALTHCARE (INDIA) PRIVATE LIMITED, 4TH 5TH FLOOR, BUSINESS TOWER, INFORMATICS PARK, SECTOR 62, NOIDA - 201309, Uttar Pradesh
      Name and address of the Employee/Specified senior citizen: PRIYA DEVI PATEL, D-14, GREEN PARK, SECTOR 15, NOIDA - 201301 Uttar Pradesh
      PAN of the Deductor: AABBN2233C
      TAN of the Deductor: HYDN44556F
      PAN of the Employee: AEPPA1234F
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
        "name": "NEXUS HEALTHCARE (INDIA) PRIVATE LIMITED",
        "tan": "HYDN44556F",
        "pan": "AABBN2233C",
        "address": "4TH 5TH FLOOR, BUSINESS TOWER, INFORMATICS PARK, SECTOR 62, NOIDA - 201309, Uttar Pradesh"
      },
      "employee": {
        "name": {
          "firstName": "PRIYA",
          "middleName": "DEVI",
          "lastName": "PATEL"
        },
        "pan": "AEPPA1234F",
        "address": "D-14, GREEN PARK, SECTOR 15, NOIDA - 201301 Uttar Pradesh"
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

    const parsed = parseForm16Text(nexusForm16Text);

    // Deep equality assertions on all blocks to verify perfect alignment
    expect(parsed.employer).toEqual(expectedJson.employer);
    expect(parsed.employee).toEqual(expectedJson.employee);
    expect(parsed.assessmentYear).toBe(expectedJson.assessmentYear);
    expect(parsed.period).toEqual(expectedJson.period);

    // Verify exempt allowances without checking the optional 'code' field to match exact format
    const sanitizedExemptAllowances = parsed.salary.exemptAllowancesUs10.map(({ nature, amount }) => ({ nature, amount }));
    expect(sanitizedExemptAllowances).toEqual(expectedJson.salary.exemptAllowancesUs10);

    // Verify other salary fields
    expect(parsed.salary.grossSalary).toBe(expectedJson.salary.grossSalary);
    expect(parsed.salary.salaryAsPer17_1).toBe(expectedJson.salary.salaryAsPer17_1);
    expect(parsed.salary.perquisites17_2).toBe(expectedJson.salary.perquisites17_2);
    expect(parsed.salary.profitsInLieu17_3).toBe(expectedJson.salary.profitsInLieu17_3);
    expect(parsed.salary.totalExemptAllowances).toBe(expectedJson.salary.totalExemptAllowances);
    expect(parsed.salary.netSalary).toBe(expectedJson.salary.netSalary);
    expect(parsed.salary.standardDeduction16ia).toBe(expectedJson.salary.standardDeduction16ia);
    expect(parsed.salary.entertainmentAllowance16ii).toBe(expectedJson.salary.entertainmentAllowance16ii);
    expect(parsed.salary.professionalTax16iii).toBe(expectedJson.salary.professionalTax16iii);
    expect(parsed.salary.totalDeductionsUs16).toBe(expectedJson.salary.totalDeductionsUs16);
    expect(parsed.salary.incomeChargeableUnderHeadSalaries).toBe(expectedJson.salary.incomeChargeableUnderHeadSalaries);

    // Other income & deductions
    expect(parsed.otherIncome).toEqual(expectedJson.otherIncome);
    expect(parsed.grossTotalIncome).toBe(expectedJson.grossTotalIncome);
    expect(parsed.deductions80C).toBe(expectedJson.deductions80C);
    expect(parsed.deductions80CCC).toBe(expectedJson.deductions80CCC);
    expect(parsed.deductions80CCD1).toBe(expectedJson.deductions80CCD1);
    expect(parsed.deductions80CCD1B).toBe(expectedJson.deductions80CCD1B);
    expect(parsed.deductions80CCD2).toBe(expectedJson.deductions80CCD2);
    expect(parsed.deductions80D).toBe(expectedJson.deductions80D);
    expect(parsed.deductions80E).toBe(expectedJson.deductions80E);
    expect(parsed.deductions80G).toBe(expectedJson.deductions80G);
    expect(parsed.deductions80TTA).toBe(expectedJson.deductions80TTA);
    expect(parsed.totalChapterVIADeductions).toBe(expectedJson.totalChapterVIADeductions);
    expect(parsed.totalIncome).toBe(expectedJson.totalIncome);
    expect(parsed.taxPayable).toBe(expectedJson.taxPayable);
  });
});

describe('mergeForm16Data', () => {
  it('should return empty template when given empty array', () => {
    const result = mergeForm16Data([]);
    expect(result.salary.grossSalary).toBe(0);
    expect(result.employer.name).toBe('');
  });

  it('should return cloned single document when array has one element', () => {
    const doc = parseForm16Text('Gross Salary 500,000.00');
    const result = mergeForm16Data([doc]);
    expect(result.salary.grossSalary).toBe(500000);
  });

  it('should merge duplicate/same employer (Part A + Part B) correctly', () => {
    const docA = parseForm16Text(`
      Name and address of the Employer: Acme Corp
      PAN of the Employee: AROHV1234F
      TAN of the Deductor: BLRV56789F
      Period with the Employer To 31-Mar-2026 From 01-Apr-2025
      Tax Payable 10,000.00
    `);
    const docB = parseForm16Text(`
      Name and address of the Employer: Acme Corp
      PAN of the Employee: AROHV1234F
      TAN of the Deductor: BLRV56789F
      Salary as per section 17(1) 1,000,000.00
      Standard deduction u/s 16(ia) 75,000.00
    `);

    const merged = mergeForm16Data([docA, docB]);

    expect(merged.employer.name).toBe('Acme Corp');
    expect(merged.employer.tan).toBe('BLRV56789F');
    expect(merged.employee.pan).toBe('AROHV1234F');
    expect(merged.salary.salaryAsPer17_1).toBe(1000000);
    expect(merged.salary.grossSalary).toBe(1000000);
    expect(merged.salary.standardDeduction16ia).toBe(75000);
    expect(merged.taxPayable).toBe(10000);
    expect(merged.period.from).toBe('01-Apr-2025');
    expect(merged.period.to).toBe('31-Mar-2026');
  });

  it('should merge multiple different employers (job change) correctly', () => {
    const doc1 = parseForm16Text(`
      Name and address of the Employer: Acme Corp
      PAN of the Employee: AROHV1234F
      TAN of the Deductor: BLRV56789F
      Period with the Employer To 31-Aug-2025 From 01-Apr-2025
      Salary as per section 17(1) 500,000.00
      Standard deduction u/s 16(ia) 75,000.00
      80C 100,000.00
    `);
    const doc2 = parseForm16Text(`
      Name and address of the Employer: Beta Inc
      PAN of the Employee: AROHV1234F
      TAN of the Deductor: NEWG12345T
      Period with the Employer To 31-Mar-2026 From 01-Sep-2025
      Salary as per section 17(1) 700,000.00
      Standard deduction u/s 16(ia) 75,000.00
      80C 50,000.00
      Allowances to the extent exempt u/s 10
      Exempt Allowance 10(13A) 20,000.00
      Total Exempt Allowances 20,000.00
    `);

    const merged = mergeForm16Data([doc1, doc2]);

    expect(merged.employer.name).toBe('Acme Corp / Beta Inc');
    expect(merged.employer.tan).toBe('BLRV56789F / NEWG12345T');
    expect(merged.salary.salaryAsPer17_1).toBe(1200000);
    expect(merged.salary.grossSalary).toBe(1200000);
    // Standard deduction should be capped/maxed at 75k and not summed to 150k
    expect(merged.salary.standardDeduction16ia).toBe(75000);
    expect(merged.deductions80C).toBe(150000);
    expect(merged.salary.totalExemptAllowances).toBe(20000);
    expect(merged.period.from).toBe('01-Apr-2025');
    expect(merged.period.to).toBe('31-Mar-2026');
  });

  it('should sum totalTdsDeducted and totalTdsDeposited across multiple employers', () => {
    const doc1 = parseForm16Text(`
      Name and address of the Employer: Acme Corp
      PAN of the Employee: AROHV1234F
      TAN of the Deductor: BLRV56789F
      Period with the Employer To 31-Aug-2025 From 01-Apr-2025
      Salary as per section 17(1) 500,000.00
      Standard deduction u/s 16(ia) 75,000.00
      Total tax deducted at source 50,000.00
      Total tax deposited 50,000.00
      Tax Payable 15,000.00
    `);
    const doc2 = parseForm16Text(`
      Name and address of the Employer: Beta Inc
      PAN of the Employee: AROHV1234F
      TAN of the Deductor: NEWG12345T
      Period with the Employer To 31-Mar-2026 From 01-Sep-2025
      Salary as per section 17(1) 700,000.00
      Standard deduction u/s 16(ia) 75,000.00
      80C 50,000.00
      Total tax deducted at source 35,000.00
      Total tax deposited 35,000.00
      Tax Payable 60,000.00
    `);

    const merged = mergeForm16Data([doc1, doc2]);

    expect(merged.totalTdsDeducted).toBe(85000);
    expect(merged.totalTdsDeposited).toBe(85000);
    expect(merged.taxPayable).toBe(75000);
    // Salary should also be summed
    expect(merged.salary.salaryAsPer17_1).toBe(1200000);
    expect(merged.salary.grossSalary).toBe(1200000);
  });
});

describe('parser code quality - no user-specific hardcoding', () => {
  const parserFiles = [
    'src/lib/form16/BasicInfoParser.ts',
    'src/lib/form16/SalaryParser.ts',
    'src/lib/form16/DeductionsParser.ts',
    'src/lib/form16/OtherIncomeParser.ts',
    'src/lib/form16/TaxComputationParser.ts',
    'src/lib/form16/DetailedForm16Parser.ts',
    'src/lib/form16/FormatDetector.ts',
    'src/lib/form16/Form16Merger.ts',
    'src/lib/form16/ParserUtils.ts',
    'src/lib/form16/NormalizedIntermediateForm.ts',
    'src/lib/form16/FuzzyMatcher.ts',
    'src/lib/form16/extractionConfig.ts',
    'src/lib/ais/parser.ts',
    'src/lib/tis/parser.ts',
    'src/lib/form26as/parser.ts',
  ];

  const forbiddenPatterns: { pattern: RegExp; reason: string }[] = [
    { pattern: /['"]PARAMETRIC TECHNOLOGY['"]/i, reason: 'company-specific employer data' },
    { pattern: /['"]THOMSON REUTERS['"]/i, reason: 'company-specific employer data' },
    { pattern: /['"]sumit jain['"]/i, reason: 'person-specific name' },
    { pattern: /SHCHOUDHARY\@PTC\.COM/i, reason: 'person-specific email' },
    { pattern: /Payrollhelpdesk\.[aA]ndia\@thomsonreuters\.com/i, reason: 'employer-specific email' },
    { pattern: /GOOGLE IT SERVICES/i, reason: 'company-specific employer data' },
    { pattern: /OPTUM GLOBAL/i, reason: 'company-specific employer data' },
    { pattern: /TARUSH ARORA/i, reason: 'person-specific name' },
    { pattern: /MANAK JEET SINGH/i, reason: 'person-specific name' },
    { pattern: /SHUBHAM BANSAL/i, reason: 'person-specific name' },
    { pattern: /NIKHIL GOSWAMI/i, reason: 'person-specific name' },
    { pattern: /CESPB7152N/i, reason: 'person-specific PAN' },
    { pattern: /BLRG25952D/i, reason: 'person-specific TAN' },
    { pattern: /AAICG1919K/i, reason: 'person-specific PAN' },
    { pattern: /AFNPS1912F/i, reason: 'person-specific PAN' },
    { pattern: /CYXPA6852K/i, reason: 'person-specific PAN' },
    { pattern: /MUMI04584G/i, reason: 'person-specific TAN' },
    { pattern: /BLRP15144D/i, reason: 'person-specific TAN' },
  ];

  for (const filePath of parserFiles) {
    for (const { pattern, reason } of forbiddenPatterns) {
      it(`should not contain ${reason} in ${filePath}`, async () => {
        const content = await import('fs').then(fs => {
          const path = require('path');
          const fullPath = path.resolve(process.cwd(), filePath);
          return fs.readFileSync(fullPath, 'utf-8');
        });
        expect(pattern.test(content)).toBe(false);
      });
    }
  }
});
