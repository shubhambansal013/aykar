import { FuzzyMatcher } from './FuzzyMatcher';

export type Form16TemplateType = 'DETAILED_FORM_16' | 'STANDARD_FORM_16' | 'UNKNOWN';

export interface DocumentFingerprint {
  template: Form16TemplateType;
  labelsFound: string[];
  confidence: number;
}

export class FormatDetector {
  /**
   * Fingerprints the given document text to identify its template class and confidence level.
   */
  public static detect(text: string): DocumentFingerprint {
    const labelsFound: string[] = [];

    // Characteristics of Detailed Form-16 (Part A & Part B summaries)
    const detailedKeywords = [
      'FORM NO. 12BA',
      'DETAILS OF TAX DEDUCTED AND DEPOSITED',
      'CIT (TDS)',
      'Certificate No',
      'Quarter(s)',
      'Challan Identification Number'
    ];

    // Characteristics of Standard Form-16
    const standardKeywords = [
      'Gross Salary',
      'Deductions under section 16',
      'Tax payable',
      'Income chargeable under the head "Salaries"'
    ];

    let detailedScore = 0;
    detailedKeywords.forEach(kw => {
      if (FuzzyMatcher.containsFuzzy(text, kw, 0.75)) {
        labelsFound.push(kw);
        detailedScore++;
      }
    });

    let standardScore = 0;
    standardKeywords.forEach(kw => {
      if (FuzzyMatcher.containsFuzzy(text, kw, 0.75)) {
        labelsFound.push(kw);
        standardScore++;
      }
    });

    const totalDetailedWeight = detailedScore / detailedKeywords.length;
    const totalStandardWeight = standardScore / standardKeywords.length;

    if (detailedScore >= 2 && totalDetailedWeight > totalStandardWeight) {
      return {
        template: 'DETAILED_FORM_16',
        labelsFound,
        confidence: parseFloat(totalDetailedWeight.toFixed(2)),
      };
    }

    if (standardScore >= 1) {
      return {
        template: 'STANDARD_FORM_16',
        labelsFound,
        confidence: parseFloat(totalStandardWeight.toFixed(2)),
      };
    }

    return {
      template: 'UNKNOWN',
      labelsFound,
      confidence: 0.0,
    };
  }
}
