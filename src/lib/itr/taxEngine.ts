import { Form16Data, ReconciledTaxData } from '../types';

export interface TaxRegimeDetails {
  grossSalary: number;
  totalExemptAllowances: number;
  netSalary: number;
  standardDeduction: number;
  otherDeductionsUs16: number; // professional tax + entertainment allowance
  incomeFromSalaries: number;
  housePropertyIncome: number;
  otherSourcesIncome: number;
  grossTotalIncome: number;
  chapterVIADeductions: number;
  totalIncome: number;
  taxBeforeRebate: number;
  rebate87A: number;
  cess: number;
  totalTaxPayable: number;
  refundDue: number;
  balanceTaxPayable: number;
}

export interface DualRegimeComparison {
  oldRegime: TaxRegimeDetails;
  newRegime: TaxRegimeDetails;
  optimalRegime: 'OLD' | 'NEW';
}

/**
 * Computes tax payable for Old Regime.
 */
export function calculateOldRegime(data: Form16Data): TaxRegimeDetails {
  const salary = data.salary || {};
  const otherIncome = data.otherIncome || {};

  const grossSalary = salary.grossSalary || 0;
  const totalExemptAllowances = salary.totalExemptAllowances || 0;
  const netSalary = Math.max(0, grossSalary - totalExemptAllowances);

  const standardDeduction = salary.standardDeduction16ia || 0;
  const otherDeductionsUs16 = (salary.entertainmentAllowance16ii || 0) + (salary.professionalTax16iii || 0);
  const totalDeductionsUs16 = standardDeduction + otherDeductionsUs16;

  const incomeFromSalaries = Math.max(0, netSalary - totalDeductionsUs16);
  const housePropertyIncome = otherIncome.houseProperty || 0; // Negative interest on home loan (max negative offset up to -2,00,000)
  const otherSourcesIncome = otherIncome.totalOtherSources || 0;

  const grossTotalIncome = incomeFromSalaries + housePropertyIncome + otherSourcesIncome;

  const chapterVIADeductions = data.totalChapterVIADeductions || 0;
  const totalIncome = Math.max(0, grossTotalIncome - chapterVIADeductions);

  // Slab calculation
  let taxBeforeRebate = 0;
  if (totalIncome > 250000) {
    if (totalIncome <= 500000) {
      taxBeforeRebate += (totalIncome - 250000) * 0.05;
    } else {
      taxBeforeRebate += 12500; // 5% on 2.5L
      if (totalIncome <= 1000000) {
        taxBeforeRebate += (totalIncome - 500000) * 0.20;
      } else {
        taxBeforeRebate += 100000; // 20% on 5L
        taxBeforeRebate += (totalIncome - 1000000) * 0.30;
      }
    }
  }

  // Rebate 87A
  let rebate87A = 0;
  if (totalIncome <= 500000) {
    rebate87A = taxBeforeRebate;
  }

  const taxAfterRebate = Math.max(0, taxBeforeRebate - rebate87A);
  const cess = taxAfterRebate * 0.04;
  const totalTaxPayable = Math.round(taxAfterRebate + cess);

  // Reconcile with actual tax credits
  const recon = data as ReconciledTaxData;
  const credits = recon.taxCredits || {
    tdsSalary: 0,
    tdsOther: 0,
    tcs: 0,
    advanceTax: 0,
    selfAssessmentTax: 0,
  };
  const totalTDS = (credits.tdsSalary || 0) + (credits.tdsOther || 0);
  const totalTaxesPaid = (credits.advanceTax || 0) + totalTDS + (credits.tcs || 0) + (credits.selfAssessmentTax || 0);

  const balanceTaxPayable = Math.max(0, totalTaxPayable - totalTaxesPaid);
  const refundDue = Math.max(0, totalTaxesPaid - totalTaxPayable);

  return {
    grossSalary,
    totalExemptAllowances,
    netSalary,
    standardDeduction,
    otherDeductionsUs16,
    incomeFromSalaries,
    housePropertyIncome,
    otherSourcesIncome,
    grossTotalIncome,
    chapterVIADeductions,
    totalIncome: Math.round(totalIncome),
    taxBeforeRebate: Math.round(taxBeforeRebate),
    rebate87A: Math.round(rebate87A),
    cess: Math.round(cess),
    totalTaxPayable,
    refundDue: Math.round(refundDue),
    balanceTaxPayable: Math.round(balanceTaxPayable),
  };
}

/**
 * Computes tax payable for New Regime.
 */
export function calculateNewRegime(data: Form16Data): TaxRegimeDetails {
  const salary = data.salary || {};
  const otherIncome = data.otherIncome || {};

  const grossSalary = salary.grossSalary || 0;
  const totalExemptAllowances = 0; // Strip HRA / exempt allowances in New Regime
  const netSalary = grossSalary;

  // Under New Regime: Standard Deduction is allowed, usually 50,000
  // Professional tax and entertainment allowances are blocked
  const standardDeduction = salary.standardDeduction16ia > 0 ? salary.standardDeduction16ia : 50000;
  const otherDeductionsUs16 = 0;

  const incomeFromSalaries = Math.max(0, netSalary - standardDeduction);

  // House property loss cannot be offset against other income under New Regime
  const housePropertyIncome = Math.max(0, otherIncome.houseProperty || 0);
  const otherSourcesIncome = otherIncome.totalOtherSources || 0;

  const grossTotalIncome = incomeFromSalaries + housePropertyIncome + otherSourcesIncome;

  // Chapter VI-A deductions are blocked under New Regime, except Section 80CCD(2)
  const chapterVIADeductions = data.deductions80CCD2 || 0;
  const totalIncome = Math.max(0, grossTotalIncome - chapterVIADeductions);

  // Slab calculation (Budget 2024 Slabs)
  // Up to 3,00,000: Nil
  // 3,00,001 to 7,00,000: 5%
  // 7,00,001 to 10,00,000: 10%
  // 10,00,001 to 12,00,000: 15%
  // 12,00,001 to 15,00,000: 20%
  // Above 15,00,000: 30%
  let taxBeforeRebate = 0;
  if (totalIncome > 300000) {
    if (totalIncome <= 700000) {
      taxBeforeRebate += (totalIncome - 300000) * 0.05;
    } else {
      taxBeforeRebate += 20000; // 5% on 4L (3L to 7L)
      if (totalIncome <= 1000000) {
        taxBeforeRebate += (totalIncome - 700000) * 0.10;
      } else {
        taxBeforeRebate += 30000; // 10% on 3L (7L to 10L)
        if (totalIncome <= 1200000) {
          taxBeforeRebate += (totalIncome - 1000000) * 0.15;
        } else {
          taxBeforeRebate += 30000; // 15% on 2L (10L to 12L)
          if (totalIncome <= 1500000) {
            taxBeforeRebate += (totalIncome - 1200000) * 0.20;
          } else {
            taxBeforeRebate += 60000; // 20% on 3L (12L to 15L)
            taxBeforeRebate += (totalIncome - 1500000) * 0.30;
          }
        }
      }
    }
  }

  // Rebate 87A (For New Regime, rebate up to 20,000 is allowed if taxable income <= 7,00,000)
  let rebate87A = 0;
  if (totalIncome <= 700000) {
    rebate87A = taxBeforeRebate;
  }

  const taxAfterRebate = Math.max(0, taxBeforeRebate - rebate87A);
  const cess = taxAfterRebate * 0.04;
  const totalTaxPayable = Math.round(taxAfterRebate + cess);

  // Reconcile with actual tax credits
  const recon = data as ReconciledTaxData;
  const credits = recon.taxCredits || {
    tdsSalary: 0,
    tdsOther: 0,
    tcs: 0,
    advanceTax: 0,
    selfAssessmentTax: 0,
  };
  const totalTDS = (credits.tdsSalary || 0) + (credits.tdsOther || 0);
  const totalTaxesPaid = (credits.advanceTax || 0) + totalTDS + (credits.tcs || 0) + (credits.selfAssessmentTax || 0);

  const balanceTaxPayable = Math.max(0, totalTaxPayable - totalTaxesPaid);
  const refundDue = Math.max(0, totalTaxesPaid - totalTaxPayable);

  return {
    grossSalary,
    totalExemptAllowances,
    netSalary,
    standardDeduction,
    otherDeductionsUs16,
    incomeFromSalaries,
    housePropertyIncome,
    otherSourcesIncome,
    grossTotalIncome,
    chapterVIADeductions,
    totalIncome: Math.round(totalIncome),
    taxBeforeRebate: Math.round(taxBeforeRebate),
    rebate87A: Math.round(rebate87A),
    cess: Math.round(cess),
    totalTaxPayable,
    refundDue: Math.round(refundDue),
    balanceTaxPayable: Math.round(balanceTaxPayable),
  };
}

/**
 * Computes dual tax regimes side-by-side and returns them along with optimal choice.
 */
export function compareTaxRegimes(data: Form16Data): DualRegimeComparison {
  const oldRegime = calculateOldRegime(data);
  const newRegime = calculateNewRegime(data);

  // Optimal regime is the one with lower tax liability
  const optimalRegime = oldRegime.totalTaxPayable <= newRegime.totalTaxPayable ? 'OLD' : 'NEW';

  return {
    oldRegime,
    newRegime,
    optimalRegime,
  };
}
