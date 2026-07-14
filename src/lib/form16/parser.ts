import { Form16Data } from '../types';

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

  // Helper to extract numeric values
  const extractAmount = (regex: RegExp): number => {
    const match = text.match(regex);
    if (match) {
      // Find the last capture group that has a value
      for (let i = match.length - 1; i > 0; i--) {
        if (match[i] !== undefined) {
          return parseFloat(match[i].replace(/,/g, '')) || 0;
        }
      }
    }
    return 0;
  };

  // 1. Basic Info Extraction
  // PAN/TAN
  const employeePanMatch = text.match(/PAN OF THE EMPLOYEE\s+([A-Z]{5}[0-9]{4}[A-Z])/i);
  if (employeePanMatch) data.employee.pan = employeePanMatch[1].toUpperCase();

  const employerTanMatch = text.match(/TAN OF THE DEDUCTOR\s+([A-Z]{4}[0-9]{5}[A-Z])/i);
  if (employerTanMatch) data.employer.tan = employerTanMatch[1].toUpperCase();

  const employerPanMatch = text.match(/PAN OF THE DEDUCTOR\s+([A-Z]{5}[0-9]{4}[A-Z])/i);
  if (employerPanMatch) data.employer.pan = employerPanMatch[1].toUpperCase();

  // Assessment Year
  const ayMatch = text.match(/Assessment Year\s+(\d{4}-\d{2,4})/i);
  if (ayMatch) data.assessmentYear = ayMatch[1].split('-')[0];

  // Employer Name and Address
  const employerMatch = text.match(/Name and address of the Employer:?\s*(.*?)(?=\s*Name and address of the Employee:|$)/is);
  if (employerMatch) {
    const employerLines = employerMatch[1].split(/[\n,]+/).map(l => l.trim()).filter(l => l.length > 0);
    if (employerLines.length > 0) {
      data.employer.name = employerLines[0];
      data.employer.address = employerLines.slice(1).join(', ').trim();
    }
  }

  // Employee Name and Address
  const employeeMatch = text.match(/Name and address of the Employee:?\s*(.*?)(?=\s*(?:PAN OF THE|TAN OF THE|Assessment Year|Period with|$))/is);
  if (employeeMatch) {
    const employeeLines = employeeMatch[1].split(/[\n,]+/).map(l => l.trim()).filter(l => l.length > 0);
    if (employeeLines.length > 0) {
      const fullDisplayName = employeeLines[0];
      const nameParts = fullDisplayName.split(/\s+/);
      if (nameParts.length === 1) {
        data.employee.name.lastName = nameParts[0];
      } else if (nameParts.length === 2) {
        data.employee.name.firstName = nameParts[0];
        data.employee.name.lastName = nameParts[1];
      } else {
        data.employee.name.firstName = nameParts[0];
        data.employee.name.middleName = nameParts.slice(1, -1).join(' ');
        data.employee.name.lastName = nameParts[nameParts.length - 1];
      }
      data.employee.address = employeeLines.slice(1).join(', ').trim();
    }
  }

  // Robust PAN extraction fallback
  if (!data.employee.pan) {
    const allPansMatch = text.match(/[A-Z]{5}[0-9]{4}[A-Z]/gi);
    if (allPansMatch) {
      for (const p of allPansMatch) {
        const foundPan = p.toUpperCase();
        if (foundPan !== data.employer.pan && foundPan !== data.employer.tan) {
          data.employee.pan = foundPan;
          break;
        }
      }
    }
  }

  // Period
  const periodMatch = text.match(/Period with the employer:\s*From\s+([^\s]+)\s+To\s+([^\s]+)/i);
  if (periodMatch) {
    data.period.from = periodMatch[1];
    data.period.to = periodMatch[2];
  }

  // 2. Salary Components
  data.salary.salaryAsPer17_1 = extractAmount(/Salary as per section 17\(1\)\s+([\d,.-]+\.\d{2})/i);
  data.salary.perquisites17_2 = extractAmount(/Value of perquisites u\/s 17\(2\)\s+([\d,.-]+\.\d{2})/i);
  data.salary.profitsInLieu17_3 = extractAmount(/Pro[fip]its in lieu of salary u\/s 17\(3\)\s+([\d,.-]+\.\d{2})/i);

  data.salary.grossSalary = extractAmount(/Total Gross Salary\s+([\d,.-]+\.\d{2})/i);
  if (data.salary.grossSalary === 0) {
    // Look for "Gross Salary" NOT preceded by "Total"
    const gsMatch = text.match(/(?:^|[^l])\s+Gross Salary\s+([\d,.-]+\.\d{2})/i);
    if (gsMatch) {
      data.salary.grossSalary = parseFloat(gsMatch[1].replace(/,/g, '')) || 0;
    }
  }
  if (data.salary.grossSalary === 0) {
    data.salary.grossSalary = data.salary.salaryAsPer17_1 + data.salary.perquisites17_2 + data.salary.profitsInLieu17_3;
  }

  // 3. Exempt Allowances u/s 10
  const exemptSectionMatch = text.match(/Allowances to the extent exempt u\/s 10(.*?)Total Exempt Allowances/is);
  if (exemptSectionMatch) {
    const sectionContent = exemptSectionMatch[1];
    const allowanceRegex = /Exempt Allowance\s+([0-9a-zA-Z()]+)\s+([\d,.-]+\.\d{2})/gi;
    let match;
    while ((match = allowanceRegex.exec(sectionContent)) !== null) {
      data.salary.exemptAllowancesUs10.push({
        code: match[1],
        amount: parseFloat(match[2].replace(/,/g, '')) || 0
      });
    }
  }
  data.salary.totalExemptAllowances = extractAmount(/Total Exempt Allowances\s+([\d,.-]+\.\d{2})/i);
  if (data.salary.totalExemptAllowances === 0) {
    data.salary.totalExemptAllowances = data.salary.exemptAllowancesUs10.reduce((sum, item) => sum + item.amount, 0);
  }

  // 4. Deductions u/s 16
  data.salary.standardDeduction16ia = extractAmount(/Standard deduction u\/s 16\(ia\)\s+([\d,.-]+\.\d{2})/i);
  data.salary.entertainmentAllowance16ii = extractAmount(/Entertainment allowance u\/s 16\(ii\)\s+([\d,.-]+\.\d{2})/i);
  data.salary.professionalTax16iii = extractAmount(/(?:Tax on employment|Professional Tax) u\/s 16\(iii\)\s+([\d,.-]+\.\d{2})/i);
  data.salary.totalDeductionsUs16 = data.salary.standardDeduction16ia + data.salary.entertainmentAllowance16ii + data.salary.professionalTax16iii;

  // 5. Other Income
  data.otherIncome.houseProperty = extractAmount(/Income from house property\s+([\d,.-]+\.\d{2})/i);
  data.otherIncome.totalOtherSources = extractAmount(/Income from other sources\s+([\d,.-]+\.\d{2})/i);
  if (data.otherIncome.totalOtherSources !== 0) {
    data.otherIncome.otherSources.push({
      nature: 'Other Sources',
      amount: data.otherIncome.totalOtherSources
    });
  }

  // 6. Chapter VI-A Deductions
  data.deductions80C = extractAmount(/80C\s+([\d,.-]+\.\d{2})/i);
  data.deductions80CCC = extractAmount(/80CCC\s+([\d,.-]+\.\d{2})/i);
  data.deductions80CCD1 = extractAmount(/80CCD\(1\)\s+([\d,.-]+\.\d{2})/i);
  data.deductions80CCD1B = extractAmount(/80CCD\(1B\)\s+([\d,.-]+\.\d{2})/i);
  data.deductions80CCD2 = extractAmount(/80CCD\(2\)\s+([\d,.-]+\.\d{2})/i);
  data.deductions80D = extractAmount(/80D\s+([\d,.-]+\.\d{2})/i);
  data.deductions80E = extractAmount(/80E\s+([\d,.-]+\.\d{2})/i);
  data.deductions80G = extractAmount(/80G\s+([\d,.-]+\.\d{2})/i);
  data.deductions80TTA = extractAmount(/80TTA\s+([\d,.-]+\.\d{2})/i);

  // 7. Calculations
  data.salary.netSalary = data.salary.grossSalary - data.salary.totalExemptAllowances;
  data.salary.incomeChargeableUnderHeadSalaries = data.salary.netSalary - data.salary.totalDeductionsUs16;

  data.grossTotalIncome = extractAmount(/Gross Total Income\s+([\d,.-]+\.\d{2})/i);
  if (data.grossTotalIncome === 0) {
      data.grossTotalIncome = data.salary.incomeChargeableUnderHeadSalaries + data.otherIncome.houseProperty + data.otherIncome.totalOtherSources;
  }

  data.totalChapterVIADeductions = extractAmount(/Total Chapter VI-A Deductions\s+([\d,.-]+\.\d{2})/i);
  if (data.totalChapterVIADeductions === 0) {
    data.totalChapterVIADeductions =
      data.deductions80C + data.deductions80CCC + data.deductions80CCD1 +
      data.deductions80CCD1B + data.deductions80CCD2 + data.deductions80D +
      data.deductions80E + data.deductions80G + data.deductions80TTA;
  }

  data.totalIncome = extractAmount(/(?:^|[^s])\s+Total Income\s+([\d,.-]+\.\d{2})/i);
  if (data.totalIncome === 0) {
    data.totalIncome = data.grossTotalIncome - data.totalChapterVIADeductions;
  }

  data.taxPayable = extractAmount(/Tax Payable\s+([\d,.-]+\.\d{2})/i);

  return data;
}
