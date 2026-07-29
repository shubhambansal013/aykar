import { Form16Data } from '../proto/compatibilityProxy';
import { extractionConfig } from './extractionConfig';
import { ParserUtils } from './ParserUtils';

const DEDUCTION_FIELD_MAP: Record<string, keyof Form16Data> = {
  deduction80C: 'deductions80C',
  deduction80CCC: 'deductions80CCC',
  deduction80CCD1: 'deductions80CCD1',
  deduction80CCD1B: 'deductions80CCD1B',
  deduction80CCD2: 'deductions80CCD2',
  deduction80D: 'deductions80D',
  deduction80E: 'deductions80E',
  deduction80G: 'deductions80G',
  deduction80TTA: 'deductions80TTA',
};

export class DeductionsParser {
  private static extractDeductionForSection(
    text: string,
    block: string,
    rule: any
  ): number {
    if (block) {
      const amount = ParserUtils.extractAmount(block, rule);
      if (amount !== 0) {
        return amount;
      }
    }
    return ParserUtils.extractAmount(text, rule);
  }

  public static parse(text: string, data: Form16Data): void {
    const config = extractionConfig.deductions;
    const chapterVIABlock = ParserUtils.getScopedBlock(text, config.chapterVIABlock, 2000);

    let parsedViaLetters = false;
    if (chapterVIABlock) {
      const lines = chapterVIABlock.split(/[\r\n]+/);
      const letterDeductions: Record<string, number> = {};

      for (const line of lines) {
        const trimmed = line.trim();
        const letterMatch = trimmed.match(/^\s*\(([a-z])\)\s+([\d,.-]+\.\d{2})\s+([\d,.-]+\.\d{2})\b/i) ||
                            trimmed.match(/^\s*\(([a-z])\)\s+([\d,.-]+\.\d{2})\s+([\d,.-]+\.\d{2})\s+([\d,.-]+\.\d{2})\b/i);
        if (letterMatch) {
          const letter = letterMatch[1].toLowerCase();
          const amountStr = letterMatch[letterMatch.length - 1];
          const amount = parseFloat(amountStr.replace(/,/g, ''));
          if (!isNaN(amount)) {
            letterDeductions[letter] = amount;
          }
        }
      }

      if (Object.keys(letterDeductions).length > 0) {
        parsedViaLetters = true;
        for (const [letter, fieldName] of Object.entries(config.letterToField)) {
          const dataField = DEDUCTION_FIELD_MAP[fieldName];
          if (dataField && letterDeductions[letter] !== undefined) {
            (data as any)[dataField] = letterDeductions[letter];
          }
        }
      }
    }

    if (!parsedViaLetters) {
      data.deductions80C = this.extractDeductionForSection(text, chapterVIABlock, config.deduction80C);
      data.deductions80CCC = this.extractDeductionForSection(text, chapterVIABlock, config.deduction80CCC);
      data.deductions80CCD1 = this.extractDeductionForSection(text, chapterVIABlock, config.deduction80CCD1);
      data.deductions80CCD1B = this.extractDeductionForSection(text, chapterVIABlock, config.deduction80CCD1B);
      data.deductions80CCD2 = this.extractDeductionForSection(text, chapterVIABlock, config.deduction80CCD2);
      data.deductions80D = this.extractDeductionForSection(text, chapterVIABlock, config.deduction80D);
      data.deductions80E = this.extractDeductionForSection(text, chapterVIABlock, config.deduction80E);
      data.deductions80G = this.extractDeductionForSection(text, chapterVIABlock, config.deduction80G);
      data.deductions80TTA = this.extractDeductionForSection(text, chapterVIABlock, config.deduction80TTA);
    }

    data.totalChapterVIADeductions = ParserUtils.extractAmount(text, config.totalChapterVIADeductions);
    if (data.totalChapterVIADeductions === 0) {
      data.totalChapterVIADeductions =
        data.deductions80C + data.deductions80CCC + data.deductions80CCD1 +
        data.deductions80CCD1B + data.deductions80CCD2 + data.deductions80D +
        data.deductions80E + data.deductions80G + data.deductions80TTA;
    }
  }
}
