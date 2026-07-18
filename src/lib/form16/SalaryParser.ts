import { Form16Data } from '../proto/compatibilityProxy';
import { extractionConfig } from './extractionConfig';
import { ParserUtils } from './ParserUtils';
import { NormalizedIntermediateForm } from './NormalizedIntermediateForm';

/**
 * SalaryParser extracts Part B salary elements, gross components, exempt allowances u/s 10,
 * and standard/professional tax deductions u/s 16 from Form-16 text.
 *
 * This refactored implementation strictly adheres to Uncle Bob's Clean Code principles:
 * - Single Responsibility Principle (SRP): Splits gross salary, exemption, and deduction parsing.
 * - Single Level of Abstraction: Main orchestrator runs highly descriptive private helper methods.
 */
export class SalaryParser {
  /**
   * Orchestrates the parsing of all salary-related fields.
   */
  public static parse(text: string, data: Form16Data): void {
    const config = extractionConfig.salary;
    const grossSalaryBlock = ParserUtils.getScopedBlock(text, config.grossSalaryBlock, 600);

    // Create Intermediate Form representation
    const lines = text.split('\n');
    const form = new NormalizedIntermediateForm([{ pageNumber: 1, items: [], lines }]);

    this.parseGrossSalaryComponentsFuzzy(form, data);
    this.parseGrossSalaryComponents(text, grossSalaryBlock, data);
    this.parseGrossSalaryFallbacks(text, data);
    this.parseExemptAllowances(text, data);
    this.parseSection16DeductionsFuzzy(form, data);
    this.parseSection16Deductions(text, data);
    this.calculateDerivedSalaryFields(data);
  }

  /**
   * Parses Gross Salary components using label-anchored search on intermediate form first.
   */
  private static parseGrossSalaryComponentsFuzzy(form: NormalizedIntermediateForm, data: Form16Data): void {
    // 17(1) Salary
    const s17_1 = form.findNumberNearLabel('section 17(1)') ||
                  form.findNumberNearLabel('provisions contained in section 17(1)') ||
                  form.findNumberNearLabel('provisions contained in sec 17(1)');
    if (s17_1 !== null && s17_1 > 0) {
      data.salary.salaryAsPer17_1 = s17_1;
    }

    // 17(2) Perquisites
    const s17_2 = form.findNumberNearLabel('section 17(2)') ||
                  form.findNumberNearLabel('Value of perquisites under section 17(2)') ||
                  form.findNumberNearLabel('Value of perquisites under sec 17(2)');
    if (s17_2 !== null && s17_2 > 0) {
      data.salary.perquisites17_2 = s17_2;
    }

    // 17(3) Profits in lieu
    const s17_3 = form.findNumberNearLabel('section 17(3)') ||
                  form.findNumberNearLabel('Profits in lieu of salary under section 17(3)') ||
                  form.findNumberNearLabel('Profits in lieu of salary under sec 17(3)');
    if (s17_3 !== null && s17_3 > 0) {
      data.salary.profitsInLieu17_3 = s17_3;
    }

    // Total gross salary
    const gross = form.findNumberNearLabel('Gross Salary') ||
                  form.findNumberNearLabel('Total Gross Salary');
    if (gross !== null && gross > 0) {
      data.salary.grossSalary = gross;
    }
  }

  /**
   * Parses Gross Salary components from the isolated Gross Salary block context (original exact regex logic).
   */
  private static parseGrossSalaryComponents(text: string, grossSalaryBlock: string, data: Form16Data): void {
    const config = extractionConfig.salary;
    if (!grossSalaryBlock) return;

    // (a) Section 17(1)
    if (data.salary.salaryAsPer17_1 === 0) {
      const aMatch = ParserUtils.extractAmount(grossSalaryBlock, config.salaryAsPer17_1);
      if (aMatch > 0) data.salary.salaryAsPer17_1 = aMatch;
    }

    // (b) Section 17(2)
    if (data.salary.perquisites17_2 === 0) {
      const bMatch = ParserUtils.extractAmount(grossSalaryBlock, config.perquisites17_2);
      if (bMatch > 0) data.salary.perquisites17_2 = bMatch;
    }

    // (c) Section 17(3)
    if (data.salary.profitsInLieu17_3 === 0) {
      const cMatch = ParserUtils.extractAmount(grossSalaryBlock, config.profitsInLieu17_3);
      if (cMatch > 0) data.salary.profitsInLieu17_3 = cMatch;
    }

    // (d) Total / Gross Salary
    if (data.salary.grossSalary === 0) {
      const dMatch = ParserUtils.extractAmount(grossSalaryBlock, config.grossSalary);
      if (dMatch > 0) data.salary.grossSalary = dMatch;
    }
  }

  /**
   * Applies global/fallback regex matches for gross components when block scoping was bypassed.
   */
  private static parseGrossSalaryFallbacks(text: string, data: Form16Data): void {
    const config = extractionConfig.salary;

    if (data.salary.salaryAsPer17_1 === 0) {
      data.salary.salaryAsPer17_1 = ParserUtils.extractAmount(text, config.salaryAsPer17_1);
    }
    if (data.salary.perquisites17_2 === 0) {
      data.salary.perquisites17_2 = ParserUtils.extractAmount(text, config.perquisites17_2);
    }
    if (data.salary.profitsInLieu17_3 === 0) {
      data.salary.profitsInLieu17_3 = ParserUtils.extractAmount(text, config.profitsInLieu17_3);
    }
    if (data.salary.grossSalary === 0) {
      data.salary.grossSalary = ParserUtils.extractAmount(text, config.grossSalary);
    }

    // Mathematical consistency check for gross salary total
    const calculatedGross = data.salary.salaryAsPer17_1 + data.salary.perquisites17_2 + data.salary.profitsInLieu17_3;
    if (data.salary.grossSalary === 0) {
      data.salary.grossSalary = calculatedGross;
    }
  }

  /**
   * Scans and parses Section 10 exempt allowances lists.
   */
  private static parseExemptAllowances(text: string, data: Form16Data): void {
    const config = extractionConfig.salary;
    const regexSource = `${config.exemptAllowancesBlock.start.source}(.*?)${config.exemptAllowancesBlock.end.source}`;
    const exemptSectionMatch = text.match(new RegExp(regexSource, 'is'));

    if (exemptSectionMatch) {
      const sectionContent = exemptSectionMatch[1];
      const lines = sectionContent.split(/[\r\n]+/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (/total/i.test(trimmed) || /less:/i.test(trimmed) || /allowances\s+to\s+the\s+extent/i.test(trimmed)) {
          continue;
        }

        const numbers = ParserUtils.extractNumbersFromLine(trimmed);
        if (numbers.length === 0) continue;

        const amount = numbers[numbers.length - 1];
        const nature = this.extractExemptAllowanceNature(trimmed);
        const code = this.extractExemptAllowanceCode(trimmed);

        if (amount > 0 && nature) {
          // Prevent duplicates
          const exists = data.salary.exemptAllowancesUs10.some(item => item.nature === nature && item.amount === amount);
          if (!exists) {
            data.salary.exemptAllowancesUs10.push({ code, nature, amount });
          }
        }
      }
    }

    data.salary.totalExemptAllowances = ParserUtils.extractAmount(text, config.totalExemptAllowances);
    if (data.salary.totalExemptAllowances === 0) {
      data.salary.totalExemptAllowances = data.salary.exemptAllowancesUs10.reduce((sum, item) => sum + item.amount, 0);
    }
  }

  /**
   * Helper to identify and extract the description/nature of the allowance.
   */
  private static extractExemptAllowanceNature(trimmed: string): string {
    const numMatch = trimmed.match(/-?\s*\d+(?:,\s*\d+)*\.\d{2}/) || trimmed.match(/\b\d+\b/);
    let nature = trimmed;

    if (numMatch && numMatch.index !== undefined) {
      nature = trimmed.substring(0, numMatch.index).trim();
    }

    nature = nature.replace(/[\s\.\-:,]+$/g, '').trim();
    nature = nature.replace(/^\s*\([a-z]\)\s*/i, '').trim();

    const code = this.extractExemptAllowanceCode(trimmed);
    if (nature.toLowerCase() === 'exempt allowance' && code && !nature.includes(code)) {
      nature = `Exempt Allowance ${code}`;
    }

    return nature;
  }

  /**
   * Helper to identify Section 10 subcode (e.g. 10(13A), 10(14)).
   */
  private static extractExemptAllowanceCode(trimmed: string): string {
    const codeMatch = trimmed.match(/10\([0-9a-zA-Z()]+\)/i) || trimmed.match(/10\b/i);
    return codeMatch ? codeMatch[0] : '10';
  }

  /**
   * Parses Section 16 deductions using label-anchored search on intermediate form first.
   */
  private static parseSection16DeductionsFuzzy(form: NormalizedIntermediateForm, data: Form16Data): void {
    const std = form.findNumberNearLabel('Standard deduction under section 16') ||
                form.findNumberNearLabel('Standard deduction');
    if (std !== null && std > 0) {
      data.salary.standardDeduction16ia = std;
    }

    const ent = form.findNumberNearLabel('Entertainment allowance');
    if (ent !== null && ent > 0) {
      data.salary.entertainmentAllowance16ii = ent;
    }

    const prof = form.findNumberNearLabel('Tax on employment under section 16') ||
                 form.findNumberNearLabel('Tax on employment') ||
                 form.findNumberNearLabel('Professional tax');
    if (prof !== null && prof > 0) {
      data.salary.professionalTax16iii = prof;
    }
  }

  /**
   * Extracts Section 16 deductions like standard deduction, professional tax, etc. (original exact regex logic).
   */
  private static parseSection16Deductions(text: string, data: Form16Data): void {
    const config = extractionConfig.salary;

    if (data.salary.standardDeduction16ia === 0) {
      data.salary.standardDeduction16ia = ParserUtils.extractAmount(text, config.standardDeduction16ia);
    }
    if (data.salary.entertainmentAllowance16ii === 0) {
      data.salary.entertainmentAllowance16ii = ParserUtils.extractAmount(text, config.entertainmentAllowance16ii);
    }
    if (data.salary.professionalTax16iii === 0) {
      data.salary.professionalTax16iii = ParserUtils.extractAmount(text, config.professionalTax16iii);
    }

    data.salary.totalDeductionsUs16 =
      data.salary.standardDeduction16ia +
      data.salary.entertainmentAllowance16ii +
      data.salary.professionalTax16iii;
  }

  /**
   * Performs arithmetic calculations to keep net salary and chargeable salary in sync.
   */
  private static calculateDerivedSalaryFields(data: Form16Data): void {
    data.salary.netSalary = data.salary.grossSalary - data.salary.totalExemptAllowances;
    data.salary.incomeChargeableUnderHeadSalaries = data.salary.netSalary - data.salary.totalDeductionsUs16;
  }
}
