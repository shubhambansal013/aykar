import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { mapForm16ToITR1 } from './mapper';
import { Form16Data } from '../types';

describe('mapForm16ToITR1', () => {
  // Read mockData from external JSON testdata file for clean human readability
  const testdataPath = path.resolve(__dirname, './testdata/mock_form16_mapper_input.json');
  const mockData: Form16Data = JSON.parse(fs.readFileSync(testdataPath, 'utf-8'));

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
