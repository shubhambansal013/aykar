import { Form16Data } from '../types';

export class DeductionsParser {
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
    data.deductions80C = this.extractAmount(text, /80C\s+([\d,.-]+\.\d{2})/i);
    data.deductions80CCC = this.extractAmount(text, /80CCC\s+([\d,.-]+\.\d{2})/i);
    data.deductions80CCD1 = this.extractAmount(text, /80CCD\(1\)\s+([\d,.-]+\.\d{2})/i);
    data.deductions80CCD1B = this.extractAmount(text, /80CCD\(1B\)\s+([\d,.-]+\.\d{2})/i);
    data.deductions80CCD2 = this.extractAmount(text, /80CCD\(2\)\s+([\d,.-]+\.\d{2})/i);
    data.deductions80D = this.extractAmount(text, /80D\s+([\d,.-]+\.\d{2})/i);
    data.deductions80E = this.extractAmount(text, /80E\s+([\d,.-]+\.\d{2})/i);
    data.deductions80G = this.extractAmount(text, /80G\s+([\d,.-]+\.\d{2})/i);
    data.deductions80TTA = this.extractAmount(text, /80TTA\s+([\d,.-]+\.\d{2})/i);

    data.totalChapterVIADeductions = this.extractAmount(text, /Total Chapter VI-A Deductions\s+([\d,.-]+\.\d{2})/i);
    if (data.totalChapterVIADeductions === 0) {
      data.totalChapterVIADeductions =
        data.deductions80C + data.deductions80CCC + data.deductions80CCD1 +
        data.deductions80CCD1B + data.deductions80CCD2 + data.deductions80D +
        data.deductions80E + data.deductions80G + data.deductions80TTA;
    }
  }
}
