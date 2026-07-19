import { Form16Data } from '@/lib/proto/compatibilityProxy';

export interface FieldDiff {
  path: string;
  label: string;
  oldVal: any;
  newVal: any;
}

const FIELD_LABELS: Record<string, string> = {
  'employer.name': 'Employer Name',
  'employer.pan': 'Employer PAN',
  'employer.tan': 'Employer TAN',
  'employer.address': 'Employer Address',
  'employee.name.firstName': 'Employee First Name',
  'employee.name.middleName': 'Employee Middle Name',
  'employee.name.lastName': 'Employee Last Name',
  'employee.pan': 'Employee PAN',
  'employee.address': 'Employee Address',
  'assessmentYear': 'Assessment Year',
  'period.from': 'Period From',
  'period.to': 'Period To',
  'salary.grossSalary': 'Gross Salary',
  'salary.salaryAsPer17_1': 'Salary u/s 17(1)',
  'salary.perquisites17_2': 'Perquisites u/s 17(2)',
  'salary.profitsInLieu17_3': 'Profits in lieu u/s 17(3)',
  'salary.totalExemptAllowances': 'Total Exempt Allowances',
  'salary.netSalary': 'Net Salary',
  'salary.standardDeduction16ia': 'Standard Deduction',
  'salary.entertainmentAllowance16ii': 'Entertainment Allowance',
  'salary.professionalTax16iii': 'Professional Tax',
  'salary.totalDeductionsUs16': 'Total Deductions u/s 16',
  'salary.incomeChargeableUnderHeadSalaries': 'Income from Salaries',
  'otherIncome.houseProperty': 'House Property Income',
  'otherIncome.totalOtherSources': 'Other Sources Income',
  'grossTotalIncome': 'Gross Total Income',
  'deductions80C': 'Section 80C',
  'deductions80CCC': 'Section 80CCC',
  'deductions80CCD1': 'Section 80CCD(1)',
  'deductions80CCD1B': 'Section 80CCD(1B)',
  'deductions80CCD2': 'Section 80CCD(2)',
  'deductions80D': 'Section 80D',
  'deductions80E': 'Section 80E',
  'deductions80G': 'Section 80G',
  'deductions80TTA': 'Section 80TTA',
  'totalChapterVIADeductions': 'Total Chapter VI-A Deductions',
  'totalIncome': 'Total Taxable Income',
  'taxPayable': 'Tax Payable',
};

function getNestedValue(obj: any, keyPath: string): any {
  const keys = keyPath.split('.');
  let curr = obj;
  for (const k of keys) {
    if (curr === undefined || curr === null) return undefined;
    curr = curr[k];
  }
  return curr;
}

function areValuesDifferent(v1: any, v2: any): boolean {
  const empty1 = v1 === undefined || v1 === null || v1 === '';
  const empty2 = v2 === undefined || v2 === null || v2 === '';
  if (empty1 && empty2) return false;
  if ((v1 === 0 && empty2) || (v2 === 0 && empty1)) return false;
  if (typeof v1 === 'string' && typeof v2 === 'string') {
    return v1.trim() !== v2.trim();
  }
  return v1 !== v2;
}

export function getForm16Differences(current: any, updated: any): FieldDiff[] {
  if (!updated) return [];
  const activeCurrent = current || {};
  const diffs: FieldDiff[] = [];

  for (const [path, label] of Object.entries(FIELD_LABELS)) {
    const oldVal = getNestedValue(activeCurrent, path);
    const newVal = getNestedValue(updated, path);
    if (areValuesDifferent(oldVal, newVal)) {
      diffs.push({ path, label, oldVal, newVal });
    }
  }

  return diffs;
}
