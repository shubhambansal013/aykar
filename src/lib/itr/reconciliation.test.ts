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

  it('should handle pre-existing matching other sources, additional AIS TDS, and fallback default scenarios safely', () => {
    const mockForm16WithOthers: Form16Data = {
      ...mockForm16,
      otherIncome: {
        houseProperty: 0,
        otherSources: [
          { nature: 'Interest from Savings Bank', amount: 5000 },
          { nature: 'Interest on Deposits', amount: 40000 } // Higher than the AIS/TIS value (35000)
        ],
        totalOtherSources: 45000
      }
    };

    const mockAIS: AISData = {
      interestSavings: 12000, // Higher than existing (5000)
      interestDeposit: 35000, // Lower than existing (40000)
      dividendIncome: 5000,
      tdsDetails: [
        { tan: 'NEWTAN1234', deductorName: 'NEW DEDUCTOR', section: '192', amount: 2500 },
        { tan: 'ABCD12345E', deductorName: 'HDFC BANK', section: '194A', amount: 1500 }
      ]
    };

    const mockTIS: TISData = {
      salaryDerived: 1300000, // Salary mismatch! (1250000 vs 1300000)
      interestSavings: 12000,
      interestDeposit: 35000,
      dividendIncome: 5000
    };

    // Reconcile with 26AS omitted to trigger fallback TDS salary matching
    const reconciled = reconcileAllDocuments(mockForm16WithOthers, mockAIS, mockTIS, undefined);

    // Savings updated to 12000, Deposit preserved at 40000
    const savings = reconciled.otherIncome.otherSources.find(x => x.nature.includes('Savings'));
    const deposit = reconciled.otherIncome.otherSources.find(x => x.nature.includes('Deposits'));
    expect(savings?.amount).toBe(12000);
    expect(deposit?.amount).toBe(40000);

    // Extra TDS from AIS is merged (2500 + form-16 150000)
    expect(reconciled.taxCredits?.tdsSalary).toBe(152500);
    expect(reconciled.taxCredits?.tdsOther).toBe(1500);

    // Income Discrepancy warning should be generated
    expect(reconciled.discrepancies?.some(d => d.includes('Income Discrepancy'))).toBe(true);
  });

  it('should handle completely empty / partial form16 fields safely', () => {
    const partialForm16 = {
      // missing employer, employee, salary, otherIncome
    } as any;

    const reconciled = reconcileAllDocuments(partialForm16, undefined, undefined, undefined);
    expect(reconciled.employer).toBeDefined();
    expect(reconciled.otherIncome?.otherSources).toBeDefined();
    expect(reconciled.salary?.grossSalary).toBe(0);
  });

  it('should correctly reconcile Capital Gains and cap deductions', () => {
    const form16Data: Form16Data = {
      ...mockForm16,
      salary: {
        ...mockForm16.salary,
        incomeChargeableUnderHeadSalaries: 100000,
      },
      totalChapterVIADeductions: 150000, // greater than normal income (100000)
    } as any;

    const aisData: AISData = {
      interestSavings: 0,
      interestDeposit: 0,
      dividendIncome: 0,
      shortTermCapitalGains: 50000,
      longTermCapitalGains112A: 75000,
      tdsDetails: [],
    };

    const reconciled = reconcileAllDocuments(form16Data, aisData, undefined, undefined);

    // Normal Income = 100000 salary
    // STCG = 50000
    // LTCG112A = 75000
    // GTI = 100000 + 50000 + 75000 = 225000
    // Deductions capped at 100000
    // Total income = 0 + 50000 + 75000 = 125000
    expect(reconciled.shortTermCapitalGains).toBe(50000);
    expect(reconciled.longTermCapitalGains112A).toBe(75000);
    expect(reconciled.grossTotalIncome).toBe(225000);
    expect(reconciled.totalIncome).toBe(125000);
    expect(reconciled.detectedIncomeSources?.some(x => x.category === 'shortTermCapitalGains')).toBe(true);
    expect(reconciled.detectedIncomeSources?.some(x => x.category === 'longTermCapitalGains112A')).toBe(true);
  });
});
