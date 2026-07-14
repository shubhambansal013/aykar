import { Form16Data } from '../types';

export class TaxComputationParser {
  private static extractAmount(text: string, regex: RegExp): number {
    const match = text.match(regex);
    if (match) {
      for (let i = match.length - 1; i > 0; i--) {
        if (match[i] !== undefined) {
          return parseFloat(match[i].replace(/,/g, '')) || 0;
        }
      }
    }
    return 0;
  }

  public static parse(text: string, data: Form16Data): void {
    data.grossTotalIncome = this.extractAmount(text, /Gross Total Income\s+([\d,.-]+\.\d{2})/i);
    if (data.grossTotalIncome === 0) {
      data.grossTotalIncome = data.salary.incomeChargeableUnderHeadSalaries + data.otherIncome.houseProperty + data.otherIncome.totalOtherSources;
    }

    data.totalIncome = this.extractAmount(text, /(?:^|[^s])\s+Total Income\s+([\d,.-]+\.\d{2})/i);
    if (data.totalIncome === 0) {
      data.totalIncome = data.grossTotalIncome - data.totalChapterVIADeductions;
    }

    // Net tax payable
    data.taxPayable = this.extractAmount(text, /(?:Net\s+)?tax\s+payable\s+([\d,.-]+\.\d{2})/i);
    if (data.taxPayable === 0) {
      // Look for any alternative mentions
      data.taxPayable = this.extractAmount(text, /Tax Payable\s+([\d,.-]+\.\d{2})/i);
    }
  }
}
