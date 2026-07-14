import { Form16Data } from '../types';

export class SalaryParser {
  private static extractAmount(text: string, regex: RegExp): number {
    const match = text.match(regex);
    if (match) {
      for (let i = match.length - 1; i > 0; i--) {
        if (match[i] !== undefined) {
          const cleaned = match[i].replace(/[\s,]/g, '');
          return parseFloat(cleaned) || 0;
        }
      }
    }
    return 0;
  }

  public static parse(text: string, data: Form16Data): void {
    // 1. Try to extract from Gross Salary Block (Strategy 2)
    let grossSalaryBlock = '';
    const gsIndex = text.search(/1\.\s*Gross\s*Salary/i);
    if (gsIndex !== -1) {
      grossSalaryBlock = text.substring(gsIndex, gsIndex + 600);
    } else {
      const gsIndexFallback = text.search(/Gross\s*Salary/i);
      if (gsIndexFallback !== -1) {
        grossSalaryBlock = text.substring(gsIndexFallback, gsIndexFallback + 600);
      }
    }

    if (grossSalaryBlock) {
      // (a) Section 17(1)
      const aMatch = this.extractAmount(grossSalaryBlock, /\(a\)\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i);
      if (aMatch > 0) data.salary.salaryAsPer17_1 = aMatch;

      // (b) Section 17(2)
      const bMatch = this.extractAmount(grossSalaryBlock, /\(b\)\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i);
      if (bMatch > 0) data.salary.perquisites17_2 = bMatch;

      // (c) Section 17(3)
      const cMatch = this.extractAmount(grossSalaryBlock, /\(c\)\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i);
      if (cMatch > 0) data.salary.profitsInLieu17_3 = cMatch;

      // (d) Total / Gross Salary
      const dMatch = this.extractAmount(grossSalaryBlock, /\(d\)\s*(?:Total)?\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i);
      if (dMatch > 0) data.salary.grossSalary = dMatch;
    }

    // 2. Fallbacks / Direct extraction (Strategy 1)
    if (data.salary.salaryAsPer17_1 === 0) {
      data.salary.salaryAsPer17_1 = this.extractAmount(text, /salary\s+as\s+per\s+(?:provisions\s+contained\s+in\s+)?section\s+17\(1\)\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i);
    }
    if (data.salary.salaryAsPer17_1 === 0) {
      data.salary.salaryAsPer17_1 = this.extractAmount(text, /17\(1\)\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i);
    }

    if (data.salary.perquisites17_2 === 0) {
      data.salary.perquisites17_2 = this.extractAmount(text, /perquisites\s+(?:u\/s|under\s+section)?\s*17\(2\)\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i);
    }
    if (data.salary.perquisites17_2 === 0) {
      data.salary.perquisites17_2 = this.extractAmount(text, /17\(2\)\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i);
    }
    // Form 12BA fallback for perquisites u/s 17(2)
    if (data.salary.perquisites17_2 === 0) {
      data.salary.perquisites17_2 = this.extractAmount(text, /Total\s+value\s+of\s+perquisites\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i);
    }

    if (data.salary.profitsInLieu17_3 === 0) {
      data.salary.profitsInLieu17_3 = this.extractAmount(text, /profits?\s+in\s+lieu\s+of\s+salary\s+(?:u\/s|under\s+section)?\s*17\(3\)\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i);
    }
    if (data.salary.profitsInLieu17_3 === 0) {
      data.salary.profitsInLieu17_3 = this.extractAmount(text, /17\(3\)\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i);
    }

    // Gross Salary Fallback
    if (data.salary.grossSalary === 0) {
      data.salary.grossSalary = this.extractAmount(text, /Total\s+Gross\s+Salary\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i);
    }
    if (data.salary.grossSalary === 0) {
      data.salary.grossSalary = this.extractAmount(text, /(?:^|[^l])\s+Gross\s+Salary\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i);
    }

    // Math consistency fallback
    const calculatedGross = data.salary.salaryAsPer17_1 + data.salary.perquisites17_2 + data.salary.profitsInLieu17_3;
    if (data.salary.grossSalary === 0) {
      data.salary.grossSalary = calculatedGross;
    }

    // 3. Exempt Allowances u/s 10
    const exemptSectionMatch = text.match(/Allowances to the extent exempt u\/s 10(.*?)Total Exempt Allowances/is);
    if (exemptSectionMatch) {
      const sectionContent = exemptSectionMatch[1];
      const allowanceRegex = /Exempt\s+Allowance\s+([0-9a-zA-Z()]+)\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/gi;
      let match;
      while ((match = allowanceRegex.exec(sectionContent)) !== null) {
        data.salary.exemptAllowancesUs10.push({
          code: match[1],
          amount: parseFloat(match[2].replace(/[\s,]/g, '')) || 0
        });
      }
    }

    data.salary.totalExemptAllowances = this.extractAmount(text, /Total\s+Exempt\s+Allowances\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i);
    if (data.salary.totalExemptAllowances === 0) {
      data.salary.totalExemptAllowances = data.salary.exemptAllowancesUs10.reduce((sum, item) => sum + item.amount, 0);
    }

    // 4. Deductions u/s 16
    data.salary.standardDeduction16ia = this.extractAmount(text, /Standard\s+deduction\s+(?:u\/s|under\s+section)\s+16\(ia\)(?:[^\d-]*)(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i);
    if (data.salary.standardDeduction16ia === 0) {
      data.salary.standardDeduction16ia = this.extractAmount(text, /Standard\s+deduction\s+u\/s\s+16\(ia\)\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i);
    }

    data.salary.entertainmentAllowance16ii = this.extractAmount(text, /Entertainment\s+allowance\s+(?:u\/s|under\s+section)\s+16\(ii\)(?:[^\d-]*)(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i);
    if (data.salary.entertainmentAllowance16ii === 0) {
      data.salary.entertainmentAllowance16ii = this.extractAmount(text, /Entertainment\s+allowance\s+u\/s\s+16\(ii\)\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i);
    }

    data.salary.professionalTax16iii = this.extractAmount(text, /(?:Tax\s+on\s+employment|Professional\s+Tax)\s+(?:u\/s|under\s+section)?\s*16\(iii\)(?:[^\d-]*)(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i);
    if (data.salary.professionalTax16iii === 0) {
      data.salary.professionalTax16iii = this.extractAmount(text, /(?:Tax\s+on\s+employment|Professional\s+Tax)\s+u\/s\s+16\(iii\)\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i);
    }

    data.salary.totalDeductionsUs16 = data.salary.standardDeduction16ia + data.salary.entertainmentAllowance16ii + data.salary.professionalTax16iii;

    // 5. Calculations
    data.salary.netSalary = data.salary.grossSalary - data.salary.totalExemptAllowances;
    data.salary.incomeChargeableUnderHeadSalaries = data.salary.netSalary - data.salary.totalDeductionsUs16;
  }
}
