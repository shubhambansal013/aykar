import { describe, it, expect } from 'vitest';
import { Form16Data, AISData, TISData, Form26ASData } from '../types';
import { reconcileAllDocuments } from './reconciliation';

describe('Reconciliation Module', () => {
  const mockForm16: Form16Data = {
    employer: { name: 'OPTUM GLOBAL', tan: 'HYDQ00152F', pan: 'AAACQ2188G', address: 'HYD' },
    employee: { name: { firstName: 'MANAK', middleName: 'JEET', lastName: 'SINGH' }, pan: 'AFNPS1912F', address: 'GGN' },
    assessmentYear: '2026-27',
    period: { from: '2025-04-01', to: '2026-03-31' },
    salary: {
      grossSalary: 1250000,
      salaryAsPer17_1: 1250000,
      perquisites17_2: 0,
      profitsInLieu17_3: 0,
      exemptAllowancesUs10: [],
      totalExemptAllowances: 0,
      netSalary: 1250000,
      standardDeduction16ia: 50000,
      entertainmentAllowance16ii: 0,
      professionalTax16iii: 0,
      totalDeductionsUs16: 50000,
      incomeChargeableUnderHeadSalaries: 1200000,
    },
    otherIncome: { houseProperty: 0, otherSources: [], totalOtherSources: 0 },
    grossTotalIncome: 1200000,
    deductions80C: 150000,
    deductions80CCC: 0,
    deductions80CCD1: 0,
    deductions80CCD1B: 0,
    deductions80CCD2: 0,
    deductions80D: 0,
    deductions80E: 0,
    deductions80G: 0,
    deductions80TTA: 0,
    totalChapterVIADeductions: 150000,
    totalIncome: 1050000,
    taxPayable: 150000,
  };

  it('should correctly reconcile incomes from AIS/TIS and TDS/TCS from Form 26AS', () => {
    const mockAIS: AISData = {
      interestSavings: 12000,
      interestDeposit: 35000,
      dividendIncome: 5000,
      tdsDetails: [],
    };

    const mockTIS: TISData = {
      salaryDerived: 1250000,
      interestSavings: 12000,
      interestDeposit: 35000,
      dividendIncome: 6000, // TIS has slightly higher dividend
    };

    const mock26AS: Form26ASData = {
      tdsSalary: [
        { tan: 'HYDQ00152F', deductorName: 'OPTUM GLOBAL', amount: 145000 }, // Discrepancy (145k vs 150k in Form-16)
      ],
      tdsOther: [
        { tan: 'ABCD12345E', deductorName: 'HDFC BANK', section: '194A', amount: 3500 },
      ],
      tcsDetails: [
        { collectorName: 'CAR DEALER', amount: 8000 },
      ],
      advanceTax: [
        { bsrCode: '1234567', date: '2025-12-15', challanNo: '00123', amount: 20000 },
      ],
      selfAssessmentTax: [],
    };

    const reconciled = reconcileAllDocuments(mockForm16, mockAIS, mockTIS, mock26AS);

    // Other income items merged (taking higher of AIS vs TIS)
    expect(reconciled.otherIncome.otherSources).toHaveLength(3);
    const savingsItem = reconciled.otherIncome.otherSources.find(x => x.nature.includes('Savings'));
    const depositItem = reconciled.otherIncome.otherSources.find(x => x.nature.includes('Deposits'));
    const dividendItem = reconciled.otherIncome.otherSources.find(x => x.nature.includes('Dividend'));

    expect(savingsItem?.amount).toBe(12000);
    expect(depositItem?.amount).toBe(35000);
    expect(dividendItem?.amount).toBe(6000); // 6000 from TIS is higher than 5000 from AIS

    // Recalculated total other sources and totals
    expect(reconciled.otherIncome.totalOtherSources).toBe(53000);
    expect(reconciled.grossTotalIncome).toBe(1253000); // 1200000 salary + 53000 other
    expect(reconciled.totalIncome).toBe(1103000); // 1253000 - 150000 deductions

    // Tax credits mapped correctly
    expect(reconciled.taxCredits).toBeDefined();
    expect(reconciled.taxCredits?.tdsSalary).toBe(145000);
    expect(reconciled.taxCredits?.tdsOther).toBe(3500);
    expect(reconciled.taxCredits?.tcs).toBe(8000);
    expect(reconciled.taxCredits?.advanceTax).toBe(20000);

    // Discrepancies computed
    expect(reconciled.discrepancies).toHaveLength(1);
    expect(reconciled.discrepancies?.[0]).toContain('TDS Discrepancy');
    expect(reconciled.discrepancies?.[0]).toContain('HYDQ00152F');
  });
});
