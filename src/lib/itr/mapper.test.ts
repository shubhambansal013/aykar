import { describe, it, expect } from 'vitest';
import { mapForm16ToITR1 } from './mapper';
import { Form16Data } from '../types';

describe('mapForm16ToITR1', () => {
  const mockData: Form16Data = {
    employer: { name: 'Test Corp', tan: 'MUMT12345A', pan: 'MUMC12345A', address: 'Mumbai' },
    employee: { name: { firstName: 'John', middleName: '', lastName: 'Doe' }, pan: 'ABCDE1234F', address: 'Delhi' },
    assessmentYear: '2026',
    period: { from: '2025-04-01', to: '2026-03-31' },
    salary: {
      grossSalary: 1000000,
      salaryAsPer17_1: 900000,
      perquisites17_2: 100000,
      profitsInLieu17_3: 0,
      exemptAllowancesUs10: [
        { code: '10(13A)', nature: 'HRA', amount: 50000 }
      ],
      totalExemptAllowances: 50000,
      netSalary: 950000,
      standardDeduction16ia: 75000,
      entertainmentAllowance16ii: 0,
      professionalTax16iii: 0,
      totalDeductionsUs16: 75000,
      incomeChargeableUnderHeadSalaries: 875000,
    },
    otherIncome: { houseProperty: 0, otherSources: [], totalOtherSources: 0 },
    grossTotalIncome: 875000,
    deductions80C: 150000,
    deductions80CCC: 0,
    deductions80CCD1: 0,
    deductions80CCD1B: 0,
    deductions80CCD2: 0,
    deductions80D: 25000,
    deductions80E: 0,
    deductions80G: 0,
    deductions80TTA: 0,
    totalChapterVIADeductions: 175000,
    totalIncome: 700000,
    taxPayable: 50000,
  };

  it('should map Form16Data to ITR1_JSON structure correctly', () => {
    const dataWithCredits = {
      ...mockData,
      taxCredits: {
        tdsSalary: 45000,
        tdsOther: 1000,
        tcs: 500,
        advanceTax: 10000,
        selfAssessmentTax: 2000
      }
    };
    const result = mapForm16ToITR1(dataWithCredits);
    expect(result.ITR.ITR1.PersonalInfo.PAN).toBe('ABCDE1234F');
    expect(result.ITR.ITR1.ITR1_IncomeDeductions.GrossSalary).toBe(1000000);
    expect(result.ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80C).toBe(150000);
    expect(result.ITR.ITR1.Form_ITR1.AssessmentYear).toBe('2026');
    expect(result.ITR.ITR1.TaxPaid.TaxesPaid.TDS).toBe(46000);
    expect(result.ITR.ITR1.TaxPaid.TaxesPaid.AdvanceTax).toBe(10000);
    expect(result.ITR.ITR1.TaxPaid.TaxesPaid.TotalTaxesPaid).toBe(58500);
    expect(result.ITR.ITR1.Refund.RefundDue).toBe(8500); // 58500 total taxes paid - 50000 tax payable
  });

  it('should handle empty names correctly', () => {
    const data = { ...mockData, employee: { ...mockData.employee, name: { firstName: '', middleName: '', lastName: '' } } };
    const result = mapForm16ToITR1(data);
    expect(result.ITR.ITR1.PersonalInfo.AssesseeName.SurNameOrOrgName).toBe('SURNAME_REQUIRED');
  });
});
