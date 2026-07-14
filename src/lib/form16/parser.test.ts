import { describe, it, expect } from 'vitest';
import { parseForm16Text } from './parser';

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
});
