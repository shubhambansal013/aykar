import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { mapForm16ToITR1, mapToITR2, shouldUseITR2, mapToITR } from './mapper';
import { Form16Data, createForm16Proxy } from '../proto/compatibilityProxy';
import { parseTextProto } from '../proto/textproto';

describe('mapper and routing tests', () => {
  // Read mockData from external textproto testdata file for clean human readability
  const testdataPath = path.resolve(__dirname, './testdata/mock_form16_mapper_input.textproto');
  const mockBundle = parseTextProto(fs.readFileSync(testdataPath, 'utf-8'));
  const mockData: Form16Data = createForm16Proxy(mockBundle);

  describe('mapForm16ToITR1', () => {
    it('should map Form16Data to ITR1_JSON structure under OLD Tax Regime', () => {
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
      const result = mapForm16ToITR1(dataWithCredits, 'OLD');
      expect(result.ITR.ITR1.PersonalInfo.PAN).toBe('ABCDE1234F');
      expect(result.ITR.ITR1.ITR1_IncomeDeductions.GrossSalary).toBe(1000000);
      expect(result.ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80C).toBe(150000);
      expect(result.ITR.ITR1.FilingStatus.OptOutNewTaxRegime).toBe('Y');
      expect(result.ITR.ITR1.Form_ITR1.AssessmentYear).toBe('2026');
      expect(result.ITR.ITR1.TaxPaid.TaxesPaid.TDS).toBe(46000);
      expect(result.ITR.ITR1.TaxPaid.TaxesPaid.AdvanceTax).toBe(10000);
      expect(result.ITR.ITR1.TaxPaid.TaxesPaid.TotalTaxesPaid).toBe(58500);
      // Interest fields should be present with correct types
      expect(result.ITR.ITR1.ITR1_TaxComputation.IntrstPay.IntrstPayUs234A).toBeGreaterThanOrEqual(0);
      expect(result.ITR.ITR1.ITR1_TaxComputation.IntrstPay.IntrstPayUs234B).toBeGreaterThanOrEqual(0);
      expect(result.ITR.ITR1.ITR1_TaxComputation.IntrstPay.IntrstPayUs234C).toBeGreaterThanOrEqual(0);
      expect(result.ITR.ITR1.ITR1_TaxComputation.IntrstPay.LateFilingFee234F).toBeGreaterThanOrEqual(0);
      expect(result.ITR.ITR1.ITR1_TaxComputation.TotTaxPlusIntrstPay)
        .toBeGreaterThanOrEqual(result.ITR.ITR1.ITR1_TaxComputation.NetTaxLiability);
      expect(result.ITR.ITR1.ITR1_TaxComputation.TotalIntrstPay)
        .toBe(result.ITR.ITR1.ITR1_TaxComputation.TotTaxPlusIntrstPay - result.ITR.ITR1.ITR1_TaxComputation.NetTaxLiability);
    });

    it('should map Form16Data to ITR1_JSON structure under NEW Tax Regime', () => {
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
      const result = mapForm16ToITR1(dataWithCredits, 'NEW');
      expect(result.ITR.ITR1.PersonalInfo.PAN).toBe('ABCDE1234F');
      expect(result.ITR.ITR1.ITR1_IncomeDeductions.GrossSalary).toBe(1000000);
      // Section 80C should be stripped/0 in New Regime
      expect(result.ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80C).toBe(0);
      // Section 80CCD(2) employer NPS should be kept
      expect(result.ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80CCDEmployer).toBe(20000);
      expect(result.ITR.ITR1.FilingStatus.OptOutNewTaxRegime).toBe('N');
      expect(result.ITR.ITR1.Form_ITR1.AssessmentYear).toBe('2026');
    });

    it('should handle empty names correctly', () => {
      const data = { ...mockData, employee: { ...mockData.employee, name: { firstName: '', middleName: '', lastName: '' } } };
      const result = mapForm16ToITR1(data);
      expect(result.ITR.ITR1.PersonalInfo.AssesseeName.SurNameOrOrgName).toBe('SURNAME_REQUIRED');
    });
  });

  describe('shouldUseITR2', () => {
    it('should return false for single employer with no capital gains', () => {
      expect(shouldUseITR2(mockData, 1)).toBe(false);
    });

    it('should return true if capital gains are present', () => {
      const dataWithSTCG = { ...mockData, shortTermCapitalGains: 5000 };
      expect(shouldUseITR2(dataWithSTCG, 1)).toBe(true);

      const dataWithLTCG = { ...mockData, longTermCapitalGains112A: 15000 };
      expect(shouldUseITR2(dataWithLTCG, 1)).toBe(true);
    });

    it('should return true if there are multiple employers', () => {
      expect(shouldUseITR2(mockData, 2)).toBe(true);
    });
  });

  describe('mapToITR2', () => {
    it('should map Form16Data to ITR2_JSON structure under NEW Regime with no form16List fallback', () => {
      const result = mapToITR2(mockData, 'NEW');
      expect(result.ITR.ITR2.PersonalInfo.PAN).toBe('ABCDE1234F');
      expect(result.ITR.ITR2.Form_ITR2.FormName).toBe('ITR-2');
      expect(result.ITR.ITR2.ScheduleS.Details.length).toBe(1);
      expect(result.ITR.ITR2.ScheduleS.Details[0].EmployerName).toBe('Test Corp');
      expect(result.ITR.ITR2.ScheduleCG.ShortTermCapitalGains).toBe(0);
      expect(result.ITR.ITR2.ScheduleOS.TotalIncomeOthSrc).toBe(0);
    });

    it('should map with capital gains and other sources from AIS/TIS', () => {
      const dataWithAssets = {
        ...mockData,
        shortTermCapitalGains: 12000,
        longTermCapitalGains112A: 25000,
        aisData: {
          interestSavings: 1500,
          interestDeposit: 5000,
          dividendIncome: 800,
        },
        otherIncome: {
          totalOtherSources: 7300,
          otherSources: [
            { nature: 'Savings Bank Interest', amount: 1500 },
            { nature: 'FD Interest', amount: 5000 },
            { nature: 'Dividends', amount: 800 }
          ]
        }
      };

      const result = mapToITR2(dataWithAssets, 'NEW');
      expect(result.ITR.ITR2.ScheduleCG.ShortTermCapitalGains).toBe(12000);
      expect(result.ITR.ITR2.ScheduleCG.LongTermCapitalGains112A).toBe(25000);
      expect(result.ITR.ITR2.ScheduleOS.InterestSavings).toBe(1500);
      expect(result.ITR.ITR2.ScheduleOS.InterestDeposit).toBe(5000);
      expect(result.ITR.ITR2.ScheduleOS.DividendIncome).toBe(800);
      expect(result.ITR.ITR2.ScheduleOS.TotalIncomeOthSrc).toBe(7300);
      expect(result.ITR.ITR2.ScheduleOS.OtherSourceDetails.length).toBe(3);
    });

    it('should map multi-employer details correctly if form16List is provided', () => {
      const form16ListMock = [
        {
          data: {
            taxpayerProfile: mockBundle.taxpayerProfile,
            certificates: [
              {
                employerProfile: { name: 'Acme Corp', tan: 'T1', pan: 'P1', address: 'Addr 1' },
                partB: { salaryUs171: 400000, totalGrossSalary: 400000, totalSection16Deductions: 50000 }
              }
            ]
          }
        },
        {
          data: {
            taxpayerProfile: mockBundle.taxpayerProfile,
            certificates: [
              {
                employerProfile: { name: 'Beta Inc', tan: 'T2', pan: 'P2', address: 'Addr 2' },
                partB: { salaryUs171: 600000, totalGrossSalary: 600000, totalSection16Deductions: 50000 }
              }
            ]
          }
        }
      ];

      const result = mapToITR2(mockData, 'NEW', form16ListMock);
      expect(result.ITR.ITR2.ScheduleS.Details.length).toBe(2);
      expect(result.ITR.ITR2.ScheduleS.Details[0].EmployerName).toBe('Acme Corp');
      expect(result.ITR.ITR2.ScheduleS.Details[0].SalaryUs171).toBe(400000);
      expect(result.ITR.ITR2.ScheduleS.Details[1].EmployerName).toBe('Beta Inc');
      expect(result.ITR.ITR2.ScheduleS.Details[1].SalaryUs171).toBe(600000);
      expect(result.ITR.ITR2.ScheduleS.TotalSalaries).toBe(900000); // (400000 - 50000) + (600000 - 50000) = 900000
    });
  });

  describe('mapFlatToBundle TDS mapping', () => {
    it('should populate partA totalTdsDeducted and totalTdsDeposited from flat Form16Data fields', () => {
      const flatWithTds = {
        ...mockData,
        totalTdsDeducted: 85000,
        totalTdsDeposited: 82000,
        netTaxPayable: 5000,
      };
      const proxy = createForm16Proxy(flatWithTds);
      const bundle = proxy.__bundle;
      expect(bundle.certificates[0].partA.totalTdsDeducted).toBe(85000);
      expect(bundle.certificates[0].partA.totalTdsDeposited).toBe(82000);
      expect(bundle.certificates[0].partB.netTaxPayable).toBe(5000);
    });

    it('should default to 0 when TDS fields are absent and taxPayable is also 0', () => {
      const flatWithoutTds = {
        ...mockData,
        taxPayable: 0,
      };
      delete flatWithoutTds.totalTdsDeducted;
      delete flatWithoutTds.totalTdsDeposited;
      delete flatWithoutTds.netTaxPayable;
      const proxy = createForm16Proxy(flatWithoutTds);
      const bundle = proxy.__bundle;
      expect(bundle.certificates[0].partA.totalTdsDeducted).toBe(0);
      expect(bundle.certificates[0].partA.totalTdsDeposited).toBe(0);
      expect(bundle.certificates[0].partB.netTaxPayable).toBe(0);
    });

    it('should not use taxPayable as totalTdsDeducted', () => {
      const flatWithMismatch = {
        ...mockData,
        taxPayable: 50000,
        totalTdsDeducted: 42000,
        totalTdsDeposited: 42000,
      };
      const proxy = createForm16Proxy(flatWithMismatch);
      const bundle = proxy.__bundle;
      expect(bundle.certificates[0].partA.totalTdsDeducted).toBe(42000);
      expect(bundle.certificates[0].partA.totalTdsDeducted).not.toBe(50000);
    });
  });

  describe('mapFlatToBundle TDS backward compat', () => {
    it('should fall back to taxPayable for netTaxPayable when netTaxPayable is absent', () => {
      const flat = { ...mockData, taxPayable: 30000 };
      delete flat.netTaxPayable;
      const proxy = createForm16Proxy(flat);
      const bundle = proxy.__bundle;
      expect(bundle.certificates[0].partB.netTaxPayable).toBe(30000);
    });
  });

  describe('Interest under Sections 234A/234B/234C in ITR mapping', () => {
    it('should compute Section 234B interest in ITR-1 when advance tax is below 90% threshold', () => {
      const highIncomeNoAdvance = {
        ...mockData,
        assessmentYear: '2026',
        salary: {
          ...mockData.salary,
          grossSalary: 1850000,
          netSalary: 1850000,
          standardDeduction16ia: 75000,
          totalDeductionsUs16: 75000,
          incomeChargeableUnderHeadSalaries: 1775000,
        },
        otherIncome: { houseProperty: 0, otherSources: [], totalOtherSources: 0 },
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
        totalIncome: 0,
        grossTotalIncome: 0,
        taxCredits: {
          tdsSalary: 51290,
          tdsOther: 0,
          tcs: 0,
          advanceTax: 0,
          selfAssessmentTax: 0,
        },
      };

      const result = mapForm16ToITR1(highIncomeNoAdvance, 'NEW');
      const taxComp = result.ITR.ITR1.ITR1_TaxComputation;

      expect(taxComp.IntrstPay.IntrstPayUs234A).toBe(0);
      expect(taxComp.IntrstPay.IntrstPayUs234B).toBeGreaterThan(0);
      expect(taxComp.IntrstPay.IntrstPayUs234C).toBe(0);
      expect(taxComp.TotalIntrstPay).toBe(taxComp.IntrstPay.IntrstPayUs234B);
      expect(taxComp.TotTaxPlusIntrstPay).toBe(taxComp.NetTaxLiability + taxComp.TotalIntrstPay);
    });

    it('should compute zero interest when all tax is paid through TDS and advance tax', () => {
      const fullyPaid = {
        ...mockData,
        assessmentYear: '2026',
        taxCredits: {
          tdsSalary: 60000,
          tdsOther: 5000,
          tcs: 1000,
          advanceTax: 20000,
          selfAssessmentTax: 5000,
        },
      };

      const result = mapForm16ToITR1(fullyPaid, 'OLD');
      const taxComp = result.ITR.ITR1.ITR1_TaxComputation;

      expect(taxComp.IntrstPay.IntrstPayUs234B).toBe(0);
      expect(taxComp.TotalIntrstPay).toBe(0);
      expect(taxComp.TotTaxPlusIntrstPay).toBe(taxComp.NetTaxLiability);
    });
  });

  describe('mapToITR', () => {
    it('should map to ITR-1 if shouldUseITR2 is false', () => {
      const result = mapToITR(mockData, 'NEW');
      expect((result.ITR as any).ITR1).toBeDefined();
      expect((result.ITR as any).ITR2).toBeUndefined();
    });

    it('should map to ITR-2 if shouldUseITR2 is true', () => {
      const dataWithSTCG = { ...mockData, shortTermCapitalGains: 1000 };
      const result = mapToITR(dataWithSTCG, 'NEW');
      expect((result.ITR as any).ITR2).toBeDefined();
      expect((result.ITR as any).ITR1).toBeUndefined();
    });
  });
});
