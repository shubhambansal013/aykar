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
