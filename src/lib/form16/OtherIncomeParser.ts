import { Form16Data } from '../types';

export class OtherIncomeParser {
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
    data.otherIncome.houseProperty = this.extractAmount(text, /Income (?:or admissible loss )?from house property\s+([\d,.-]+\.\d{2})/i);
    data.otherIncome.totalOtherSources = this.extractAmount(text, /Income from other sources\s+([\d,.-]+\.\d{2})/i);

    if (data.otherIncome.totalOtherSources !== 0) {
      data.otherIncome.otherSources = [{
        nature: 'Other Sources',
        amount: data.otherIncome.totalOtherSources
      }];
    }
  }
}
