import { FuzzyMatcher } from './FuzzyMatcher';
import { extractionConfig } from './extractionConfig';

export type Form16TemplateType = 'DETAILED_FORM_16' | 'STANDARD_FORM_16' | 'UNKNOWN';

export interface DocumentFingerprint {
  template: Form16TemplateType;
  labelsFound: string[];
  confidence: number;
}

export class FormatDetector {
  public static detect(text: string): DocumentFingerprint {
    const labelsFound: string[] = [];
    const config = extractionConfig.formatDetection;
    const detailedKeywords = config.detailedKeywords;
    const standardKeywords = config.standardKeywords;

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
