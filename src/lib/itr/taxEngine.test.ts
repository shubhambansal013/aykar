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

    // New Regime calculations (Budget 2025 Slabs):
    // Gross Salary = 1200000
    // Exempt Allowances = 0 (Blocked)
    // Net Salary = 1200000
    // Deductions u/s 16 = 50000 standard deduction (using standardDeduction16ia from baseMockData)
    // Salaries Income = 1150000
    // House Property = 0 (loss not allowed)
    // Other sources = 10000
    // GTI = 1150000 + 10000 = 1160000
    // Chapter VI-A deductions = 20000 (Employer NPS 80CCD2 only, other deductions blocked)
    // Total income = 1140000
    // Tax computation (Budget 2025 Slabs):
    // Up to 4L: 0
    // 4L to 8L: 20000
    // 8L to 11.4L: (1140000 - 800000) * 10% = 34000
    // Tax before rebate = 54000
    // Rebate = 54000 (Total income 1140000 <= 1200000, rebate up to 60000)
    // Cess = 0
    // Total tax payable = 0
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
    expect(result.taxBeforeRebate).toBe(54000);
    expect(result.rebate87A).toBe(54000);
    expect(result.cess).toBe(0);
    expect(result.totalTaxPayable).toBe(0);
  });

  it('correctly compares tax regimes and recommends optimal choice', () => {
    const comparison = compareTaxRegimes(baseMockData);
    expect(comparison.oldRegime.totalTaxPayable).toBe(75920);
    expect(comparison.newRegime.totalTaxPayable).toBe(0); // Under Budget 2025, New Regime tax is 0 due to 12L rebate
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

    // Under New Regime: NTI = 450000. <= 12L, so rebate applies.
    // Tax = (450000 - 400000) * 5% = 2500. Rebate = 2500. Net tax = 0.
    const newRes = calculateNewRegime(lowIncomeData);
    expect(newRes.totalIncome).toBe(450000);
    expect(newRes.taxBeforeRebate).toBe(2500);
    expect(newRes.rebate87A).toBe(2500);
    expect(newRes.totalTaxPayable).toBe(0);
  });

  it('correctly calculates taxes with STCG and LTCG112A under New Regime', () => {
    const cgData: Form16Data = {
      ...baseMockData,
      salary: {
        ...baseMockData.salary,
        grossSalary: 600000,
        totalExemptAllowances: 0,
        standardDeduction16ia: 50000,
        entertainmentAllowance16ii: 0,
        professionalTax16iii: 0,
        totalDeductionsUs16: 50000,
        incomeChargeableUnderHeadSalaries: 550000,
      },
      otherIncome: { houseProperty: 0, otherSources: [], totalOtherSources: 0 },
      deductions80CCD2: 0,
      totalChapterVIADeductions: 0,
      // Add capital gains
      shortTermCapitalGains: 100000, // stcg
      longTermCapitalGains112A: 200000, // ltcg112a
    } as any;

    const result = calculateNewRegime(cgData);

    // Normal Income = 550000
    // Deductions = 0
    // STCG = 100000 (special 20% default since no securitySales is provided)
    // LTCG112A = 200000 (12.5% rate above 1.25L exemption)
    // GTI = 550000 + 100000 + 200000 = 850000
    // Total Income = 850000
    // Slab taxable income = 550000 (standard slabs)
    // Slab tax (Budget 2025 Slabs):
    // Up to 4L: 0
    // 4L to 5.5L: (550000 - 400000) * 5% = 7500
    // Special taxes:
    // STCG tax = 100000 * 20% = 20000
    // LTCG tax = (200000 - 125000) * 12.5% = 75000 * 12.5% = 9375
    // Tax before rebate = 7500 + 20000 + 9375 = 36875
    // Rebate 87A = 0 (Total income 850000 > 700000) wait, total income is 850k.
    // Under Budget 2025, rebate limit is 12,00,000! So 850k <= 12,00,000, hence rebate applies!
    // But rebate u/s 87A does NOT apply to LTCG112A (by law, and the code subtracts ltcgTax from taxBeforeRebate: Math.max(0, taxBeforeRebate - ltcgTax) => Math.max(0, 36875 - 9375) = 27500).
    // And is rebate allowed on special rate STCG @ 20%?
    // Let's check: Yes, under section 87A, rebate is allowed against tax on short term capital gain under section 111A, but Budget 2025/CBDT clarified that rebate u/s 87A is not applicable to special rate tax or STCG/LTCG. Let's see: `specialTax = ltcgTax + stcgTax` in our code blocks rebate on STCG and LTCG.
    // Let's verify our code's rebate:
    // `const specialTax = ltcgTax + stcgTax;` -> `specialTax = 9375 + 20000 = 29375`
    // `rebate87A = Math.min(60000, Math.max(0, taxBeforeRebate - specialTax))` => `Math.min(60000, Math.max(0, 36875 - 29375)) = 7500`.
    // So `rebate87A = 7500`.
    // `taxAfterRebate = taxBeforeRebate - rebate87A = 36875 - 7500 = 29375`.
    // `cess = 29375 * 0.04 = 1175`.
    // `totalTaxPayable = 29375 + 1175 = 30550`.
    expect(result.grossTotalIncome).toBe(850000);
    expect(result.totalIncome).toBe(850000);
    expect(result.taxBeforeRebate).toBe(36875);
    expect(result.rebate87A).toBe(7500);
    expect(result.totalTaxPayable).toBe(30550);
  });

  it('correctly calculates taxes with SFT transaction dates and caps chapter VI-A deductions under Old Regime', () => {
    const sftCgData: Form16Data = {
      ...baseMockData,
      salary: {
        ...baseMockData.salary,
        grossSalary: 200000,
        totalExemptAllowances: 0,
        standardDeduction16ia: 50000,
        entertainmentAllowance16ii: 0,
        professionalTax16iii: 0,
        totalDeductionsUs16: 50000,
        incomeChargeableUnderHeadSalaries: 150000,
      },
      otherIncome: { houseProperty: 0, otherSources: [], totalOtherSources: 0 },
      totalChapterVIADeductions: 200000, // greater than normal income (150000)
      aisData: {
        sftInfo: {
          securitySales: [
            {
              assetType: 'Short term',
              dateOfSaleTransfer: '10/05/2024', // Before July 23, 2024 -> slab rate
              securityClass: 'Listed Equity Share',
              salesConsideration: 50000,
              costOfAcquisition: 20000,
            },
            {
              assetType: 'Short term',
              dateOfSaleTransfer: '15/12/2025', // On/After July 23, 2024 -> 20%
              securityClass: 'Listed Equity Share',
              salesConsideration: 80000,
              costOfAcquisition: 40000,
            },
            {
              assetType: 'Long term',
              dateOfSaleTransfer: '25/02/2026',
              securityClass: 'Listed Equity Share',
              salesConsideration: 150000,
              costOfAcquisition: 25000, // Gain = 125000 -> LTCG112A
            }
          ]
        }
      }
    } as any;

    const result = calculateOldRegime(sftCgData);

    // Normal Income = 150000
    // Chapter VI-A deductions (200000) capped at normal income -> 150000
    // Remaining normal income after deduction = 0
    // STCG_slab = 30000 (10/05/2024)
    // STCG_special = 40000 (15/12/2025)
    // LTCG112A = 125000
    // GTI = 150000 + 30000 + 40000 + 125000 = 345000
    // Total income = (150000 - 150000) + 30000 + 40000 + 125000 = 195000
    // Slab taxable income = 0 (after deduction) + 30000 = 30000
    // Slab tax on 30000 (below 2.5L) = 0
    // Special rate taxes:
    // STCG_special tax = 40000 * 20% = 8000
    // LTCG112A tax = Math.max(0, 125000 - 125000) * 12.5% = 0
    // Tax before rebate = 8000
    // Rebate 87A = 8000 (total income 195000 <= 500000)
    // Net tax = 0
    expect(result.grossTotalIncome).toBe(345000);
    expect(result.totalIncome).toBe(195000);
    expect(result.chapterVIADeductions).toBe(150000);
    expect(result.taxBeforeRebate).toBe(8000);
    expect(result.rebate87A).toBe(8000);
    expect(result.totalTaxPayable).toBe(0);
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
      expect(result.totalChapterVIADeductions).toBe(155000); // 100000 + 20000 + 25000 + 10000
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
