import { Form16Data, ReconciledTaxData } from '../proto/compatibilityProxy';

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

const BUDGET_2024_DATE = new Date(2024, 6, 23); // July 23, 2024 (Month is 0-based, so 6 is July)

function parseDateOfSale(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return null;
}

interface CapitalGainsBreakdown {
  stcgAtSlab: number;
  stcgAt20: number;
  ltcg112a: number;
}

function extractCapitalGains(data: Form16Data): CapitalGainsBreakdown {
  let stcgAtSlab = 0;
  let stcgAt20 = 0;
  let ltcg112a = 0;

  const aisData = (data as any).aisData;
  const securitySales = aisData?.sftInfo?.securitySales || [];

  if (securitySales.length > 0) {
    for (const sale of securitySales) {
      const gain = (sale.salesConsideration || 0) - (sale.costOfAcquisition || 0);
      if (sale.assetType === 'Short term') {
        const saleDate = parseDateOfSale(sale.dateOfSaleTransfer);
        const isListedEquity = sale.securityClass === 'Listed Equity Share' || sale.infoCode?.startsWith('SFT-17-LES');
        const isOnOrAfterBudget24 = saleDate && saleDate >= BUDGET_2024_DATE;

        if (isListedEquity && isOnOrAfterBudget24) {
          stcgAt20 += gain;
        } else {
          stcgAtSlab += gain;
        }
      } else if (sale.assetType === 'Long term') {
        ltcg112a += gain;
      }
    }
  } else {
    // Fallback using flat values
    stcgAt20 = (data as any).shortTermCapitalGains || 0;
    ltcg112a = (data as any).longTermCapitalGains112A || 0;
  }

  return {
    stcgAtSlab: Math.max(0, stcgAtSlab),
    stcgAt20: Math.max(0, stcgAt20),
    ltcg112a: Math.max(0, ltcg112a),
  };
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

  const { stcgAtSlab, stcgAt20, ltcg112a } = extractCapitalGains(data);

  const grossTotalIncome = incomeFromSalaries + housePropertyIncome + otherSourcesIncome + stcgAtSlab + stcgAt20 + ltcg112a;

  const normalIncome = incomeFromSalaries + housePropertyIncome + otherSourcesIncome;
  const rawDeductions = data.totalChapterVIADeductions || 0;
  const chapterVIADeductions = Math.min(rawDeductions, Math.max(0, normalIncome));

  const totalIncome = Math.max(0, normalIncome - chapterVIADeductions) + stcgAtSlab + stcgAt20 + ltcg112a;

  const slabTaxableIncome = Math.max(0, normalIncome - chapterVIADeductions) + stcgAtSlab;

  // Slab calculation
  let taxBeforeRebate = 0;
  if (slabTaxableIncome > 250000) {
    if (slabTaxableIncome <= 500000) {
      taxBeforeRebate += (slabTaxableIncome - 250000) * 0.05;
    } else {
      taxBeforeRebate += 12500; // 5% on 2.5L
      if (slabTaxableIncome <= 1000000) {
        taxBeforeRebate += (slabTaxableIncome - 500000) * 0.20;
      } else {
        taxBeforeRebate += 100000; // 20% on 5L
        taxBeforeRebate += (slabTaxableIncome - 1000000) * 0.30;
      }
    }
  }

  // Add special rate taxes
  const stcgTax = stcgAt20 * 0.20;
  taxBeforeRebate += stcgTax;

  const ltcgTax = Math.max(0, ltcg112a - 125000) * 0.125;
  taxBeforeRebate += ltcgTax;

  // Rebate 87A (excluding LTCG112A tax)
  let rebate87A = 0;
  if (totalIncome <= 500000) {
    rebate87A = Math.max(0, taxBeforeRebate - ltcgTax);
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

  const { stcgAtSlab, stcgAt20, ltcg112a } = extractCapitalGains(data);

  const grossTotalIncome = incomeFromSalaries + housePropertyIncome + otherSourcesIncome + stcgAtSlab + stcgAt20 + ltcg112a;

  // Chapter VI-A deductions are blocked under New Regime, except Section 80CCD(2), capped at normal income
  const normalIncome = incomeFromSalaries + housePropertyIncome + otherSourcesIncome;
  const rawDeductions = data.deductions80CCD2 || 0;
  const chapterVIADeductions = Math.min(rawDeductions, Math.max(0, normalIncome));

  const totalIncome = Math.max(0, normalIncome - chapterVIADeductions) + stcgAtSlab + stcgAt20 + ltcg112a;

  const slabTaxableIncome = Math.max(0, normalIncome - chapterVIADeductions) + stcgAtSlab;

  // Slab calculation (Budget 2024 Slabs)
  // Up to 3,00,000: Nil
  // 3,00,001 to 7,00,000: 5%
  // 7,00,001 to 10,00,000: 10%
  // 10,00,001 to 12,00,000: 15%
  // 12,00,001 to 15,00,000: 20%
  // Above 15,00,000: 30%
  let taxBeforeRebate = 0;
  if (slabTaxableIncome > 300000) {
    if (slabTaxableIncome <= 700000) {
      taxBeforeRebate += (slabTaxableIncome - 300000) * 0.05;
    } else {
      taxBeforeRebate += 20000; // 5% on 4L (3L to 7L)
      if (slabTaxableIncome <= 1000000) {
        taxBeforeRebate += (slabTaxableIncome - 700000) * 0.10;
      } else {
        taxBeforeRebate += 30000; // 10% on 3L (7L to 10L)
        if (slabTaxableIncome <= 1200000) {
          taxBeforeRebate += (slabTaxableIncome - 1000000) * 0.15;
        } else {
          taxBeforeRebate += 30000; // 15% on 2L (10L to 12L)
          if (slabTaxableIncome <= 1500000) {
            taxBeforeRebate += (slabTaxableIncome - 1200000) * 0.20;
          } else {
            taxBeforeRebate += 60000; // 20% on 3L (12L to 15L)
            taxBeforeRebate += (slabTaxableIncome - 1500000) * 0.30;
          }
        }
      }
    }
  }

  // Add special rate taxes
  const stcgTax = stcgAt20 * 0.20;
  taxBeforeRebate += stcgTax;

  const ltcgTax = Math.max(0, ltcg112a - 125000) * 0.125;
  taxBeforeRebate += ltcgTax;

  // Rebate 87A (For New Regime, rebate up to 20,000 is allowed if taxable income <= 7,00,000, excluding LTCG112A tax)
  let rebate87A = 0;
  if (totalIncome <= 700000) {
    rebate87A = Math.max(0, taxBeforeRebate - ltcgTax);
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

/**
 * Performs a complete mathematical recalculation of all dependent and derived fields in Form16Data
 * based on the active tax regime ('OLD' or 'NEW').
 * Optional editedPath indicates which specific field is being edited directly by the user,
 * allowing us to respect manual overrides to summary fields.
 */
export function recalculateAllFormFields(data: Form16Data, regime: 'OLD' | 'NEW', editedPath?: string): Form16Data {
  const next: Form16Data = JSON.parse(JSON.stringify(data || {}));

  const salary = next.salary || {
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
  };
  next.salary = salary;

  const otherIncome = next.otherIncome || { houseProperty: 0, otherSources: [], totalOtherSources: 0 };
  next.otherIncome = otherIncome;

  // 1. Gross Salary = 17_1 + 17_2 + 17_3
  if (editedPath !== 'salary.grossSalary') {
    const calculatedGross = (salary.salaryAsPer17_1 || 0) + (salary.perquisites17_2 || 0) + (salary.profitsInLieu17_3 || 0);
    if (calculatedGross > 0 || (salary.salaryAsPer17_1 === 0 && salary.perquisites17_2 === 0 && salary.profitsInLieu17_3 === 0 && salary.grossSalary === 0)) {
      salary.grossSalary = calculatedGross;
    }
  }

  // 2. Exempt Allowances (Blocked under NEW, allowed under OLD)
  if (editedPath !== 'salary.totalExemptAllowances') {
    if (regime === 'OLD') {
      const calculatedExempt = (salary.exemptAllowancesUs10 || []).reduce((sum, item) => sum + (item?.amount || 0), 0);
      if (calculatedExempt > 0 || (salary.exemptAllowancesUs10 && salary.exemptAllowancesUs10.length > 0)) {
        salary.totalExemptAllowances = calculatedExempt;
      }
    } else {
      salary.totalExemptAllowances = 0;
    }
  }

  // 3. Net Salary = Gross - Exempt
  if (editedPath !== 'salary.netSalary') {
    const calculatedNet = Math.max(0, (salary.grossSalary || 0) - (salary.totalExemptAllowances || 0));
    if (calculatedNet > 0 || salary.grossSalary > 0) {
      salary.netSalary = calculatedNet;
    }
  }

  // 4. Deductions u/s 16
  const standardDeduction = salary.standardDeduction16ia > 0 ? salary.standardDeduction16ia : (regime === 'NEW' ? 50000 : 75000);
  if (editedPath !== 'salary.totalDeductionsUs16') {
    if (regime === 'OLD') {
      const calcDeductions = (salary.standardDeduction16ia || 0) + (salary.entertainmentAllowance16ii || 0) + (salary.professionalTax16iii || 0);
      if (calcDeductions > 0) {
        salary.totalDeductionsUs16 = calcDeductions;
      }
    } else {
      salary.totalDeductionsUs16 = standardDeduction;
    }
  }

  // 5. Income Chargeable under head Salaries
  if (editedPath !== 'salary.incomeChargeableUnderHeadSalaries') {
    const calcChargeableSalary = Math.max(0, (salary.netSalary || 0) - (salary.totalDeductionsUs16 || 0));
    if (calcChargeableSalary > 0 || salary.netSalary > 0) {
      salary.incomeChargeableUnderHeadSalaries = calcChargeableSalary;
    }
  }

  // 6. Other Sources sum
  if (editedPath !== 'otherIncome.totalOtherSources') {
    const calcOtherSources = (otherIncome.otherSources || []).reduce((sum, item) => sum + (item?.amount || 0), 0);
    if (calcOtherSources > 0 || (otherIncome.otherSources && otherIncome.otherSources.length > 0)) {
      otherIncome.totalOtherSources = calcOtherSources;
    }
  }

  // 7. Gross Total Income = Salaries + HP + Other Sources
  if (editedPath !== 'grossTotalIncome') {
    const hpIncome = regime === 'OLD' ? (otherIncome.houseProperty || 0) : Math.max(0, otherIncome.houseProperty || 0);
    const stcg = (next as any).shortTermCapitalGains || 0;
    const ltcg = (next as any).longTermCapitalGains112A || 0;
    const calcGTI = (salary.incomeChargeableUnderHeadSalaries || 0) + hpIncome + (otherIncome.totalOtherSources || 0) + stcg + ltcg;
    if (calcGTI > 0 || salary.incomeChargeableUnderHeadSalaries > 0 || otherIncome.totalOtherSources > 0 || stcg > 0 || ltcg > 0) {
      next.grossTotalIncome = calcGTI;
    }
  }

  // 8. Chapter VI-A Deductions
  if (editedPath !== 'totalChapterVIADeductions') {
    next.totalChapterVIADeductions =
      (next.deductions80C || 0) +
      (next.deductions80CCC || 0) +
      (next.deductions80CCD1 || 0) +
      (next.deductions80CCD1B || 0) +
      (next.deductions80CCD2 || 0) +
      (next.deductions80D || 0) +
      (next.deductions80E || 0) +
      (next.deductions80G || 0) +
      (next.deductions80TTA || 0);
  }

  const activeDeductions = regime === 'OLD' ? next.totalChapterVIADeductions : (next.deductions80CCD2 || 0);

  // 9. Total Income (Taxable Income)
  if (editedPath !== 'totalIncome') {
    const hpIncome = regime === 'OLD' ? (otherIncome.houseProperty || 0) : Math.max(0, otherIncome.houseProperty || 0);
    const normalIncome = (salary.incomeChargeableUnderHeadSalaries || 0) + hpIncome + (otherIncome.totalOtherSources || 0);
    const stcg = (next as any).shortTermCapitalGains || 0;
    const ltcg = (next as any).longTermCapitalGains112A || 0;
    const allowedDeductions = Math.min(activeDeductions, Math.max(0, normalIncome));
    const calcTI = Math.max(0, normalIncome - allowedDeductions) + stcg + ltcg;
    if (calcTI > 0 || next.grossTotalIncome > 0) {
      next.totalIncome = calcTI;
    }
  }

  // 10. Tax Payable
  if (editedPath !== 'taxPayable') {
    const computed = regime === 'NEW' ? calculateNewRegime(next) : calculateOldRegime(next);
    next.taxPayable = computed.totalTaxPayable;
  }

  return next;
}
