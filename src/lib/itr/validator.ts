import { Form16Data, ReconciledTaxData } from '../types';

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

  // Cross-verification with AIS, TIS, and Form 26AS if available (extended properties)
  const recon = data as ReconciledTaxData;

  // 1. Cross-verify TIS Salary
  if (recon.tisData && recon.tisData.salaryDerived > 0) {
    if (Math.abs(recon.tisData.salaryDerived - data.salary.grossSalary) > 10) {
      errors.push(`TIS Salary Cross-verification: Gross Salary in Form-16 (₹${data.salary.grossSalary.toLocaleString('en-IN')}) does not match TIS derived salary (₹${recon.tisData.salaryDerived.toLocaleString('en-IN')}).`);
    }
  }

  // 2. Under-reporting other sources income checks
  const aisSavings = recon.aisData?.interestSavings || 0;
  const tisSavings = recon.tisData?.interestSavings || 0;
  const targetSavings = Math.max(aisSavings, tisSavings);

  const aisDeposit = recon.aisData?.interestDeposit || 0;
  const tisDeposit = recon.tisData?.interestDeposit || 0;
  const targetDeposit = Math.max(aisDeposit, tisDeposit);

  const aisDividend = recon.aisData?.dividendIncome || 0;
  const tisDividend = recon.tisData?.dividendIncome || 0;
  const targetDividend = Math.max(aisDividend, tisDividend);

  // We check if these are reported in other sources
  if (targetSavings > 0) {
    const savingsReported = data.otherIncome.otherSources.some(
      s => s.nature.toLowerCase().includes('savings') && s.amount >= targetSavings
    );
    if (!savingsReported) {
      errors.push(`Under-reporting Alert: Savings Bank Interest of ₹${targetSavings.toLocaleString('en-IN')} found in AIS/TIS is not fully reported or is missing in Other Sources.`);
    }
  }

  if (targetDeposit > 0) {
    const depositReported = data.otherIncome.otherSources.some(
      s => s.nature.toLowerCase().includes('deposit') && s.amount >= targetDeposit
    );
    if (!depositReported) {
      errors.push(`Under-reporting Alert: Deposit Interest of ₹${targetDeposit.toLocaleString('en-IN')} found in AIS/TIS is not fully reported or is missing in Other Sources.`);
    }
  }

  if (targetDividend > 0) {
    const dividendReported = data.otherIncome.otherSources.some(
      s => s.nature.toLowerCase().includes('dividend') && s.amount >= targetDividend
    );
    if (!dividendReported) {
      errors.push(`Under-reporting Alert: Dividend Income of ₹${targetDividend.toLocaleString('en-IN')} found in AIS/TIS is not fully reported or is missing in Other Sources.`);
    }
  }

  // 3. Cross-verify TDS Salary against Form 26AS u/s 192
  if (recon.form26asData) {
    const matchingTds26as = recon.form26asData.tdsSalary.find(
      (item) => item.tan.toUpperCase() === data.employer.tan.toUpperCase()
    );
    const form16Tds = data.taxPayable;
    if (matchingTds26as) {
      if (Math.abs(matchingTds26as.amount - form16Tds) > 1) {
        errors.push(`TDS Cross-verification: Employer's Form-16 TDS (₹${form16Tds.toLocaleString('en-IN')}) does not match Form 26AS TDS u/s 192 (₹${matchingTds26as.amount.toLocaleString('en-IN')}).`);
      }
    } else if (form16Tds > 0) {
      errors.push(`TDS Cross-verification: Employer's TAN (${data.employer.tan}) has declared TDS of ₹${form16Tds.toLocaleString('en-IN')} in Form-16, but no matching TDS u/s 192 was found in Form 26AS.`);
    }
  }

  return errors;
}
