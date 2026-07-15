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
      let match;
      const allowanceRegex = new RegExp(config.exemptAllowancesLines);
      while ((match = allowanceRegex.exec(sectionContent)) !== null) {
        data.salary.exemptAllowancesUs10.push({
          code: match[1],
          amount: ParserUtils.parseNormalizedNumber(match[2])
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
