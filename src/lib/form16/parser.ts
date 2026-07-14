import { Form16Data } from '../types';
import { BasicInfoParser } from './BasicInfoParser';
import { SalaryParser } from './SalaryParser';
import { OtherIncomeParser } from './OtherIncomeParser';
import { DeductionsParser } from './DeductionsParser';
import { TaxComputationParser } from './TaxComputationParser';

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
