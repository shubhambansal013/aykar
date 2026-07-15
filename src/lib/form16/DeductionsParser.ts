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

    let parsedViaLetters = false;
    if (chapterVIABlock) {
      const lines = chapterVIABlock.split(/[\r\n]+/);
      const letterDeductions: Record<string, number> = {};

      for (const line of lines) {
        const trimmed = line.trim();
        // Match lines like: (a) 150000.00 150000.00 or (k) 0.00  0.00 0.00
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
        data.deductions80C = letterDeductions['a'] ?? 0;
        data.deductions80CCC = letterDeductions['b'] ?? 0;
        data.deductions80CCD1 = letterDeductions['c'] ?? 0;
        data.deductions80CCD1B = letterDeductions['e'] ?? 0;
        data.deductions80CCD2 = letterDeductions['f'] ?? 0;
        data.deductions80D = letterDeductions['g'] ?? 0;
        data.deductions80E = letterDeductions['h'] ?? 0;
        data.deductions80G = letterDeductions['k'] ?? 0;
        data.deductions80TTA = letterDeductions['l'] ?? 0;
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
