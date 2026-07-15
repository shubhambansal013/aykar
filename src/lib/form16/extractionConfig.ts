/**
 * Human-readable and editable extraction configuration for Form-16 PDF parser.
 * This configuration separates regex patterns, positional line anchors, and column
 * offsets from the procedural code to make maintenance and rule adjustments straightforward.
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
    employeePan: {
      lineRegexes: [
        /PAN\s+OF\s+THE\s+EMPLOYEE(?:\/Specified\s+senior\s+citizen)?\s*[:\-]?\s*([A-Z]{5}[0-9]{4}[A-Z])/i,
        /Permanent\s+Account\s+Number(?:\s+or\s+Aadhaar\s+Number)?\s+of\s+the\s+employee\s*[:\-]?\s*([A-Z]{5}[0-9]{4}[A-Z])/i
      ],
      fallbackRegexes: [
        /PAN\s+OF\s+THE\s+EMPLOYEE(?:\/Specified\s+senior\s+citizen)?\s*[:\-]?\s*([A-Z]{5}[0-9]{4}[A-Z])/i,
        /([A-Z]{5}[0-9]{4}[A-Z])/i // General 10-char PAN match
      ]
    },
    employerTan: {
      lineRegexes: [
        /TAN\s+OF\s+THE\s+DEDUCTOR\s*[:\-]?\s*([A-Z]{4}[0-9]{5}[A-Z])/i
      ],
      fallbackRegexes: [
        /TAN\s+OF\s+THE\s+DEDUCTOR\s*[:\-]?\s*([A-Z]{4}[0-9]{5}[A-Z])/i
      ]
    },
    employerPan: {
      lineRegexes: [
        /PAN\s+OF\s+THE\s+DEDUCTOR\s*[:\-]?\s*([A-Z]{5}[0-9]{4}[A-Z])/i
      ],
      fallbackRegexes: [
        /PAN\s+OF\s+THE\s+DEDUCTOR\s*[:\-]?\s*([A-Z]{5}[0-9]{4}[A-Z])/i
      ]
    },
    assessmentYear: {
      lineRegexes: [
        /Assessment\s+Year\s*[:\-]?\s*(\d{4}-\d{2,4})/i
      ],
      fallbackRegexes: [
        /Assessment\s+Year\s*[:\-]?\s*(\d{4}-\d{2,4})/i
      ]
    },
    employerBlock: {
      start: /Name and address of the Employer(?:\/(?:Specified Bank|Specified senior citizen))?[:\-\s]*/i,
      end: /\s*(?:Name and address of the Employee|PAN of the|TAN of the|Assessment Year|Period with|$)/i
    },
    employeeBlock: {
      start: /Name and address of the Employee(?:\/(?:Specified Bank|Specified senior citizen))?[:\-\s]*/i,
      end: /\s*(?:PAN of the|TAN of the|Assessment Year|Period with|$)/i
    },
    employeeDeclarations: [
      /Name and address of the employee\s*[:\-]\s*([A-Z\s]+?)(?=\s*(?:\r?\n|Permanent|\d|PAN|$))/i, // Form 12BB
      /Name,?\s*(?:designation|and|Permanent|Account|Number|or|Aadhaar|\s)*of\s*employee\s*[:\-]\s*([A-Z\s]+?)(?=\s*(?:,|\r?\n|Designation|Software|CESPB|[A-Z]{5}[0-9]{4}[A-Z]|$))/i, // Form 12BA
      /Name\s+of\s+the?\s*employee\s*[:\-]\s*([A-Z\s]+?)(?=\s*(?:\r?\n|Designation|Address|PAN|TAN|$))/i, // Name of employee label
      /I,\s*([A-Z\s]+?),\s*employee\s+of/i, // Form 12BA declaration
      /I,\s*([A-Z\s]+?),\s*(?:son|daughter)\s*of/gi // Verification/Declaration line
    ],
    periodSearchKeywords: ['period with'],
    periodFallback: /Period with the employer:\s*From\s+([^\s]+)\s+To\s+([^\s]+)/i
  },
  salary: {
    grossSalaryBlock: {
      start: /1\.\s*Gross\s*Salary/i,
      end: /(?:2\.\s*Less\s*|Allowances\s+to\s+the\s+extent\s+exempt)/i
    },
    salaryAsPer17_1: {
      lineRegexes: [
        /Salary\s+as\s+per\s+provisions\s+contained\s+in\s+section\s+17\(1\)/i,
        /Salary\s+as\s+per\s+section\s+17\(1\)/i,
        /17\(1\)/i,
        /^\s*\(a\)\s+/i,
        /\(a\)\s+Salary\s+as\s+per/i
      ],
      fallbackRegexes: [
        /salary\s+as\s+per\s+(?:provisions\s+contained\s+in\s+)?section\s+17\(1\)\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i,
        /17\(1\)\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i
      ],
      numericTokenIndex: -1
    },
    perquisites17_2: {
      lineRegexes: [
        /Value\s+of\s+perquisites\s+under\s+section\s+17\(2\)/i,
        /Value\s+of\s+perquisites\s+u\/s\s+17\(2\)/i,
        /17\(2\)/i,
        /^\s*\(b\)\s+/i,
        /\(b\)\s+Value\s+of\s+perquisites/i
      ],
      fallbackRegexes: [
        /perquisites\s+(?:u\/s|under\s+section)?\s*17\(2\)\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i,
        /17\(2\)\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i,
        /Total\s+value\s+of\s+perquisites\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i
      ],
      numericTokenIndex: -1
    },
    profitsInLieu17_3: {
      lineRegexes: [
        /Profits\s+in\s+lieu\s+of\s+salary\s+under\s+section\s+17\(3\)/i,
        /Profits\s+in\s+lieu\s+of\s+salary\s+u\/s\s+17\(3\)/i,
        /17\(3\)/i,
        /^\s*\(c\)\s+/i,
        /\(c\)\s+Profits\s+in\s+lieu/i
      ],
      fallbackRegexes: [
        /profits?\s+in\s+lieu\s+of\s+salary\s+(?:u\/s|under\s+section)?\s*17\(3\)\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i,
        /17\(3\)\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i
      ],
      numericTokenIndex: -1
    },
    grossSalary: {
      lineRegexes: [
        /Total\s+Gross\s+Salary/i,
        /^\s*\(d\)\s+/i,
        /\(d\)\s+Total/i,
        /Gross\s+Salary/i
      ],
      fallbackRegexes: [
        /Total\s+Gross\s+Salary\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i,
        /(?:^|[^l])\s+Gross\s+Salary\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i
      ],
      numericTokenIndex: -1
    },
    exemptAllowancesBlock: {
      start: /Allowances to the extent exempt u\/s 10/is,
      end: /Total Exempt Allowances/is
    },
    exemptAllowancesLines: /Exempt\s+Allowance\s+([0-9a-zA-Z()]+)\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/gi,
    totalExemptAllowances: {
      lineRegexes: [
        /Total\s+Exempt\s+Allowances/i,
        /Total\s+allowances\s+to\s+the\s+extent\s+exempt/i
      ],
      fallbackRegexes: [
        /Total\s+Exempt\s+Allowances\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i
      ],
      numericTokenIndex: -1
    },
    standardDeduction16ia: {
      lineRegexes: [
        /Standard\s+deduction\s+under\s+section\s+16\(ia\)/i,
        /Standard\s+deduction\s+u\/s\s+16\(ia\)/i,
        /Standard\s+deduction\s+16\(ia\)/i
      ],
      fallbackRegexes: [
        /Standard\s+deduction\s+(?:u\/s|under\s+section)\s+16\(ia\)(?:[^\d-]*)(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i,
        /Standard\s+deduction\s+u\/s\s+16\(ia\)\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i
      ],
      numericTokenIndex: -1
    },
    entertainmentAllowance16ii: {
      lineRegexes: [
        /Entertainment\s+allowance\s+under\s+section\s+16\(ii\)/i,
        /Entertainment\s+allowance\s+u\/s\s+16\(ii\)/i,
        /Entertainment\s+allowance\s+16\(ii\)/i
      ],
      fallbackRegexes: [
        /Entertainment\s+allowance\s+(?:u\/s|under\s+section)\s+16\(ii\)(?:[^\d-]*)(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i,
        /Entertainment\s+allowance\s+u\/s\s+16\(ii\)\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i
      ],
      numericTokenIndex: -1
    },
    professionalTax16iii: {
      lineRegexes: [
        /Tax\s+on\s+employment\s+under\s+section\s+16\(iii\)/i,
        /Tax\s+on\s+employment\s+u\/s\s+16\(iii\)/i,
        /Tax\s+on\s+employment\s+16\(iii\)/i,
        /Professional\s+Tax\s+under\s+section\s+16\(iii\)/i,
        /Professional\s+Tax\s+u\/s\s+16\(iii\)/i,
        /Professional\s+Tax\s+16\(iii\)/i
      ],
      fallbackRegexes: [
        /(?:Tax\s+on\s+employment|Professional\s+Tax)\s+(?:u\/s|under\s+section)?\s*16\(iii\)(?:[^\d-]*)(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i,
        /(?:Tax\s+on\s+employment|Professional\s+Tax)\s+u\/s\s+16\(iii\)\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i
      ],
      numericTokenIndex: -1
    }
  },
  otherIncome: {
    houseProperty: {
      lineRegexes: [
        /Income\s+(?:or\s+admissible\s+loss\s+)?from\s+house\s+property/i
      ],
      fallbackRegexes: [
        /Income (?:or admissible loss )?from house property\s+([\d,.-]+\.\d{2})/i
      ],
      numericTokenIndex: -1
    },
    totalOtherSources: {
      lineRegexes: [
        /Income\s+from\s+other\s+sources/i
      ],
      fallbackRegexes: [
        /Income from other sources\s+([\d,.-]+\.\d{2})/i
      ],
      numericTokenIndex: -1
    }
  },
  deductions: {
    chapterVIABlock: {
      start: /Deductions\s+(?:in\s+respect\s+of\s+)?(?:revenues\/payments\s+)?under\s+Chapter\s+VI-A/i,
      end: /(?:Total\s+Income|11\.\s+Total\s+Income|12\.\s+Total\s+Income|Taxable\s+Income)/i
    },
    deduction80C: {
      lineRegexes: [
        /80C\b/i
      ],
      fallbackRegexes: [
        /80C\s+([\d,.-]+\.\d{2})/i
      ],
      numericTokenIndex: -1
    },
    deduction80CCC: {
      lineRegexes: [
        /80CCC\b/i
      ],
      fallbackRegexes: [
        /80CCC\s+([\d,.-]+\.\d{2})/i
      ],
      numericTokenIndex: -1
    },
    deduction80CCD1: {
      lineRegexes: [
        /80CCD\(1\)/i
      ],
      fallbackRegexes: [
        /80CCD\(1\)\s+([\d,.-]+\.\d{2})/i
      ],
      numericTokenIndex: -1
    },
    deduction80CCD1B: {
      lineRegexes: [
        /80CCD\(1B\)/i
      ],
      fallbackRegexes: [
        /80CCD\(1B\)\s+([\d,.-]+\.\d{2})/i
      ],
      numericTokenIndex: -1
    },
    deduction80CCD2: {
      lineRegexes: [
        /80CCD\(2\)/i
      ],
      fallbackRegexes: [
        /80CCD\(2\)\s+([\d,.-]+\.\d{2})/i
      ],
      numericTokenIndex: -1
    },
    deduction80D: {
      lineRegexes: [
        /80D\b/i
      ],
      fallbackRegexes: [
        /80D\s+([\d,.-]+\.\d{2})/i
      ],
      numericTokenIndex: -1
    },
    deduction80E: {
      lineRegexes: [
        /80E\b/i
      ],
      fallbackRegexes: [
        /80E\s+([\d,.-]+\.\d{2})/i
      ],
      numericTokenIndex: -1
    },
    deduction80G: {
      lineRegexes: [
        /80G\b/i
      ],
      fallbackRegexes: [
        /80G\s+([\d,.-]+\.\d{2})/i
      ],
      numericTokenIndex: -1
    },
    deduction80TTA: {
      lineRegexes: [
        /80TTA\b/i
      ],
      fallbackRegexes: [
        /80TTA\s+([\d,.-]+\.\d{2})/i
      ],
      numericTokenIndex: -1
    },
    totalChapterVIADeductions: {
      lineRegexes: [
        /Total\s+Chapter\s+VI-A\s+Deductions/i,
        /Total\s+deductions\s+under\s+Chapter\s+VI-A/i
      ],
      fallbackRegexes: [
        /Total Chapter VI-A Deductions\s+([\d,.-]+\.\d{2})/i
      ],
      numericTokenIndex: -1
    }
  },
  taxComputation: {
    grossTotalIncome: {
      lineRegexes: [
        /Gross\s+Total\s+Income/i
      ],
      fallbackRegexes: [
        /Gross Total Income\s+([\d,.-]+\.\d{2})/i
      ],
      numericTokenIndex: -1
    },
    totalIncome: {
      lineRegexes: [
        /(?<!Gross\s+)Total\s+Income/i,
        /(?:^|[^s])\s+Total\s+Income/i
      ],
      fallbackRegexes: [
        /(?:^|[^s])\s+Total\s+Income\s+([\d,.-]+\.\d{2})/i
      ],
      numericTokenIndex: -1
    },
    taxPayable: {
      lineRegexes: [
        /Net\s+tax\s+payable/i,
        /Tax\s+payable/i
      ],
      fallbackRegexes: [
        /(?:Net\s+)?tax\s+payable\s+([\d,.-]+\.\d{2})/i,
        /Tax Payable\s+([\d,.-]+\.\d{2})/i
      ],
      numericTokenIndex: -1
    }
  }
};
