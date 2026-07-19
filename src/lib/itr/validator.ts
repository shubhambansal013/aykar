import { Form16Data, ReconciledTaxData } from '../proto/compatibilityProxy';

export function validateForm16Data(data: Form16Data): string[] {
  const errors: string[] = [];

  if (!data) return errors;

  const salary = data.salary || {};
  const employee = data.employee || {};
  const employer = data.employer || {};
  const otherIncome = data.otherIncome || {};
  const otherSources = otherIncome.otherSources || [];

  // Standard Deduction Rule (AY 2026-27 usually 50,000 or 75,000)
  const expectedStandardDeduction = 75000; // Assuming new regime or updated old regime
  const standardDeduction16ia = salary.standardDeduction16ia || 0;
  if (standardDeduction16ia > expectedStandardDeduction) {
    errors.push(`Standard deduction (u/s 16ia) cannot exceed ₹${expectedStandardDeduction}. Found: ₹${standardDeduction16ia}`);
  }

  // 80C Limit
  const deductions80C = data.deductions80C || 0;
  if (deductions80C > 150000) {
    errors.push(`Section 80C deduction cannot exceed ₹1,50,000. Found: ₹${deductions80C}`);
  }

  // 80TTA Limit
  const deductions80TTA = data.deductions80TTA || 0;
  if (deductions80TTA > 10000) {
    errors.push(`Section 80TTA deduction cannot exceed ₹10,000. Found: ₹${deductions80TTA}`);
  }

  // Basic PAN check
  const employeePan = employee.pan;
  if (employeePan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(employeePan)) {
    errors.push(`Invalid Employee PAN format: ${employeePan}`);
  }

  // Calculation consistency check
  const incomeChargeableUnderHeadSalaries = salary.incomeChargeableUnderHeadSalaries || 0;
  const houseProperty = otherIncome.houseProperty || 0;
  const totalOtherSources = otherIncome.totalOtherSources || 0;
  const grossTotalIncome = data.grossTotalIncome || 0;

  const calculatedGTI = incomeChargeableUnderHeadSalaries + houseProperty + totalOtherSources;
  if (Math.abs(grossTotalIncome - calculatedGTI) > 1) {
    errors.push(`Gross Total Income mismatch. Calculated: ₹${calculatedGTI}, Provided: ₹${grossTotalIncome}`);
  }

  // Cross-verification with AIS, TIS, and Form 26AS if available (extended properties)
  const recon = data as ReconciledTaxData;

  // 1. Cross-verify TIS Salary
  if (recon.tisData && recon.tisData.salaryDerived > 0) {
    const grossSalary = salary.grossSalary || 0;
    if (Math.abs(recon.tisData.salaryDerived - grossSalary) > 10) {
      errors.push(`TIS Salary Cross-verification: Gross Salary in Form-16 (₹${grossSalary.toLocaleString('en-IN')}) does not match TIS derived salary (₹${recon.tisData.salaryDerived.toLocaleString('en-IN')}).`);
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
    const savingsReported = otherSources.some(
      s => s && s.nature && s.nature.toLowerCase().includes('savings') && (s.amount || 0) >= targetSavings
    );
    if (!savingsReported) {
      errors.push(`Under-reporting Alert: Savings Bank Interest of ₹${targetSavings.toLocaleString('en-IN')} found in AIS/TIS is not fully reported or is missing in Other Sources.`);
    }
  }

  if (targetDeposit > 0) {
    const depositReported = otherSources.some(
      s => s && s.nature && s.nature.toLowerCase().includes('deposit') && (s.amount || 0) >= targetDeposit
    );
    if (!depositReported) {
      errors.push(`Under-reporting Alert: Deposit Interest of ₹${targetDeposit.toLocaleString('en-IN')} found in AIS/TIS is not fully reported or is missing in Other Sources.`);
    }
  }

  if (targetDividend > 0) {
    const dividendReported = otherSources.some(
      s => s && s.nature && s.nature.toLowerCase().includes('dividend') && (s.amount || 0) >= targetDividend
    );
    if (!dividendReported) {
      errors.push(`Under-reporting Alert: Dividend Income of ₹${targetDividend.toLocaleString('en-IN')} found in AIS/TIS is not fully reported or is missing in Other Sources.`);
    }
  }

  // 3. Cross-verify TDS Salary against Form 26AS u/s 192
  if (recon.form26asData) {
    const matchingTds26as = (recon.form26asData.tdsSalary || []).find(
      (item) => item && item.tan && employer.tan && item.tan.toUpperCase() === employer.tan.toUpperCase()
    );
    const form16Tds = data.taxPayable || 0;
    if (matchingTds26as) {
      if (Math.abs(matchingTds26as.amount - form16Tds) > 1) {
        errors.push(`TDS Cross-verification: Employer's Form-16 TDS (₹${form16Tds.toLocaleString('en-IN')}) does not match Form 26AS TDS u/s 192 (₹${matchingTds26as.amount.toLocaleString('en-IN')}).`);
      }
    } else if (form16Tds > 0 && employer.tan) {
      errors.push(`TDS Cross-verification: Employer's TAN (${employer.tan}) has declared TDS of ₹${form16Tds.toLocaleString('en-IN')} in Form-16, but no matching TDS u/s 192 was found in Form 26AS.`);
    }
  }

  return errors;
}
