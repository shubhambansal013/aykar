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
  // Extended fields for step-by-step breakdown rendering in the UI
  slabTaxBreakdown?: Array<{ range: string; rate: number; taxableAmount: number; tax: number }>;
  specialTaxBreakdown?: Array<{ name: string; rate: number; income: number; tax: number }>;
  marginalRelief87A?: number;
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

export interface SlabTaxDetail {
  range: string;
  rate: number;
  taxableAmount: number;
  tax: number;
}

// Slabs defined under Budget 2025 (FY 2025-26) / Budget 2026
const NEW_REGIME_SLABS = [
  { limit: 400000, rate: 0.0, label: 'Up to ₹4,00,000' },
  { limit: 800000, rate: 0.05, label: '₹4,00,001 to ₹8,00,000' },
  { limit: 1200000, rate: 0.10, label: '₹8,00,001 to ₹12,00,000' },
  { limit: 1600000, rate: 0.15, label: '₹12,00,001 to ₹16,00,000' },
  { limit: 2000000, rate: 0.20, label: '₹16,00,001 to ₹20,00,000' },
  { limit: 2400000, rate: 0.25, label: '₹20,00,001 to ₹24,00,000' },
  { limit: Infinity, rate: 0.30, label: 'Above ₹24,00,000' },
];

const OLD_REGIME_SLABS = [
  { limit: 250000, rate: 0.0, label: 'Up to ₹2,50,000' },
  { limit: 500000, rate: 0.05, label: '₹2,50,001 to ₹5,00,000' },
  { limit: 1000000, rate: 0.20, label: '₹5,00,001 to ₹10,00,000' },
  { limit: Infinity, rate: 0.30, label: 'Above ₹10,00,000' },
];

export function computeSlabTax(income: number, slabs: typeof NEW_REGIME_SLABS): { totalSlabTax: number; breakdown: SlabTaxDetail[] } {
  let prevLimit = 0;
  let totalSlabTax = 0;
  const breakdown: SlabTaxDetail[] = [];

  for (const slab of slabs) {
    if (income <= prevLimit) {
      break;
    }
    const currentSlabRange = Math.min(income, slab.limit) - prevLimit;
    if (currentSlabRange > 0) {
      const tax = currentSlabRange * slab.rate;
      totalSlabTax += tax;
      breakdown.push({
        range: slab.label,
        rate: slab.rate * 100,
        taxableAmount: currentSlabRange,
        tax: tax,
      });
    }
    prevLimit = slab.limit;
  }

  return { totalSlabTax, breakdown };
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

  // Slab calculation using robust helper
  const { totalSlabTax, breakdown: slabTaxBreakdown } = computeSlabTax(slabTaxableIncome, OLD_REGIME_SLABS);
  let taxBeforeRebate = totalSlabTax;

  // Add special rate taxes
  const specialTaxBreakdown: Array<{ name: string; rate: number; income: number; tax: number }> = [];

  const stcgTax = stcgAt20 * 0.20;
  taxBeforeRebate += stcgTax;
  if (stcgAt20 > 0) {
    specialTaxBreakdown.push({ name: 'Short Term Capital Gain (Special Rate)', rate: 20, income: stcgAt20, tax: stcgTax });
  }

  const ltcgTax = Math.max(0, ltcg112a - 125000) * 0.125;
  taxBeforeRebate += ltcgTax;
  if (ltcg112a > 0) {
    specialTaxBreakdown.push({ name: 'Long Term Capital Gain u/s 112A', rate: 12.5, income: ltcg112a, tax: ltcgTax });
  }

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
    slabTaxBreakdown,
    specialTaxBreakdown,
    marginalRelief87A: 0,
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

  // Under New Regime (Budget 2025): Standard Deduction is allowed, usually 75,000
  // Professional tax and entertainment allowances are blocked
  const standardDeduction = salary.standardDeduction16ia > 0 ? salary.standardDeduction16ia : 75000;
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

  // Slab calculation (Budget 2025 / Budget 2026 Slabs)
  const { totalSlabTax, breakdown: slabTaxBreakdown } = computeSlabTax(slabTaxableIncome, NEW_REGIME_SLABS);
  let taxBeforeRebate = totalSlabTax;

  // Add special rate taxes
  const specialTaxBreakdown: Array<{ name: string; rate: number; income: number; tax: number }> = [];

  const stcgTax = stcgAt20 * 0.20;
  taxBeforeRebate += stcgTax;
  if (stcgAt20 > 0) {
    specialTaxBreakdown.push({ name: 'Short Term Capital Gain (Special Rate)', rate: 20, income: stcgAt20, tax: stcgTax });
  }

  const ltcgTax = Math.max(0, ltcg112a - 125000) * 0.125;
  taxBeforeRebate += ltcgTax;
  if (ltcg112a > 0) {
    specialTaxBreakdown.push({ name: 'Long Term Capital Gain u/s 112A', rate: 12.5, income: ltcg112a, tax: ltcgTax });
  }

  // Rebate & Marginal Relief u/s 87A (For New Regime under Budget 2025/2026)
  let rebate87A = 0;
  let marginalRelief87A = 0;

  if (totalIncome <= 1200000) {
    // Standard Rebate up to ₹60,000 (excluding capital gains taxed at special rates)
    const specialTax = ltcgTax + stcgTax;
    rebate87A = Math.min(60000, Math.max(0, taxBeforeRebate - specialTax));
  } else if (totalIncome <= 1275000) {
    // Marginal Relief: The tax payable on normal/slab income cannot exceed the income exceeding ₹12,00,000.
    // Exclude special rate taxes (STCG/LTCG) from the relief logic.
    const slabTax = totalSlabTax;
    const excessIncome = totalIncome - 1200000;
    if (slabTax > excessIncome) {
      marginalRelief87A = slabTax - excessIncome;
      rebate87A = marginalRelief87A;
    }
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
    slabTaxBreakdown,
    specialTaxBreakdown,
    marginalRelief87A,
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

  // 4. Deductions u/s 16 (Budget 2025 rules: NEW standard deduction is 75,000, OLD standard deduction is 50,000)
  const defaultSD = regime === 'NEW' ? 75000 : 50000;
  const standardDeduction = salary.standardDeduction16ia > 0 ? salary.standardDeduction16ia : defaultSD;
  if (editedPath !== 'salary.totalDeductionsUs16') {
    if (regime === 'OLD') {
      const stdDedToUse = salary.standardDeduction16ia > 0 ? salary.standardDeduction16ia : (salary.grossSalary > 0 ? 50000 : 0);
      const calcDeductions = stdDedToUse + (salary.entertainmentAllowance16ii || 0) + (salary.professionalTax16iii || 0);
      salary.totalDeductionsUs16 = calcDeductions;
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
