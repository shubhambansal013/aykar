import { Form16Data } from '../types';

export function validateForm16Data(data: Form16Data): string[] {
  const errors: string[] = [];

  // Standard Deduction Rule (AY 2026-27 usually 50,000 or 75,000)
  const expectedStandardDeduction = 75000; // Assuming new regime or updated old regime
  if (data.salary.standardDeduction16ia > expectedStandardDeduction) {
    errors.push(`Standard deduction (u/s 16ia) cannot exceed ₹${expectedStandardDeduction}. Found: ₹${data.salary.standardDeduction16ia}`);
  }

  // 80C Limit
  if (data.deductions80C > 150000) {
    errors.push(`Section 80C deduction cannot exceed ₹1,50,000. Found: ₹${data.deductions80C}`);
  }

  // 80TTA Limit
  if (data.deductions80TTA > 10000) {
    errors.push(`Section 80TTA deduction cannot exceed ₹10,000. Found: ₹${data.deductions80TTA}`);
  }

  // Basic PAN check
  if (data.employee.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(data.employee.pan)) {
    errors.push(`Invalid Employee PAN format: ${data.employee.pan}`);
  }

  // Calculation consistency check
  const calculatedGTI = data.salary.incomeChargeableUnderHeadSalaries + data.otherIncome.houseProperty + data.otherIncome.totalOtherSources;
  if (Math.abs(data.grossTotalIncome - calculatedGTI) > 1) {
    errors.push(`Gross Total Income mismatch. Calculated: ₹${calculatedGTI}, Provided: ₹${data.grossTotalIncome}`);
  }

  return errors;
}
