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
    if (match && match[1]) {
      return parseFloat(match[1].replace(/,/g, '')) || 0;
    }
    return 0;
  };

  // 1. Basic Info
  const panMatch = text.match(/PAN OF THE EMPLOYEE\s+([A-Z]{5}[0-9]{4}[A-Z])/i);
  if (panMatch) data.employee.pan = panMatch[1];

  const tanMatch = text.match(/TAN OF THE DEDUCTOR\s+([A-Z]{4}[0-9]{5}[A-Z])/i);
  if (tanMatch) data.employer.tan = tanMatch[1];

  const ayMatch = text.match(/Assessment Year\s+(\d{4}-\d{2,4})/i);
  if (ayMatch) data.assessmentYear = ayMatch[1].split('-')[0]; // Store only start year for mapping

  // 2. Salary Components
  data.salary.grossSalary = extractAmount(/Gross Salary\s+([\d,]+\.\d{2})/i);
  data.salary.salaryAsPer17_1 = extractAmount(/Salary as per section 17\(1\)\s+([\d,]+\.\d{2})/i);
  data.salary.perquisites17_2 = extractAmount(/Value of perquisites u\/s 17\(2\)\s+([\d,]+\.\d{2})/i);
  data.salary.profitsInLieu17_3 = extractAmount(/Profits in lieu of salary u\/s 17\(3\)\s+([\d,]+\.\d{2})/i);

  // 3. Deductions u/s 16
  data.salary.standardDeduction16ia = extractAmount(/Standard deduction u\/s 16\(ia\)\s+([\d,]+\.\d{2})/i);
  data.salary.entertainmentAllowance16ii = extractAmount(/Entertainment allowance u\/s 16\(ii\)\s+([\d,]+\.\d{2})/i);
  data.salary.professionalTax16iii = extractAmount(/Tax on employment u\/s 16\(iii\)\s+([\d,]+\.\d{2})/i);
  data.salary.totalDeductionsUs16 = data.salary.standardDeduction16ia + data.salary.entertainmentAllowance16ii + data.salary.professionalTax16iii;

  // 4. Chapter VI-A Deductions
  data.deductions80C = extractAmount(/80C\s+([\d,]+\.\d{2})/i);
  data.deductions80D = extractAmount(/80D\s+([\d,]+\.\d{2})/i);
  data.deductions80TTA = extractAmount(/80TTA\s+([\d,]+\.\d{2})/i);

  // Totals
  data.salary.netSalary = data.salary.grossSalary - data.salary.totalExemptAllowances;
  data.salary.incomeChargeableUnderHeadSalaries = data.salary.netSalary - data.salary.totalDeductionsUs16;
  data.grossTotalIncome = data.salary.incomeChargeableUnderHeadSalaries + data.otherIncome.totalOtherSources;

  // Chapter VIA total (Simplified for now)
  data.totalChapterVIADeductions = data.deductions80C + data.deductions80D + data.deductions80TTA;
  data.totalIncome = data.grossTotalIncome - data.totalChapterVIADeductions;

  return data;
}
