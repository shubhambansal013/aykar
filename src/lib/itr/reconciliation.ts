import { Form16Data, AISData, TISData, Form26ASData, ReconciledTaxData } from '../types';

export function reconcileAllDocuments(
  form16: Form16Data,
  ais?: AISData,
  tis?: TISData,
  form26as?: Form26ASData
): ReconciledTaxData {
  // Deep clone form16 to avoid mutating inputs
  const reconciled: ReconciledTaxData = JSON.parse(JSON.stringify(form16 || {}));

  // Ensure basic blocks exist
  if (!reconciled.employer) reconciled.employer = { name: '', tan: '', pan: '', address: '' };
  if (!reconciled.employee) reconciled.employee = { name: { firstName: '', middleName: '', lastName: '' }, pan: '', address: '' };
  if (!reconciled.salary) {
    reconciled.salary = {
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
  }
  if (!reconciled.otherIncome) {
    reconciled.otherIncome = { houseProperty: 0, otherSources: [], totalOtherSources: 0 };
  }
  if (!reconciled.otherIncome.otherSources) {
    reconciled.otherIncome.otherSources = [];
  }

  reconciled.aisData = ais;
  reconciled.tisData = tis;
  reconciled.form26asData = form26as;
  reconciled.discrepancies = [];
  reconciled.detectedIncomeSources = [];

  // 1. Gather other income from AIS and TIS
  const aisSavings = ais?.interestSavings || 0;
  const tisSavings = tis?.interestSavings || 0;
  const reconciledSavings = Math.max(aisSavings, tisSavings);

  const aisDeposit = ais?.interestDeposit || 0;
  const tisDeposit = tis?.interestDeposit || 0;
  const reconciledDeposit = Math.max(aisDeposit, tisDeposit);

  const aisDividend = ais?.dividendIncome || 0;
  const tisDividend = tis?.dividendIncome || 0;
  const reconciledDividend = Math.max(aisDividend, tisDividend);

  // Helper to add or update an other source item
  const upsertOtherSource = (nature: string, category: 'interestSavings' | 'interestDeposit' | 'dividendIncome', amount: number, sourceName: string) => {
    if (amount <= 0) return;

    reconciled.detectedIncomeSources!.push({
      source: sourceName,
      category,
      amount,
      confirmed: true,
    });

    const existingIndex = reconciled.otherIncome.otherSources.findIndex(
      (src) =>
        src && src.nature && (
          src.nature.toLowerCase().includes(nature.toLowerCase()) ||
          src.nature.toLowerCase().includes(category.toLowerCase())
        )
    );

    if (existingIndex !== -1) {
      if (reconciled.otherIncome.otherSources[existingIndex].amount < amount) {
        reconciled.otherIncome.otherSources[existingIndex].amount = amount;
      }
    } else {
      reconciled.otherIncome.otherSources.push({
        nature: nature,
        amount: amount,
      });
    }
  };

  if (reconciledSavings > 0) {
    upsertOtherSource('Interest from Savings Bank', 'interestSavings', reconciledSavings, aisSavings >= tisSavings ? 'AIS' : 'TIS');
  }
  if (reconciledDeposit > 0) {
    upsertOtherSource('Interest on Deposits', 'interestDeposit', reconciledDeposit, aisDeposit >= tisDeposit ? 'AIS' : 'TIS');
  }
  if (reconciledDividend > 0) {
    upsertOtherSource('Dividend Income', 'dividendIncome', reconciledDividend, aisDividend >= tisDividend ? 'AIS' : 'TIS');
  }

  // Recalculate other sources sum
  reconciled.otherIncome.totalOtherSources = reconciled.otherIncome.otherSources.reduce((sum, item) => sum + (item?.amount || 0), 0);

  // Recalculate GTI, TI, etc.
  reconciled.grossTotalIncome =
    (reconciled.salary?.incomeChargeableUnderHeadSalaries || 0) +
    (reconciled.otherIncome?.houseProperty || 0) +
    (reconciled.otherIncome?.totalOtherSources || 0);

  reconciled.totalIncome = Math.max(0, reconciled.grossTotalIncome - (reconciled.totalChapterVIADeductions || 0));

  // 2. Process Tax Credits
  const credits = {
    tdsSalary: 0,
    tdsOther: 0,
    tcs: 0,
    advanceTax: 0,
    selfAssessmentTax: 0,
  };

  // Process 26AS/AIS TDS
  if (form26as) {
    credits.tdsSalary = (form26as.tdsSalary || []).reduce((sum, item) => sum + item.amount, 0);
    credits.tdsOther = (form26as.tdsOther || []).reduce((sum, item) => sum + item.amount, 0);
    credits.tcs = (form26as.tcsDetails || []).reduce((sum, item) => sum + item.amount, 0);
    credits.advanceTax = (form26as.advanceTax || []).reduce((sum, item) => sum + item.amount, 0);
    credits.selfAssessmentTax = (form26as.selfAssessmentTax || []).reduce((sum, item) => sum + item.amount, 0);

    // Cross-verify TDS u/s 192 against Form-16
    const employerTan = form16.employer?.tan;
    if (employerTan) {
      const matchingTds26as = (form26as.tdsSalary || []).find(
        (item) => item.tan && item.tan.toUpperCase() === employerTan.toUpperCase()
      );

      const form16Tds = form16.taxPayable || 0;

      if (matchingTds26as) {
        if (Math.abs(matchingTds26as.amount - form16Tds) > 1) {
          reconciled.discrepancies!.push(
            `TDS Discrepancy for TAN ${employerTan}: Employer's declared TDS (Form-16) is ₹${form16Tds.toLocaleString('en-IN')}, but Government's reflected TDS (26AS) u/s 192 is ₹${matchingTds26as.amount.toLocaleString('en-IN')}. There is a difference of ₹${Math.abs(matchingTds26as.amount - form16Tds).toLocaleString('en-IN')}.`
          );
        }
      } else {
        reconciled.discrepancies!.push(
          `TDS Discrepancy: No TDS u/s 192 from Employer's TAN (${employerTan}) found in Form 26AS.`
        );
      }
    }
  } else {
    credits.tdsSalary = form16.taxPayable || 0;
  }

  // Also include AIS TDS if any new ones are found (by matching TAN and section)
  if (ais && ais.tdsDetails) {
    for (const item of ais.tdsDetails) {
      if (item.section === '192') {
        const existsIn26as = form26as?.tdsSalary?.some((x) => x.tan && x.tan.toUpperCase() === item.tan.toUpperCase());
        if (!existsIn26as) {
          credits.tdsSalary += item.amount;
        }
      } else {
        const existsIn26as = form26as?.tdsOther?.some((x) => x.tan && x.tan.toUpperCase() === item.tan.toUpperCase() && x.section === item.section);
        if (!existsIn26as) {
          credits.tdsOther += item.amount;
        }
      }
    }
  }

  reconciled.taxCredits = credits;

  // 3. TIS vs Form-16 Salary cross-check
  if (tis && tis.salaryDerived > 0 && form16.salary?.grossSalary > 0) {
    if (Math.abs(tis.salaryDerived - form16.salary.grossSalary) > 10) {
      reconciled.discrepancies!.push(
        `Income Discrepancy: Gross Salary declared in Form-16 is ₹${form16.salary.grossSalary.toLocaleString('en-IN')}, but TIS shows derived salary of ₹${tis.salaryDerived.toLocaleString('en-IN')}.`
      );
    }
  }

  return reconciled;
}
