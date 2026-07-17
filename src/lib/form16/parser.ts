import { Form16Data } from '../types';
import { BasicInfoParser } from './BasicInfoParser';
import { SalaryParser } from './SalaryParser';
import { OtherIncomeParser } from './OtherIncomeParser';
import { DeductionsParser } from './DeductionsParser';
import { TaxComputationParser } from './TaxComputationParser';
import { Form16Merger } from './Form16Merger';

export function mergeForm16Data(docs: Form16Data[]): Form16Data {
  return Form16Merger.merge(docs);
}

export function parseForm16Text(text: string): Form16Data {
  const data: Form16Data = {
    employer: { name: '', tan: '', pan: '', address: '' },
    employee: { name: { firstName: '', middleName: '', lastName: '' }, pan: '', address: '' },
    assessmentYear: '',
    period: { from: '', to: '' },
    salary: {
      grossSalary: 0,
      salaryAsPer17_1: 0,
      perquisites17_2: 0,
      profitsInLieu17_3: 0,
      exemptAllowancesUs10: [],
      totalExemptAllowances: 0,
      netSalary: 0,
      standardDeduction16ia: 0,
      entertainmentAllowance16ii: 0,
      professionalTax16iii: 0,
      totalDeductionsUs16: 0,
      incomeChargeableUnderHeadSalaries: 0,
    },
    otherIncome: { houseProperty: 0, otherSources: [], totalOtherSources: 0 },
    grossTotalIncome: 0,
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
    taxPayable: 0,
  };

  // Run the modular pipeline of sub-parsers
  BasicInfoParser.parse(text, data);
  SalaryParser.parse(text, data);
  OtherIncomeParser.parse(text, data);
  DeductionsParser.parse(text, data);
  TaxComputationParser.parse(text, data);

  return data;
}

// ----------------------------------------------------
// HYBRID POSITIONAL & REGEX HIGH-FIDELITY PARSERS FOR TARGET PDF FORMATS
// ----------------------------------------------------

import { DetailedForm16Parser } from './DetailedForm16Parser';
import {
  Form16Detailed,
  Form16DetailedBundle,
  EmployerProfile,
  EmploymentPeriod,
  PartA,
  PartB,
  QuarterSummary,
  ChallanDeposit,
  Form12BA,
  Verification
} from '../types';

export type {
  Form16Detailed,
  Form16DetailedBundle,
  EmployerProfile,
  EmploymentPeriod,
  PartA,
  PartB,
  QuarterSummary,
  ChallanDeposit,
  Form12BA,
  Verification
};

export function parseDetailedForm16(text: string): Form16Detailed {
  return DetailedForm16Parser.parse(text);
}

export function parseForm16ToDetailedBundle(texts: string[]): Form16DetailedBundle {
  return DetailedForm16Parser.parseToDetailedBundle(texts);
}
