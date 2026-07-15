import { FieldExtractionRule } from './extractionConfig';

export class ParserUtils {
  /**
   * Normalizes a number string and parses it into a float.
   * Handles formats with spaces/commas like "4, 011, 738.00" or "4,011,738.00".
   * Also supports negative numbers like "-4,011,738.00".
   */
  public static parseNormalizedNumber(numStr: string): number {
    const cleaned = numStr.replace(/[\s,]/g, '');
    return parseFloat(cleaned) || 0;
  }

  /**
   * Extract all currency/numeric amounts from a single line of text.
   * Recognizes formats like 1,50,000.00, 150000.00, or 4, 011, 738.00, including negative signs.
   */
  public static extractNumbersFromLine(line: string): number[] {
    const matches = line.match(/-?\s*\d[\d\s,]*\.\d{2}/g);
    if (!matches) return [];
    return matches.map(m => this.parseNormalizedNumber(m));
  }

  /**
   * Extract numeric amount using the rule:
   * 1. Try positional extraction by finding a matching line in the text.
   * 2. If matched, extract the numbers from that line and pick the index specified in the rule.
   * 3. Fall back to standard regex matching on the full text if positional extraction fails.
   */
  public static extractAmount(text: string, rule: FieldExtractionRule): number {
    const lines = text.split('\n');

    // 1. Try positional line-by-line extraction
    if (rule.lineRegexes && rule.lineRegexes.length > 0) {
      for (const lineRegex of rule.lineRegexes) {
        for (const line of lines) {
          if (lineRegex.test(line)) {
            const numbers = this.extractNumbersFromLine(line);
            if (numbers.length > 0) {
              const targetIndex = rule.numericTokenIndex !== undefined ? rule.numericTokenIndex : -1;
              const resolvedIndex = targetIndex < 0 ? numbers.length + targetIndex : targetIndex;
              if (resolvedIndex >= 0 && resolvedIndex < numbers.length) {
                return numbers[resolvedIndex];
              }
            }
          }
        }
      }
    }

    // 2. Fallback to general/global regexes on the full text
    for (const fallbackRegex of rule.fallbackRegexes) {
      const match = text.match(fallbackRegex);
      if (match) {
        // Retrieve the last non-undefined group match, parsing it as normalized number
        for (let i = match.length - 1; i > 0; i--) {
          if (match[i] !== undefined) {
            return this.parseNormalizedNumber(match[i]);
          }
        }
      }
    }

    return 0;
  }

  /**
   * Isolates a block of text between a start pattern and end pattern (useful for scoping searches).
   */
  public static getScopedBlock(text: string, boundaries: { start: RegExp; end: RegExp }, fallbackLength = 2000): string {
    const startIndex = text.search(boundaries.start);
    if (startIndex === -1) return text;

    const sub = text.substring(startIndex);
    const endIndex = sub.substring(1).search(boundaries.end);
    if (endIndex !== -1) {
      return sub.substring(0, endIndex + 1);
    }
    return sub.substring(0, fallbackLength);
  }
}
