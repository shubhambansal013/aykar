/**
 * Human-readable and editable extraction configuration for Form-16 PDF parser.
 * Precision-tuned to successfully parse the provided TRACES structured layout.
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
   * e.g., -1 represents the last number, 0 represents the first number, etc.
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
        /"Employee\s+Name\s*"\s*,\s*"([A-Z\s]+)"/i // Matches: "Employee Name ","MANAK JEET SINGH "
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
        /TAN\s+of\s+the\s+Deductor\s*["\s,:-]*([A-Z]{4}[0-9]{5}[A-Z])/i
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
    periodSearchKeywords: ['Period With The Employer'],
    periodFallback: /"Period\s+With\s+The\s+Employer\s*"\s*,\s*"From\s*[:\s]*([^\s]+)\s+To\s*[:\s]*([^\s]+)"/is
  },
  salary: {
    grossSalaryBlock: {
      start: /Gross\s+Salary/i,
      end: /Less:\s*Allowances/i
    },
    salaryAsPer17_1: {
      lineRegexes: [/section\s+17\(1\)/i],
      fallbackRegexes: [
        /section\s+17\(1\)"\s*,\s*"([\d.]+)"/i // Captures 7275532.00 safely from table quotes
      ],
      numericTokenIndex: -1
    },
    perquisites17_2: {
      lineRegexes: [/section\s+17\(2\)/i],
      fallbackRegexes: [
        /section\s+17\(2\)[^"]*"[^"]*"\s*,\s*"([\d.]+)"/i // Captures 5004.00 cleanly
      ],
      numericTokenIndex: -1
    },
    profitsInLieu17_3: {
      lineRegexes: [/section\s+17\(3\)/i],
      fallbackRegexes: [
        /section\s+17\(3\)[^"]*"[^"]*"\s*,\s*"([\d.]+)"/i
      ],
      numericTokenIndex: -1
    },
    grossSalary: {
      lineRegexes: [/Total/i],
      fallbackRegexes: [
        /"\(d\)"\s*,\s*"Total"\s*,\s*,\s*"([\d.]+)"/i // Extracts 7280536.00 safely
      ],
      numericTokenIndex: -1
    },
    exemptAllowancesBlock: {
      start: /Less:\s*Allowances\s+to\s+the\s+extent\s+exempt\s+under\s+section\s+10/i,
      end: /Total\s+amount\s+of\s+exemption\s+claimed\s+under\s+section\s+10/i
    },
    exemptAllowancesLines: /section\s+10\([^)]+\)[^"]*"[^"]*"\s*,\s*"([\d.]+)"/gi,
    totalExemptAllowances: {
      lineRegexes: [/Total\s+amount\s+of\s+exemption/i],
      fallbackRegexes: [
        /Total\s+amount\s+of\s+exemption\s+claimed\s+under\s+section\s+10[^"]*"[^"]*"\s*,\s*"([\d.]+)"/i
      ],
      numericTokenIndex: -1
    },
    standardDeduction16ia: {
      lineRegexes: [/Standard\s+deduction/i],
      fallbackRegexes: [
        /Standard\s+deduction\s+under\s+section\s+16\(ia\)[^"]*"[^"]*"\s*,\s*"([\d.]+)"/i
      ],
      numericTokenIndex: -1
    },
    entertainmentAllowance16ii: {
      lineRegexes: [/Entertainment\s+allowance/i],
      fallbackRegexes: [
        /Entertainment\s+allowance\s+under\s+section\s+16\(ii\)[^"]*"[^"]*"\s*,\s*"([\d.]+)"/i
      ],
      numericTokenIndex: -1
    },
    professionalTax16iii: {
      lineRegexes: [/Tax\s+on\s+employment/i],
      fallbackRegexes: [
        /Tax\s+on\s+employment\s+under\s+section\s+16\(iii\)[^"]*"[^"]*"\s*,\s*"([\d.]+)"/i
      ],
      numericTokenIndex: -1
    }
  },
  otherIncome: {
    houseProperty: {
      lineRegexes: [/house\s+property/i],
      fallbackRegexes: [
        /house\s+property\s+reported\s+by\s+employee[^"]*"[^"]*"\s*,\s*"([\d.]+)"/i
      ],
      numericTokenIndex: -1
    },
    totalOtherSources: {
      lineRegexes: [/Other\s+Sources/i],
      fallbackRegexes: [
        /Other\s+Sources\s+offered\s+for\s+TDS[^"]*"[^"]*"\s*,\s*"([\d.]+)"/i
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
      lineRegexes: [/section\s+80C\b/i],
      fallbackRegexes: [/80C[^"]*"[^"]*"\s*,\s*"([\d.]+)"\s*,\s*"([\d.]+)"/i],
      numericTokenIndex: -1
    },
    deduction80CCC: {
      lineRegexes: [/section\s+80CCC\b/i],
      fallbackRegexes: [/80CCC[^"]*"[^"]*"\s*,\s*"([\d.]+)"\s*,\s*"([\d.]+)"/i],
      numericTokenIndex: -1
    },
    deduction80CCD1: {
      lineRegexes: [/section\s+80CCD\s*\(1\)/i],
      fallbackRegexes: [/80CCD\s*\(1\)[^"]*"[^"]*"\s*,\s*"([\d.]+)"\s*,\s*"([\d.]+)"/i],
      numericTokenIndex: -1
    },
    deduction80CCD1B: {
      lineRegexes: [/section\s+80CCD\s*\(1B\)/i],
      fallbackRegexes: [/80CCD\s*\(1B\)[^"]*"[^"]*"\s*,\s*"([\d.]+)"\s*,\s*"([\d.]+)"/i],
      numericTokenIndex: -1
    },
    deduction80CCD2: {
      lineRegexes: [/section\s+80CCD\s*\(2\)/i],
      fallbackRegexes: [/80CCD\s*\(2\)[^"]*"[^"]*"\s*,\s*"([\d.]+)"\s*,\s*"([\d.]+)"/i],
      numericTokenIndex: -1
    },
    deduction80D: {
      lineRegexes: [/section\s+80D\b/i],
      fallbackRegexes: [/80D[^"]*"[^"]*"\s*,\s*"([\d.]+)"\s*,\s*"([\d.]+)"/i],
      numericTokenIndex: -1
    },
    deduction80E: {
      lineRegexes: [/section\s+80E\b/i],
      fallbackRegexes: [/80E[^"]*"[^"]*"\s*,\s*"([\d.]+)"\s*,\s*"([\d.]+)"/i],
      numericTokenIndex: -1
    },
    deduction80G: {
      lineRegexes: [/section\s+80G\b/i],
      fallbackRegexes: [/80G[^"]*"[^"]*"\s*,\s*"([\d.]+)"\s*,\s*"([\d.]+)"/i],
      numericTokenIndex: -1
    },
    deduction80TTA: {
      lineRegexes: [/section\s+80TTA\b/i],
      fallbackRegexes: [/80TTA[^"]*"[^"]*"\s*,\s*"([\d.]+)"\s*,\s*"([\d.]+)"/i],
      numericTokenIndex: -1
    },
    totalChapterVIADeductions: {
      lineRegexes: [/Aggregate\s+of\s+deductible\s+amount/i],
      fallbackRegexes: [
        /Aggregate\s+of\s+deductible\s+amount\s+under\s+Chapter\s+VI-A[^"]*"[^"]*"\s*,\s*,\s*,\s*,\s*"([\d.]+)"/i
      ],
      numericTokenIndex: -1
    }
  },
  taxComputation: {
    grossTotalIncome: {
      lineRegexes: [/Gross\s+total\s+income/i],
      fallbackRegexes: [
        /Gross\s+total\s+income\s*\(6\+8\)[^"]*"[^"]*"\s*,\s*,\s*,\s*,\s*"([\d.]+)"/i
      ],
      numericTokenIndex: -1
    },
    totalIncome: {
      lineRegexes: [/Total\s+taxable\s+income/i],
      fallbackRegexes: [
        /Total\s+taxable\s+income\s*\(9-11\)[^"]*"[^"]*"\s*,\s*,\s*,\s*,\s*"([\d.]+)"/i
      ],
      numericTokenIndex: -1
    },
    taxPayable: {
      lineRegexes: [
        /"17\."\s*,\s*"Tax\s+payable/i
      ],
      fallbackRegexes: [
        /"17\."\s*,\s*"Tax\s+payable\s*\(13\+15\+16-14\)"\s*,\s*,\s*,\s*,\s*"([\d.]+)"/i
      ],
      numericTokenIndex: -1
    }
  }
};
