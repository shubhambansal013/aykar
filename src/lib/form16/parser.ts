import { Form16Data } from '../types';
import { BasicInfoParser } from './BasicInfoParser';
import { SalaryParser } from './SalaryParser';
import { OtherIncomeParser } from './OtherIncomeParser';
import { DeductionsParser } from './DeductionsParser';
import { TaxComputationParser } from './TaxComputationParser';

export function mergeForm16Data(docs: Form16Data[]): Form16Data {
  if (docs.length === 0) {
    return {
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
  }

  if (docs.length === 1) {
    return JSON.parse(JSON.stringify(docs[0]));
  }

  const merged: Form16Data = JSON.parse(JSON.stringify(docs[0]));

  for (let i = 1; i < docs.length; i++) {
    const doc = docs[i];

    // Merge Employer
    const existingNames = merged.employer.name ? merged.employer.name.split(' / ') : [];
    if (doc.employer.name && !existingNames.includes(doc.employer.name)) {
      if (!merged.employer.name) merged.employer.name = doc.employer.name;
      else merged.employer.name += ` / ${doc.employer.name}`;
    }

    const existingTans = merged.employer.tan ? merged.employer.tan.split(' / ') : [];
    if (doc.employer.tan && !existingTans.includes(doc.employer.tan)) {
      if (!merged.employer.tan) merged.employer.tan = doc.employer.tan;
      else merged.employer.tan += ` / ${doc.employer.tan}`;
    }

    const existingPans = merged.employer.pan ? merged.employer.pan.split(' / ') : [];
    if (doc.employer.pan && !existingPans.includes(doc.employer.pan)) {
      if (!merged.employer.pan) merged.employer.pan = doc.employer.pan;
      else merged.employer.pan += ` / ${doc.employer.pan}`;
    }

    if (doc.employer.address) {
      if (!merged.employer.address) {
        merged.employer.address = doc.employer.address;
      } else if (merged.employer.address !== doc.employer.address && !merged.employer.address.includes(doc.employer.address)) {
        merged.employer.address += `; ${doc.employer.address}`;
      }
    }

    // Merge Employee
    if (!merged.employee.pan && doc.employee.pan) {
      merged.employee.pan = doc.employee.pan;
    }
    if (!merged.employee.name.firstName && doc.employee.name.firstName) {
      merged.employee.name.firstName = doc.employee.name.firstName;
    }
    if (!merged.employee.name.middleName && doc.employee.name.middleName) {
      merged.employee.name.middleName = doc.employee.name.middleName;
    }
    if (!merged.employee.name.lastName && doc.employee.name.lastName) {
      merged.employee.name.lastName = doc.employee.name.lastName;
    }
    if (doc.employee.address && (!merged.employee.address || doc.employee.address.length > merged.employee.address.length)) {
      merged.employee.address = doc.employee.address;
    }

    // Merge Assessment Year
    if (!merged.assessmentYear && doc.assessmentYear) {
      merged.assessmentYear = doc.assessmentYear;
    }

    // Merge Period (min of 'from' date, max of 'to' date if valid)
    const parseDate = (dStr: string) => {
      if (!dStr) return null;
      const parsed = Date.parse(dStr);
      if (!isNaN(parsed)) return new Date(parsed);
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const months = { apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11, jan: 0, feb: 1, mar: 2 };
        const m = months[parts[1].toLowerCase() as keyof typeof months];
        const day = parseInt(parts[0], 10);
        const year = parseInt(parts[2], 10);
        if (m !== undefined && !isNaN(day) && !isNaN(year)) {
          return new Date(year, m, day);
        }
      }
      return null;
    };

    const mFrom = parseDate(merged.period.from);
    const dFrom = parseDate(doc.period.from);
    if (dFrom) {
      if (!mFrom || dFrom < mFrom) {
        merged.period.from = doc.period.from;
      }
    } else if (!merged.period.from && doc.period.from) {
      merged.period.from = doc.period.from;
    }

    const mTo = parseDate(merged.period.to);
    const dTo = parseDate(doc.period.to);
    if (dTo) {
      if (!mTo || dTo > mTo) {
        merged.period.to = doc.period.to;
      }
    } else if (!merged.period.to && doc.period.to) {
      merged.period.to = doc.period.to;
    }

    // Merge Salary
    merged.salary.grossSalary += doc.salary.grossSalary || 0;
    merged.salary.salaryAsPer17_1 += doc.salary.salaryAsPer17_1 || 0;
    merged.salary.perquisites17_2 += doc.salary.perquisites17_2 || 0;
    merged.salary.profitsInLieu17_3 += doc.salary.profitsInLieu17_3 || 0;

    // Merge exemptAllowancesUs10
    const combinedExempts = [...(merged.salary.exemptAllowancesUs10 || [])];
    for (const item of (doc.salary.exemptAllowancesUs10 || [])) {
      if (!item) continue;
      const matchedIdx = combinedExempts.findIndex(
        (x) =>
          x &&
          ((x.code && item.code && x.code.toLowerCase() === item.code.toLowerCase()) ||
            (x.nature && item.nature && x.nature.toLowerCase().trim() === item.nature.toLowerCase().trim()))
      );
      if (matchedIdx !== -1) {
        combinedExempts[matchedIdx].amount += item.amount || 0;
      } else {
        combinedExempts.push({ ...item });
      }
    }
    merged.salary.exemptAllowancesUs10 = combinedExempts;
    merged.salary.totalExemptAllowances += doc.salary.totalExemptAllowances || 0;
    merged.salary.netSalary += doc.salary.netSalary || 0;

    merged.salary.standardDeduction16ia = Math.max(merged.salary.standardDeduction16ia || 0, doc.salary.standardDeduction16ia || 0);
    if (merged.salary.standardDeduction16ia > 75000) {
      merged.salary.standardDeduction16ia = 75000;
    }

    merged.salary.entertainmentAllowance16ii += doc.salary.entertainmentAllowance16ii || 0;
    merged.salary.professionalTax16iii += doc.salary.professionalTax16iii || 0;
    merged.salary.totalDeductionsUs16 += doc.salary.totalDeductionsUs16 || 0;
    merged.salary.incomeChargeableUnderHeadSalaries += doc.salary.incomeChargeableUnderHeadSalaries || 0;

    // Merge Other Income
    merged.otherIncome.houseProperty += doc.otherIncome.houseProperty || 0;

    const combinedOtherSources = [...(merged.otherIncome.otherSources || [])];
    for (const item of (doc.otherIncome.otherSources || [])) {
      if (!item) continue;
      const matchedIdx = combinedOtherSources.findIndex(
        (x) => x && x.nature && item.nature && x.nature.toLowerCase().trim() === item.nature.toLowerCase().trim()
      );
      if (matchedIdx !== -1) {
        combinedOtherSources[matchedIdx].amount += item.amount || 0;
      } else {
        combinedOtherSources.push({ ...item });
      }
    }
    merged.otherIncome.otherSources = combinedOtherSources;
    merged.otherIncome.totalOtherSources += doc.otherIncome.totalOtherSources || 0;

    merged.grossTotalIncome += doc.grossTotalIncome || 0;

    // Merge Deductions
    merged.deductions80C += doc.deductions80C || 0;
    merged.deductions80CCC += doc.deductions80CCC || 0;
    merged.deductions80CCD1 += doc.deductions80CCD1 || 0;
    merged.deductions80CCD1B += doc.deductions80CCD1B || 0;
    merged.deductions80CCD2 += doc.deductions80CCD2 || 0;
    merged.deductions80D += doc.deductions80D || 0;
    merged.deductions80E += doc.deductions80E || 0;
    merged.deductions80G += doc.deductions80G || 0;
    merged.deductions80TTA += doc.deductions80TTA || 0;

    merged.totalChapterVIADeductions += doc.totalChapterVIADeductions || 0;
    merged.totalIncome += doc.totalIncome || 0;
    merged.taxPayable += doc.taxPayable || 0;
  }

  const calculatedTotalExempt = merged.salary.exemptAllowancesUs10.reduce((sum, item) => sum + (item?.amount || 0), 0);
  merged.salary.totalExemptAllowances = calculatedTotalExempt;

  const calculatedNet = Math.max(0, merged.salary.grossSalary - merged.salary.totalExemptAllowances);
  merged.salary.netSalary = calculatedNet;

  const calculatedDeductionsUs16 = (merged.salary.standardDeduction16ia || 0) + (merged.salary.entertainmentAllowance16ii || 0) + (merged.salary.professionalTax16iii || 0);
  merged.salary.totalDeductionsUs16 = calculatedDeductionsUs16;

  const calculatedChargeableSalary = Math.max(0, merged.salary.netSalary - merged.salary.totalDeductionsUs16);
  merged.salary.incomeChargeableUnderHeadSalaries = calculatedChargeableSalary;

  const calculatedOtherSources = merged.otherIncome.otherSources.reduce((sum, item) => sum + (item?.amount || 0), 0);
  merged.otherIncome.totalOtherSources = calculatedOtherSources;

  const calculatedGTI = merged.salary.incomeChargeableUnderHeadSalaries + (merged.otherIncome.houseProperty || 0) + merged.otherIncome.totalOtherSources;
  merged.grossTotalIncome = calculatedGTI;

  const calculatedChapterVIA =
    (merged.deductions80C || 0) +
    (merged.deductions80CCC || 0) +
    (merged.deductions80CCD1 || 0) +
    (merged.deductions80CCD1B || 0) +
    (merged.deductions80CCD2 || 0) +
    (merged.deductions80D || 0) +
    (merged.deductions80E || 0) +
    (merged.deductions80G || 0) +
    (merged.deductions80TTA || 0);
  merged.totalChapterVIADeductions = calculatedChapterVIA;

  const calculatedTotalIncome = Math.max(0, merged.grossTotalIncome - merged.totalChapterVIADeductions);
  merged.totalIncome = calculatedTotalIncome;

  return merged;
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
