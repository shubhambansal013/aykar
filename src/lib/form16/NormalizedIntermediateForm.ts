import { FuzzyMatcher } from './FuzzyMatcher';
import { ParserUtils } from './ParserUtils';

export interface RawTextItem {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface IntermediatePage {
  pageNumber: number;
  items: RawTextItem[];
  lines: string[];
}

/**
 * NormalizedIntermediateForm represents the entire document as a collection
 * of layout-preserving pages, blocks, and cells with spatial positions.
 * This decouples the extraction phase (PDF text parsing) from interpretation (parsing values).
 */
export class NormalizedIntermediateForm {
  public pages: IntermediatePage[] = [];

  constructor(pages?: IntermediatePage[]) {
    if (pages) {
      this.pages = pages;
    }
  }

  /**
   * Helper to construct an intermediate form from raw pdfjs textContent items list per page.
   */
  public static fromPdfContent(pageItemsList: any[][]): NormalizedIntermediateForm {
    const form = new NormalizedIntermediateForm();

    pageItemsList.forEach((items, index) => {
      const pageNumber = index + 1;
      const rawItems: RawTextItem[] = [];

      items.forEach((item: any) => {
        if (!item || typeof item.str !== 'string') return;
        const x = Array.isArray(item.transform) ? item.transform[4] : 0;
        const y = Array.isArray(item.transform) ? item.transform[5] : 0;
        const w = item.width || 0;
        const h = item.height || 0;

        rawItems.push({ str: item.str, x, y, w, h });
      });

      // Reconstruct lines horizontally
      const TOLERANCE = 4.0;
      const rows: { y: number; items: RawTextItem[] }[] = [];

      for (const item of rawItems) {
        let matchedRow = rows.find(r => Math.abs(r.y - item.y) <= TOLERANCE);
        if (matchedRow) {
          matchedRow.items.push(item);
        } else {
          rows.push({ y: item.y, items: [item] });
        }
      }

      // Sort rows descending vertically (top of page first)
      rows.sort((a, b) => b.y - a.y);

      const pageLines: string[] = [];
      for (const row of rows) {
        // Sort items horizontally ascending
        row.items.sort((a, b) => a.x - b.x);

        let lineStr = '';
        for (let idx = 0; idx < row.items.length; idx++) {
          const cur = row.items[idx];
          if (idx > 0) {
            const prev = row.items[idx - 1];
            if (cur.x - prev.x > 120 || (prev.x < 280 && cur.x >= 280)) {
              lineStr += '  ';
            } else {
              lineStr += ' ';
            }
          }
          lineStr += cur.str;
        }
        pageLines.push(lineStr);
      }

      form.pages.push({
        pageNumber,
        items: rawItems,
        lines: pageLines,
      });
    });

    return form;
  }

  /**
   * Returns a complete reconstructed raw string of the document.
   */
  public getFullText(): string {
    return this.pages.map(p => p.lines.join('\n')).join('\n\n');
  }

  /**
   * Label-anchored search: Find a numeric amount next to a fuzzy-matched label.
   * Looks on the same line, or up to `searchWindowLines` lines below it.
   */
  public findNumberNearLabel(label: string, searchWindowLines = 0): number | null {
    for (const page of this.pages) {
      for (let i = 0; i < page.lines.length; i++) {
        const line = page.lines[i];

        if (FuzzyMatcher.containsFuzzy(line, label)) {
          // 1. Try finding number on the same line
          const sameLineNums = ParserUtils.extractNumbersFromLine(line);
          if (sameLineNums.length > 0) {
            return sameLineNums[sameLineNums.length - 1];
          }

          // 2. Scan lines immediately below within the window if specified
          if (searchWindowLines > 0) {
            const limit = Math.min(page.lines.length, i + 1 + searchWindowLines);
            for (let j = i + 1; j < limit; j++) {
              const subLine = page.lines[j];
              // Stop if we hit a different major field or header to prevent bleed
              if (
                FuzzyMatcher.containsFuzzy(subLine, 'Section 16') ||
                FuzzyMatcher.containsFuzzy(subLine, 'Chapter VI-A') ||
                FuzzyMatcher.containsFuzzy(subLine, 'Total taxable income')
              ) {
                break;
              }

              const nums = ParserUtils.extractNumbersFromLine(subLine);
              if (nums.length > 0) {
                return nums[nums.length - 1];
              }
            }
          }
        }
      }
    }
    return null;
  }

  /**
   * Label-anchored search: Find a text block near a fuzzy-matched label (e.g. employee name, address).
   */
  public findTextNearLabel(label: string, direction: 'right' | 'below' = 'right'): string | null {
    for (const page of this.pages) {
      for (let i = 0; i < page.lines.length; i++) {
        const line = page.lines[i];

        if (FuzzyMatcher.containsFuzzy(line, label)) {
          if (direction === 'right') {
            const index = line.toLowerCase().indexOf(label.toLowerCase());
            if (index !== -1) {
              const textRight = line.substring(index + label.length).trim();
              const cleaned = textRight.replace(/^[:\-\s]+|[:\-\s]+$/g, '');
              if (cleaned.length > 2) return cleaned;
            }
          } else if (direction === 'below') {
            if (i + 1 < page.lines.length) {
              const nextLine = page.lines[i + 1].trim();
              if (nextLine.length > 2) return nextLine;
            }
          }
        }
      }
    }
    return null;
  }
}
