/**
 * Human-readable and editable extraction configuration for Form-16 PDF parser.
 * Highly optimized for TRACES layout variations and text-parsing engine formats.
 */

export interface FieldExtractionRule {
  /**
   * Regular expressions used to identify a specific line/row.
   * When line-by-line positional extraction is performed, the first matching pattern identifies the line.
   */
  lineRegexes?: RegExp[];
  /**
   * Standard regexes applied to the entire text as a fallback if positional line matching fails.
   */
  fallbackRegexes: RegExp[];
  /**
   * Position index of the numeric value on the matched line.
   * e.g., -1 represents the last number (useful when multiple columns exist, such as Gross vs. Deductible amount),
   * 0 represents the first number, etc.
   */
  numericTokenIndex?: number;
}

export interface BlockBoundaries {
  start: RegExp;
  end: RegExp;
}

export interface ExtractionConfig {
  basicInfo: {
    employeeName: FieldExtractionRule;
    employeePan: FieldExtractionRule;
    employerTan: FieldExtractionRule;
    employerPan: FieldExtractionRule;
    assessmentYear: FieldExtractionRule;
    employerBlock: BlockBoundaries;
    employeeBlock: BlockBoundaries;
    employeeDeclarations: RegExp[];
    periodSearchKeywords: string[];
    periodFallback: RegExp;
  };
  salary: {
    grossSalaryBlock: BlockBoundaries;
    salaryAsPer17_1: FieldExtractionRule;
    perquisites17_2: FieldExtractionRule;
    profitsInLieu17_3: FieldExtractionRule;
    grossSalary: FieldExtractionRule;
    exemptAllowancesBlock: BlockBoundaries;
    exemptAllowancesLines: RegExp;
    totalExemptAllowances: FieldExtractionRule;
    standardDeduction16ia: FieldExtractionRule;
    entertainmentAllowance16ii: FieldExtractionRule;
    professionalTax16iii: FieldExtractionRule;
  };
  otherIncome: {
    houseProperty: FieldExtractionRule;
    totalOtherSources: FieldExtractionRule;
  };
  deductions: {
    chapterVIABlock: BlockBoundaries;
    deduction80C: FieldExtractionRule;
    deduction80CCC: FieldExtractionRule;
    deduction80CCD1: FieldExtractionRule;
    deduction80CCD1B: FieldExtractionRule;
    deduction80CCD2: FieldExtractionRule;
    deduction80D: FieldExtractionRule;
    deduction80E: FieldExtractionRule;
    deduction80G: FieldExtractionRule;
    deduction80TTA: FieldExtractionRule;
    totalChapterVIADeductions: FieldExtractionRule;
  };
  taxComputation: {
    grossTotalIncome: FieldExtractionRule;
    totalIncome: FieldExtractionRule;
    taxPayable: FieldExtractionRule;
  };
}

export const extractionConfig: ExtractionConfig = {
  basicInfo: {
    employeeName: {
      lineRegexes: [
        /Employee\s+Name\s*["\s,:-]*([A-Z\s]+)/i,
        /Name\s+and\s+address\s+of\s+the\s+Employee\s*["\s,:-]*([A-Z\s]+)/i
      ],
      fallbackRegexes: [
        /Employee\s+Name\s*["\s,:-]*([A-Z\s]+)/i
      ]
    },
    employeePan: {
      lineRegexes: [
        /Employee\s+PAN\s*(?:\/\s*Aadhaar\s+Number)?\s*["\s,:-]*([A-Z]{5}[0-9]{4}[A-Z])/i,
        /PAN\s+of\s+the\s+Employee\s*["\s,:-]*([A-Z]{5}[0-9]{4}[A-Z])/i
      ],
      fallbackRegexes: [/([A-Z]{5}[0-9]{4}[A-Z])/i]
    },
    employerTan: {
      lineRegexes: [
        /TAN\s+of\s+the\s+Deductor\s*["\s,:-]*([A-Z]{4}[0-9]{5}[A-Z])/i,
        /TAN\s+of\s+Employer\s*["\s,:-]*([A-Z]{4}[0-9]{5}[A-Z])/i
      ],
      fallbackRegexes: [/([A-Z]{4}[0-9]{5}[A-Z])/i]
    },
    employerPan: {
      lineRegexes: [
        /PAN\s+of\s+the\s+Deductor\s*["\s,:-]*([A-Z]{5}[0-9]{4}[A-Z])/i
      ],
      fallbackRegexes: [/([A-Z]{5}[0-9]{4}[A-Z])/i]
    },
    assessmentYear: {
      lineRegexes: [
        /Assessment\s+Year\s*["\s,:-]*(\d{4}-\d{2,4})/i
      ],
      fallbackRegexes: [/Assessment\s+Year\s*["\s,:-]*(\d{4}-\d{2,4})/i]
    },
    employerBlock: {
      start: /Name\s+and\s+address\s+of\s+the\s+Employer/i,
      end: /Name\s+and\s+address\s+of\s+the\s+Employee/i
    },
    employeeBlock: {
      start: /Name\s+and\s+address\s+of\s+the\s+Employee/i,
      end: /PAN\s+of\s+the/i
    },
    employeeDeclarations: [
      /I,\s*([A-Z\s]+?),\s*son\s*\/\s*daughter\s+of/i
    ],
    periodSearchKeywords: ['Period With The Employer', 'Period with the Employer'],
    periodFallback: /Period\s+with\s+the\s+Employer\s*.*?From\s*[:\s]*([^\s]+)\s+To\s*[:\s]*([^\s]+)/is
  },
  salary: {
    grossSalaryBlock: {
      start: /Gross\s+Salary/i,
      end: /Less:\s*Allowances/i
    },
    salaryAsPer17_1: {
      lineRegexes: [
        /Salary\s+as\s+per\s+provisions\s+contained\s+in\s+section\s+17\(1\)/i
      ],
      fallbackRegexes: [
        /section\s+17\(1\)[^0-9]*([\d.]+)/i
      ],
      numericTokenIndex: -1
    },
    perquisites17_2: {
      lineRegexes: [
        /Value\s+of\s+perquisites\s+under\s+section\s+17\(2\)/i
      ],
      fallbackRegexes: [
        /section\s+17\(2\)[^0-9]*([\d.]+)/i
      ],
      numericTokenIndex: -1
    },
    profitsInLieu17_3: {
      lineRegexes: [
        /Profits\s+in\s+lieu\s+of\s+salary\s+under\s+section\s+17\(3\)/i
      ],
      fallbackRegexes: [
        /section\s+17\(3\)[^0-9]*([\d.]+)/i
      ],
      numericTokenIndex: -1
    },
    grossSalary: {
      lineRegexes: [
        /Total\s+amount\s+of\s+salary\s+received\s+from\s+current\s+employer/i,
        /Gross\s+Salary\s*.*?Total/i
      ],
      fallbackRegexes: [
        /Gross\s+Salary\s*.*?Total[^0-9]*([\d.]+)/is
      ],
      numericTokenIndex: -1
    },
    exemptAllowancesBlock: {
      start: /Less:\s*Allowances\s+to\s+the\s+extent\s+exempt\s+under\s+section\s+10/i,
      end: /Total\s+amount\s+of\s+exemption\s+claimed\s+under\s+section\s+10/i
    },
    exemptAllowancesLines: /section\s+10\([^)]+\)[^0-9]*([\d.]+)/gi,
    totalExemptAllowances: {
      lineRegexes: [
        /Total\s+amount\s+of\s+exemption\s+claimed\s+under\s+section\s+10/i
      ],
      fallbackRegexes: [
        /Total\s+amount\s+of\s+exemption\s+claimed\s+under\s+section\s+10[^0-9]*([\d.]+)/i
      ],
      numericTokenIndex: -1
    },
    standardDeduction16ia: {
      lineRegexes: [
        /Standard\s+deduction\s+under\s+section\s+16\(ia\)/i
      ],
      fallbackRegexes: [
        /16\(ia\)[^0-9]*([\d.]+)/i
      ],
      numericTokenIndex: -1
    },
    entertainmentAllowance16ii: {
      lineRegexes: [
        /Entertainment\s+allowance\s+under\s+section\s+16\(ii\)/i
      ],
      fallbackRegexes: [
        /16\(ii\)[^0-9]*([\d.]+)/i
      ],
      numericTokenIndex: -1
    },
    professionalTax16iii: {
      lineRegexes: [
        /Tax\s+on\s+employment\s+under\s+section\s+16\(iii\)/i
      ],
      fallbackRegexes: [
        /16\(iii\)[^0-9]*([\d.]+)/i
      ],
      numericTokenIndex: -1
    }
  },
  otherIncome: {
    houseProperty: {
      lineRegexes: [
        /Income\s*\(or\s*admissible\s*loss\)\s*from\s*house\s*property/i
      ],
      fallbackRegexes: [
        /house\s+property\s+offered\s+for\s+TDS[^0-9]*([\d.]+)/i
      ],
      numericTokenIndex: -1
    },
    totalOtherSources: {
      lineRegexes: [
        /Income\s+under\s+the\s+head\s+Other\s+Sources/i
      ],
      fallbackRegexes: [
        /Other\s+Sources\s+offered\s+for\s+TDS[^0-9]*([\d.]+)/i
      ],
      numericTokenIndex: -1
    }
  },
  deductions: {
    chapterVIABlock: {
      start: /Deductions\s+under\s+Chapter\s+VI-A/i,
      end: /Total\s+taxable\s+income/i
    },
    deduction80C: {
      lineRegexes: [/under\s+section\s+80C\b/i],
      fallbackRegexes: [/80C[^0-9]*([\d.]+)/i],
      numericTokenIndex: -1
    },
    deduction80CCC: {
      lineRegexes: [/under\s+section\s+80CCC\b/i],
      fallbackRegexes: [/80CCC[^0-9]*([\d.]+)/i],
      numericTokenIndex: -1
    },
    deduction80CCD1: {
      lineRegexes: [/under\s+section\s+80CCD\s*\(1\)/i],
      fallbackRegexes: [/80CCD\s*\(1\)[^0-9]*([\d.]+)/i],
      numericTokenIndex: -1
    },
    deduction80CCD1B: {
      lineRegexes: [/under\s+section\s+80CCD\s*\(1B\)/i],
      fallbackRegexes: [/80CCD\s*\(1B\)[^0-9]*([\d.]+)/i],
      numericTokenIndex: -1
    },
    deduction80CCD2: {
      lineRegexes: [/under\s+section\s+80CCD\s*\(2\)/i],
      fallbackRegexes: [/80CCD\s*\(2\)[^0-9]*([\d.]+)/i],
      numericTokenIndex: -1
    },
    deduction80D: {
      lineRegexes: [/under\s+section\s+80D\b/i],
      fallbackRegexes: [/80D[^0-9]*([\d.]+)/i],
      numericTokenIndex: -1
    },
    deduction80E: {
      lineRegexes: [/under\s+section\s+80E\b/i],
      fallbackRegexes: [/80E[^0-9]*([\d.]+)/i],
      numericTokenIndex: -1
    },
    deduction80G: {
      lineRegexes: [/under\s+section\s+80G\b/i],
      fallbackRegexes: [/80G[^0-9]*([\d.]+)/i],
      numericTokenIndex: -1
    },
    deduction80TTA: {
      lineRegexes: [/under\s+section\s+80TTA\b/i],
      fallbackRegexes: [/80TTA[^0-9]*([\d.]+)/i],
      numericTokenIndex: -1
    },
    totalChapterVIADeductions: {
      lineRegexes: [
        /Aggregate\s+of\s+deductible\s+amount\s+under\s+Chapter\s+VI-A/i
      ],
      fallbackRegexes: [
        /Aggregate\s+of\s+deductible\s+amount\s+under\s+Chapter\s+VI-A[^0-9]*([\d.]+)/i
      ],
      numericTokenIndex: -1
    }
  },
  taxComputation: {
    grossTotalIncome: {
      lineRegexes: [/Gross\s+total\s+income\s*\(6\+8\)/i],
      fallbackRegexes: [/Gross\s+total\s+income[^0-9]*([\d.]+)/i],
      numericTokenIndex: -1
    },
    totalIncome: {
      lineRegexes: [/Total\s+taxable\s+income\s*\(9-11\)/i],
      fallbackRegexes: [/Total\s+taxable\s+income[^0-9]*([\d.]+)/i],
      numericTokenIndex: -1
    },
    taxPayable: {
      lineRegexes: [
        /^"17\.\s*","Tax\s+payable/i,
        /^"21\.\s*","Net\s+tax\s+payable/i
      ],
      fallbackRegexes: [
        /Net\s+tax\s+payable[^0-9]*([\d.]+)/i,
        /Tax\s+payable\s*\(13\+15\+16-14\)[^0-9]*([\d.]+)/i
      ],
      numericTokenIndex: -1
    }
  }
};
