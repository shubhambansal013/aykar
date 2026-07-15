import { Form16Data } from '../types';

export class DeductionsParser {
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

  private static getSectionSnippet(text: string, sectionCode: string, nextSections: string[]): string {
    const escapedCode = sectionCode.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    let regexStr = `\\b${escapedCode}\\b`;
    if (sectionCode.endsWith(')')) {
      regexStr = `\\b${escapedCode}`;
    }
    const regex = new RegExp(regexStr, 'i');
    const match = text.match(regex);
    if (!match || match.index === undefined) return '';

    const startIndex = match.index;

    // Find index of any of the next sections in the remaining text
    let minEndIndex = text.length;
    const remainingText = text.substring(startIndex + match[0].length);

    for (const nextSec of nextSections) {
      const escapedNext = nextSec.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      let nextRegexStr = `\\b${escapedNext}\\b`;
      if (nextSec.endsWith(')')) {
        nextRegexStr = `\\b${escapedNext}`;
      }
      const nextRegex = new RegExp(nextRegexStr, 'i');
      const nextMatch = remainingText.match(nextRegex);
      if (nextMatch && nextMatch.index !== undefined) {
        const absoluteIndex = startIndex + match[0].length + nextMatch.index;
        if (absoluteIndex < minEndIndex) {
          minEndIndex = absoluteIndex;
        }
      }
    }

    return text.substring(startIndex, minEndIndex);
  }

  private static extractNumbers(snippet: string): number[] {
    // Match numbers like 1,50,000.00 or 150000.00 or 1, 50, 000.00
    const matches = snippet.match(/\d[\d\s,]*\.\d{2}/g);
    if (!matches) return [];
    return matches.map(m => parseFloat(m.replace(/[\s,]/g, '')) || 0);
  }

  private static extractDeductionForSection(text: string, block: string, sectionCode: string, fallbackRegex: RegExp): number {
    const ALL_SECTIONS = [
      '80C', '80CCC', '80CCD(1B)', '80CCD(1)', '80CCD(2)', '80CCD',
      '80D', '80DD', '80DDB', '80E', '80EE', '80G', '80GG', '80GGA',
      '80GGC', '80TTA', '80TTB', '80U', 'Total'
    ];

    const boundarySections = ALL_SECTIONS.filter(s => s.toLowerCase() !== sectionCode.toLowerCase());

    // 1. Try snippet from isolated block
    let snippet = this.getSectionSnippet(block, sectionCode, boundarySections);

    // 2. Try snippet from full text
    if (!snippet) {
      snippet = this.getSectionSnippet(text, sectionCode, boundarySections);
    }

    if (snippet) {
      const numbers = this.extractNumbers(snippet);
      if (numbers.length > 0) {
        return numbers[numbers.length - 1]; // Last number is the final/deductible column
      }
    }

    // 3. Fallback to direct regex extraction
    return this.extractAmount(text, fallbackRegex);
  }

  public static parse(text: string, data: Form16Data): void {
    // Isolate Chapter VI-A block to prevent cross-contamination with Form 12BB or other sections
    let chapterVIABlock = '';
    const startIndex = text.search(/Deductions\s+(?:in\s+respect\s+of\s+)?(?:revenues\/payments\s+)?under\s+Chapter\s+VI-A/i);
    const fallbackStartIndex = text.search(/Chapter\s*VI-?A\s+Deductions/i);
    const resolvedStartIndex = startIndex !== -1 ? startIndex : (fallbackStartIndex !== -1 ? fallbackStartIndex : -1);

    if (resolvedStartIndex !== -1) {
      const endSearchText = text.substring(resolvedStartIndex);
      const endIndex = endSearchText.search(/(?:Total\s+Income|11\.\s+Total\s+Income|12\.\s+Total\s+Income|Taxable\s+Income)/i);
      if (endIndex !== -1) {
        chapterVIABlock = endSearchText.substring(0, endIndex);
      } else {
        chapterVIABlock = endSearchText.substring(0, 2000);
      }
    } else {
      chapterVIABlock = text;
    }

    data.deductions80C = this.extractDeductionForSection(text, chapterVIABlock, '80C', /80C\s+([\d,.-]+\.\d{2})/i);
    data.deductions80CCC = this.extractDeductionForSection(text, chapterVIABlock, '80CCC', /80CCC\s+([\d,.-]+\.\d{2})/i);
    data.deductions80CCD1 = this.extractDeductionForSection(text, chapterVIABlock, '80CCD(1)', /80CCD\(1\)\s+([\d,.-]+\.\d{2})/i);
    data.deductions80CCD1B = this.extractDeductionForSection(text, chapterVIABlock, '80CCD(1B)', /80CCD\(1B\)\s+([\d,.-]+\.\d{2})/i);
    data.deductions80CCD2 = this.extractDeductionForSection(text, chapterVIABlock, '80CCD(2)', /80CCD\(2\)\s+([\d,.-]+\.\d{2})/i);
    data.deductions80D = this.extractDeductionForSection(text, chapterVIABlock, '80D', /80D\s+([\d,.-]+\.\d{2})/i);
    data.deductions80E = this.extractDeductionForSection(text, chapterVIABlock, '80E', /80E\s+([\d,.-]+\.\d{2})/i);
    data.deductions80G = this.extractDeductionForSection(text, chapterVIABlock, '80G', /80G\s+([\d,.-]+\.\d{2})/i);
    data.deductions80TTA = this.extractDeductionForSection(text, chapterVIABlock, '80TTA', /80TTA\s+([\d,.-]+\.\d{2})/i);

    data.totalChapterVIADeductions = this.extractAmount(text, /Total Chapter VI-A Deductions\s+([\d,.-]+\.\d{2})/i);
    if (data.totalChapterVIADeductions === 0) {
      data.totalChapterVIADeductions =
        data.deductions80C + data.deductions80CCC + data.deductions80CCD1 +
        data.deductions80CCD1B + data.deductions80CCD2 + data.deductions80D +
        data.deductions80E + data.deductions80G + data.deductions80TTA;
    }
  }
}
