import { Form16Data } from '../types';
import { extractionConfig } from './extractionConfig';
import { ParserUtils } from './ParserUtils';

export class DeductionsParser {
  private static extractDeductionForSection(
    text: string,
    block: string,
    rule: any
  ): number {
    // 1. Try to extract from isolated Chapter VI-A block first (most specific context)
    if (block) {
      const amount = ParserUtils.extractAmount(block, rule);
      if (amount !== 0) {
        return amount;
      }
    }

    // 2. Fallback to full text extraction (less specific context)
    return ParserUtils.extractAmount(text, rule);
  }

  public static parse(text: string, data: Form16Data): void {
    const config = extractionConfig.deductions;

    // Isolate Chapter VI-A block to prevent cross-contamination with Form 12BB or other sections
    const chapterVIABlock = ParserUtils.getScopedBlock(text, config.chapterVIABlock, 2000);

    data.deductions80C = this.extractDeductionForSection(text, chapterVIABlock, config.deduction80C);
    data.deductions80CCC = this.extractDeductionForSection(text, chapterVIABlock, config.deduction80CCC);
    data.deductions80CCD1 = this.extractDeductionForSection(text, chapterVIABlock, config.deduction80CCD1);
    data.deductions80CCD1B = this.extractDeductionForSection(text, chapterVIABlock, config.deduction80CCD1B);
    data.deductions80CCD2 = this.extractDeductionForSection(text, chapterVIABlock, config.deduction80CCD2);
    data.deductions80D = this.extractDeductionForSection(text, chapterVIABlock, config.deduction80D);
    data.deductions80E = this.extractDeductionForSection(text, chapterVIABlock, config.deduction80E);
    data.deductions80G = this.extractDeductionForSection(text, chapterVIABlock, config.deduction80G);
    data.deductions80TTA = this.extractDeductionForSection(text, chapterVIABlock, config.deduction80TTA);

    data.totalChapterVIADeductions = ParserUtils.extractAmount(text, config.totalChapterVIADeductions);
    if (data.totalChapterVIADeductions === 0) {
      data.totalChapterVIADeductions =
        data.deductions80C + data.deductions80CCC + data.deductions80CCD1 +
        data.deductions80CCD1B + data.deductions80CCD2 + data.deductions80D +
        data.deductions80E + data.deductions80G + data.deductions80TTA;
    }
  }
}
