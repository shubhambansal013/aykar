import { describe, it, expect } from 'vitest';
import { validateForm16Data } from './validator';
import { Form16Data } from '../types';

describe('validateForm16Data', () => {
  const baseData: Form16Data = {
    employer: { name: '', tan: '', pan: '', address: '' },
    employee: { name: { firstName: '', middleName: '', lastName: '' }, pan: 'ABCDE1234F', address: '' },
    assessmentYear: '',
    period: { from: '', to: '' },
    salary: {
      grossSalary: 100000,
      salaryAsPer17_1: 100000,
      perquisites17_2: 0,
      profitsInLieu17_3: 0,
      exemptAllowancesUs10: [],
      totalExemptAllowances: 0,
      netSalary: 100000,
      standardDeduction16ia: 75000,
      entertainmentAllowance16ii: 0,
      professionalTax16iii: 0,
      totalDeductionsUs16: 75000,
      incomeChargeableUnderHeadSalaries: 25000,
    },
    otherIncome: { houseProperty: 0, otherSources: [], totalOtherSources: 0 },
    grossTotalIncome: 25000,
    deductions80C: 0,
    deductions80CCC: 0,
    deductions80CCD1: 0,
    deductions80CCD1B: 0,
    deductions80CCD2: 0,
    deductions80D: 0,
    deductions80E: 0,
    deductions80G: 0,
    deductions80TTA: 0,
    totalChapterVIADeductions: 0,
    totalIncome: 25000,
    taxPayable: 0,
  };

  it('should return no errors for valid data', () => {
    const errors = validateForm16Data(baseData);
    expect(errors).toHaveLength(0);
  });

  it('should catch invalid PAN', () => {
    const data = { ...baseData, employee: { ...baseData.employee, pan: 'INVALID' } };
    const errors = validateForm16Data(data);
    expect(errors).toContain('Invalid Employee PAN format: INVALID');
  });

  it('should catch 80C limit violation', () => {
    const data = { ...baseData, deductions80C: 200000 };
    const errors = validateForm16Data(data);
    expect(errors).toContain('Section 80C deduction cannot exceed ₹1,50,000. Found: ₹200000');
  });

  it('should catch 80TTA limit violation', () => {
    const data = { ...baseData, deductions80TTA: 15000 };
    const errors = validateForm16Data(data);
    expect(errors).toContain('Section 80TTA deduction cannot exceed ₹10,000. Found: ₹15000');
  });

  it('should catch GTI mismatch', () => {
    const data = { ...baseData, grossTotalIncome: 50000 };
    const errors = validateForm16Data(data);
    expect(errors).toContain('Gross Total Income mismatch. Calculated: ₹25000, Provided: ₹50000');
  });

  it('should catch standard deduction violation', () => {
    const data = { ...baseData, salary: { ...baseData.salary, standardDeduction16ia: 80000 } };
    const errors = validateForm16Data(data);
    expect(errors).toContain('Standard deduction (u/s 16ia) cannot exceed ₹75000. Found: ₹80000');
  });

  it('should perform cross-verification and catch mismatches/under-reporting', () => {
    const data = {
      ...baseData,
      employer: { name: 'OPTUM', tan: 'HYDQ00152F', pan: 'AAACQ2188G', address: 'HYD' },
      taxPayable: 150000,
      aisData: {
        interestSavings: 15000,
        interestDeposit: 25000,
        dividendIncome: 5000,
        tdsDetails: []
      },
      tisData: {
        salaryDerived: 110000, // Salary mismatch (100k vs 110k)
        interestSavings: 15000,
        interestDeposit: 25000,
        dividendIncome: 5000
      },
      form26asData: {
        tdsSalary: [{ tan: 'HYDQ00152F', deductorName: 'OPTUM', amount: 140000 }], // TDS mismatch (150k vs 140k)
        tdsOther: [],
        tcsDetails: [],
        advanceTax: [],
        selfAssessmentTax: []
      }
    };

    const errors = validateForm16Data(data);
    expect(errors.some(e => e.includes('TIS Salary Cross-verification'))).toBe(true);
    expect(errors.some(e => e.includes('Under-reporting Alert: Savings Bank Interest'))).toBe(true);
    expect(errors.some(e => e.includes('Under-reporting Alert: Deposit Interest'))).toBe(true);
    expect(errors.some(e => e.includes('Under-reporting Alert: Dividend Income'))).toBe(true);
    expect(errors.some(e => e.includes('TDS Cross-verification'))).toBe(true);
  });
});
