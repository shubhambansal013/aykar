import { Form16Data } from '../types';
import { extractionConfig } from './extractionConfig';
import { ParserUtils } from './ParserUtils';

export class SalaryParser {
  public static parse(text: string, data: Form16Data): void {
    const config = extractionConfig.salary;

    // 1. Try to extract from Gross Salary Block
    const grossSalaryBlock = ParserUtils.getScopedBlock(text, config.grossSalaryBlock, 600);

    if (grossSalaryBlock) {
      // (a) Section 17(1)
      const aMatch = ParserUtils.extractAmount(grossSalaryBlock, config.salaryAsPer17_1);
      if (aMatch > 0) data.salary.salaryAsPer17_1 = aMatch;

      // (b) Section 17(2)
      const bMatch = ParserUtils.extractAmount(grossSalaryBlock, config.perquisites17_2);
      if (bMatch > 0) data.salary.perquisites17_2 = bMatch;

      // (c) Section 17(3)
      const cMatch = ParserUtils.extractAmount(grossSalaryBlock, config.profitsInLieu17_3);
      if (cMatch > 0) data.salary.profitsInLieu17_3 = cMatch;

      // (d) Total / Gross Salary
      const dMatch = ParserUtils.extractAmount(grossSalaryBlock, config.grossSalary);
      if (dMatch > 0) data.salary.grossSalary = dMatch;
    }

    // 2. Fallbacks / Direct extraction
    if (data.salary.salaryAsPer17_1 === 0) {
      data.salary.salaryAsPer17_1 = ParserUtils.extractAmount(text, config.salaryAsPer17_1);
    }
    if (data.salary.perquisites17_2 === 0) {
      data.salary.perquisites17_2 = ParserUtils.extractAmount(text, config.perquisites17_2);
    }
    if (data.salary.profitsInLieu17_3 === 0) {
      data.salary.profitsInLieu17_3 = ParserUtils.extractAmount(text, config.profitsInLieu17_3);
    }

    // Gross Salary Fallback
    if (data.salary.grossSalary === 0) {
      data.salary.grossSalary = ParserUtils.extractAmount(text, config.grossSalary);
    }

    // Math consistency fallback
    const calculatedGross = data.salary.salaryAsPer17_1 + data.salary.perquisites17_2 + data.salary.profitsInLieu17_3;
    if (data.salary.grossSalary === 0) {
      data.salary.grossSalary = calculatedGross;
    }

    // 3. Exempt Allowances u/s 10
    const exemptSectionMatch = text.match(new RegExp(`${config.exemptAllowancesBlock.start.source}(.*?)${config.exemptAllowancesBlock.end.source}`, 'is'));
    if (exemptSectionMatch) {
      const sectionContent = exemptSectionMatch[1];
      const lines = sectionContent.split(/[\r\n]+/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (/total/i.test(trimmed) || /less:/i.test(trimmed) || /allowances\s+to\s+the\s+extent/i.test(trimmed)) {
          continue;
        }

        // Extract numbers from the line
        const numbers = ParserUtils.extractNumbersFromLine(trimmed);
        if (numbers.length === 0) continue;

        // The amount is the last number
        const amount = numbers[numbers.length - 1];

        // Find the description/nature of the allowance
        // It is the text on the line before the first number
        const numMatch = trimmed.match(/-?\s*\d+(?:,\s*\d+)*\.\d{2}/) || trimmed.match(/\b\d+\b/);
        let nature = trimmed;
        if (numMatch && numMatch.index !== undefined) {
          nature = trimmed.substring(0, numMatch.index).trim();
        }
        // Clean nature of trailing dots, dashes, spaces, commas
        nature = nature.replace(/[\s\.\-:,]+$/g, '').trim();

        // If nature is empty, skip
        if (!nature) continue;

        // Find code u/s 10 (e.g. 10(13A) or 10(14) etc.)
        const codeMatch = trimmed.match(/10\([0-9a-zA-Z()]+\)/i) || trimmed.match(/10\b/i);
        let code = '';
        if (codeMatch) {
          code = codeMatch[0];
        } else {
          code = '10';
        }

        // To support old literal "Exempt Allowance <codeMatch>" vs full description "House rent allowance under section 10(13A)"
        // If nature starts with "Exempt Allowance" and has code, let's keep it as is
        // Otherwise, if the text has "House rent allowance under section 10(13A)", use that exactly!
        data.salary.exemptAllowancesUs10.push({
          code,
          nature,
          amount
        });
      }
    }

    data.salary.totalExemptAllowances = ParserUtils.extractAmount(text, config.totalExemptAllowances);
    if (data.salary.totalExemptAllowances === 0) {
      data.salary.totalExemptAllowances = data.salary.exemptAllowancesUs10.reduce((sum, item) => sum + item.amount, 0);
    }

    // 4. Deductions u/s 16
    data.salary.standardDeduction16ia = ParserUtils.extractAmount(text, config.standardDeduction16ia);
    data.salary.entertainmentAllowance16ii = ParserUtils.extractAmount(text, config.entertainmentAllowance16ii);
    data.salary.professionalTax16iii = ParserUtils.extractAmount(text, config.professionalTax16iii);

    data.salary.totalDeductionsUs16 = data.salary.standardDeduction16ia + data.salary.entertainmentAllowance16ii + data.salary.professionalTax16iii;

    // 5. Calculations
    data.salary.netSalary = data.salary.grossSalary - data.salary.totalExemptAllowances;
    data.salary.incomeChargeableUnderHeadSalaries = data.salary.netSalary - data.salary.totalDeductionsUs16;
  }
}
