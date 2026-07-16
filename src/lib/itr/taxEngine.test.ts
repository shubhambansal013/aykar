import { describe, it, expect } from 'vitest';
import { calculateOldRegime, calculateNewRegime, compareTaxRegimes, recalculateAllFormFields } from './taxEngine';
import { Form16Data } from '../types';

describe('taxEngine', () => {
  const baseMockData: Form16Data = {
    employer: { name: 'Test Corp', tan: 'MUMT12345A', pan: 'MUMC12345A', address: 'Mumbai' },
    employee: { name: { firstName: 'John', middleName: '', lastName: 'Doe' }, pan: 'ABCDE1234F', address: 'Delhi' },
    assessmentYear: '2026',
    period: { from: '2025-04-01', to: '2026-03-31' },
    salary: {
      grossSalary: 1200000,
      salaryAsPer17_1: 1100000,
      perquisites17_2: 100000,
      profitsInLieu17_3: 0,
      exemptAllowancesUs10: [
        { code: '10(13A)', nature: 'HRA', amount: 100000 }
      ],
      totalExemptAllowances: 100000,
      netSalary: 1100000,
      standardDeduction16ia: 50000,
      entertainmentAllowance16ii: 0,
      professionalTax16iii: 2500,
      totalDeductionsUs16: 52500,
      incomeChargeableUnderHeadSalaries: 1047500,
    },
    otherIncome: { houseProperty: -50000, otherSources: [{ nature: 'Interest', amount: 10000 }], totalOtherSources: 10000 },
    grossTotalIncome: 1007500,
    deductions80C: 150000,
    deductions80CCC: 0,
    deductions80CCD1: 0,
    deductions80CCD1B: 0,
    deductions80CCD2: 20000,
    deductions80D: 25000,
    deductions80E: 0,
    deductions80G: 0,
    deductions80TTA: 10000,
    totalChapterVIADeductions: 205000,
    totalIncome: 802500,
    taxPayable: 0,
  };

  it('correctly calculates Old Tax Regime details', () => {
    const result = calculateOldRegime(baseMockData);

    // Old Regime calculations:
    // Gross Salary = 1200000
    // Exempt Allowances = 100000
    // Net Salary = 1100000
    // Deductions u/s 16 = 52500 (50000 sd + 2500 professional tax)
    // Salaries Income = 1047500
    // House property loss = -50000
    // Other sources = 10000
    // GTI = 1047500 - 50000 + 10000 = 1007500
    // Chapter VI-A deductions = 205000
    // Total income = 802500
    // Tax computation (Old Slabs):
    // Up to 2.5L: 0
    // 2.5L to 5L: 12500
    // 5L to 802500 (302500): 302500 * 20% = 60500
    // Tax before rebate = 73000
    // Rebate 87A = 0 (Total Income > 500000)
    // Cess = 73000 * 4% = 2920
    // Total tax payable = 75920
    expect(result.grossSalary).toBe(1200000);
    expect(result.totalExemptAllowances).toBe(100000);
    expect(result.netSalary).toBe(1100000);
    expect(result.standardDeduction).toBe(50000);
    expect(result.otherDeductionsUs16).toBe(2500);
    expect(result.incomeFromSalaries).toBe(1047500);
    expect(result.housePropertyIncome).toBe(-50000);
    expect(result.otherSourcesIncome).toBe(10000);
    expect(result.grossTotalIncome).toBe(1007500);
    expect(result.chapterVIADeductions).toBe(205000);
    expect(result.totalIncome).toBe(802500);
    expect(result.taxBeforeRebate).toBe(73000);
    expect(result.rebate87A).toBe(0);
    expect(result.cess).toBe(2920);
    expect(result.totalTaxPayable).toBe(75920);
  });

  it('correctly calculates New Tax Regime details', () => {
    const result = calculateNewRegime(baseMockData);

    // New Regime calculations:
    // Gross Salary = 1200000
    // Exempt Allowances = 0 (Blocked)
    // Net Salary = 1200000
    // Deductions u/s 16 = 50000 standard deduction (professional tax/entertainment allowance blocked)
    // Salaries Income = 1150000
    // House Property = 0 (loss not allowed)
    // Other sources = 10000
    // GTI = 1150000 + 10000 = 1160000
    // Chapter VI-A deductions = 20000 (Employer NPS 80CCD2 only, other deductions blocked)
    // Total income = 1140000
    // Tax computation (Budget 2024 Slabs):
    // Up to 3L: 0
    // 3L to 7L: 20000
    // 7L to 10L: 30000
    // 10L to 11.4L (140000): 140000 * 15% = 21000
    // Tax before rebate = 71000
    // Rebate = 0 (Total income > 700000)
    // Cess = 71000 * 4% = 2840
    // Total tax payable = 73840
    expect(result.grossSalary).toBe(1200000);
    expect(result.totalExemptAllowances).toBe(0);
    expect(result.netSalary).toBe(1200000);
    expect(result.standardDeduction).toBe(50000);
    expect(result.otherDeductionsUs16).toBe(0);
    expect(result.incomeFromSalaries).toBe(1150000);
    expect(result.housePropertyIncome).toBe(0);
    expect(result.otherSourcesIncome).toBe(10000);
    expect(result.grossTotalIncome).toBe(1160000);
    expect(result.chapterVIADeductions).toBe(20000);
    expect(result.totalIncome).toBe(1140000);
    expect(result.taxBeforeRebate).toBe(71000);
    expect(result.rebate87A).toBe(0);
    expect(result.cess).toBe(2840);
    expect(result.totalTaxPayable).toBe(73840);
  });

  it('correctly compares tax regimes and recommends optimal choice', () => {
    const comparison = compareTaxRegimes(baseMockData);
    expect(comparison.oldRegime.totalTaxPayable).toBe(75920);
    expect(comparison.newRegime.totalTaxPayable).toBe(73840);
    expect(comparison.optimalRegime).toBe('NEW');
  });

  it('applies Rebate 87A for lower incomes', () => {
    const lowIncomeData: Form16Data = {
      ...baseMockData,
      salary: {
        ...baseMockData.salary,
        grossSalary: 500000,
        totalExemptAllowances: 0,
        standardDeduction16ia: 50000,
        entertainmentAllowance16ii: 0,
        professionalTax16iii: 0,
      },
      otherIncome: { houseProperty: 0, otherSources: [], totalOtherSources: 0 },
      deductions80CCD2: 0,
      totalChapterVIADeductions: 0,
    };

    // Under Old Regime: NTI = 450000 (Standard deduction of 50000). <= 5L, so rebate applies.
    // Tax = (450000 - 250000) * 5% = 10000. Rebate = 10000. Net tax = 0.
    const oldRes = calculateOldRegime(lowIncomeData);
    expect(oldRes.totalIncome).toBe(450000);
    expect(oldRes.taxBeforeRebate).toBe(10000);
    expect(oldRes.rebate87A).toBe(10000);
    expect(oldRes.totalTaxPayable).toBe(0);

    // Under New Regime: NTI = 450000. <= 7L, so rebate applies.
    // Tax = (450000 - 300000) * 5% = 7500. Rebate = 7500. Net tax = 0.
    const newRes = calculateNewRegime(lowIncomeData);
    expect(newRes.totalIncome).toBe(450000);
    expect(newRes.taxBeforeRebate).toBe(7500);
    expect(newRes.rebate87A).toBe(7500);
    expect(newRes.totalTaxPayable).toBe(0);
  });

  describe('recalculateAllFormFields', () => {
    it('correctly recalculates fields under OLD regime when individual components change', () => {
      const data: Form16Data = {
        ...baseMockData,
        salary: {
          ...baseMockData.salary,
          salaryAsPer17_1: 1000000,
          perquisites17_2: 50000,
          profitsInLieu17_3: 10000,
          grossSalary: 0, // Should be calculated as 1060000
          exemptAllowancesUs10: [
            { code: '10(13A)', amount: 50000 }
          ],
          totalExemptAllowances: 0, // Should be calculated as 50000
          netSalary: 0, // Should be calculated as 1010000
          standardDeduction16ia: 50000,
          entertainmentAllowance16ii: 0,
          professionalTax16iii: 2500,
          totalDeductionsUs16: 0, // Should be calculated as 52500
          incomeChargeableUnderHeadSalaries: 0, // Should be calculated as 957500
        },
        otherIncome: {
          houseProperty: -20000,
          otherSources: [
            { nature: 'Savings Bank Interest', amount: 15000 }
          ],
          totalOtherSources: 0, // Should be calculated as 15000
        },
        deductions80C: 100000,
        deductions80D: 25000,
        deductions80TTA: 10000,
        totalChapterVIADeductions: 0, // Should be calculated as 135000
        totalIncome: 0, // Should be calculated
      };

      const result = recalculateAllFormFields(data, 'OLD');
      expect(result.salary.grossSalary).toBe(1060000);
      expect(result.salary.totalExemptAllowances).toBe(50000);
      expect(result.salary.netSalary).toBe(1010000);
      expect(result.salary.totalDeductionsUs16).toBe(52500);
      expect(result.salary.incomeChargeableUnderHeadSalaries).toBe(957500);
      expect(result.otherIncome.totalOtherSources).toBe(15000);
      expect(result.grossTotalIncome).toBe(957500 - 20000 + 15000); // 952500
      expect(result.totalChapterVIADeductions).toBe(155000);
      expect(result.totalIncome).toBe(952500 - 155000); // 797500
      expect(result.taxPayable).toBeGreaterThan(0);
    });

    it('respects manual overrides when editedPath matches summary fields', () => {
      const data: Form16Data = {
        ...baseMockData,
        salary: {
          ...baseMockData.salary,
          salaryAsPer17_1: 1000000,
          perquisites17_2: 50000,
          profitsInLieu17_3: 10000,
          grossSalary: 1500000, // Manual override
        },
        totalChapterVIADeductions: 250000, // Manual override
      };

      const result = recalculateAllFormFields(data, 'OLD', 'salary.grossSalary');
      expect(result.salary.grossSalary).toBe(1500000); // Maintained override

      const resultDeductions = recalculateAllFormFields(data, 'OLD', 'totalChapterVIADeductions');
      expect(resultDeductions.totalChapterVIADeductions).toBe(250000); // Maintained override
    });
  });
});
