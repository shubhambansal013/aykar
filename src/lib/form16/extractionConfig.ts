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

export type DeductionField =
  | 'deduction80C'
  | 'deduction80CCC'
  | 'deduction80CCD1'
  | 'deduction80CCD1B'
  | 'deduction80CCD2'
  | 'deduction80D'
  | 'deduction80E'
  | 'deduction80G'
  | 'deduction80TTA';

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
    corporateKeywords: string[];
    addressKeywords: string[];
    stateNames: string[];
    corporateSuffixes: RegExp[];
    monthNames: Record<string, number>;
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
    standardDeductionCap: number;
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
    letterToField: Record<string, DeductionField>;
  };
  taxComputation: {
    grossTotalIncome: FieldExtractionRule;
    totalIncome: FieldExtractionRule;
    taxPayable: FieldExtractionRule;
    totalTdsDeducted: FieldExtractionRule;
    totalTdsDeposited: FieldExtractionRule;
  };
  formatDetection: {
    detailedKeywords: string[];
    standardKeywords: string[];
  };
  ais: {
    sectionStops: RegExp[];
    savingsPatterns: RegExp[];
    depositPatterns: RegExp[];
    dividendPatterns: RegExp[];
    deductorStopWords: RegExp[];
    cleanLinePatterns: RegExp[];
  };
  tis: {
    salaryPatterns: RegExp[];
    savingsPatterns: RegExp[];
    depositPatterns: RegExp[];
    dividendPatterns: RegExp[];
  };
  form26as: {
    deductorStopWords: RegExp[];
    cleanLinePatterns: RegExp[];
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
      /Name and address of the employee\s*[:\-]\s*([A-Z\s]+?)(?=\s*(?:\r?\n|Permanent|\d|PAN|$))/i,
      /Name,?\s*(?:designation|and|Permanent|Account|Number|or|Aadhaar|\s)*of\s*employee\s*[:\-]\s*([A-Z\s]+?)(?=\s*(?:,|\r?\n|Designation|Software|AROHV|[A-Z]{5}[0-9]{4}[A-Z]|$))/i,
      /Name\s+of\s+the?\s*employee\s*[:\-]\s*([A-Z\s]+?)(?=\s*(?:\r?\n|Designation|Address|PAN|TAN|$))/i,
      /I,\s*([A-Z\s]+?),\s*employee\s+of/i,
      /I,\s*([A-Z\s]+?),\s*(?:son|daughter)\s*of/gi
    ],
    periodSearchKeywords: ['period with'],
    periodFallback: /Period with the employer:\s*From\s+([^\s]+)\s+To\s+([^\s]+)/i,
    corporateKeywords: [
      'LIMITED', 'LTD', 'PRIVATE', 'PVT', 'SERVICES', 'CO', 'CORP',
      'CORPORATION', 'BANK', 'TRUST', 'INDIA', 'INCORPORATED', 'INC',
      'ASSOCIATES', 'OPERATIONS', 'GLOBAL', 'SOLUTIONS', 'TECHNOLOGY',
      'INTERNATIONAL', 'PTE'
    ],
    addressKeywords: [
      'FLOOR', 'TOWERS', 'ROAD', 'BUILDING', 'HOUSE', 'PLOT', 'SECTOR',
      'STREET', 'LANE', 'AVENUE', 'BLOCK', 'FLAT', 'ROOM', 'APARTMENT',
      'WARD', 'NAGAR', 'COLONY', 'SOCIETY', 'VIHAR', 'ENCLAVE', 'GALI',
      'CITY', 'DISTRICT', 'STATE', 'PINCODE', 'COMMISSIONER', 'HOSPITAL',
      'Sector', 'Phase', 'Flat', 'House', 'Room', 'Plot', 'Lane', 'Road',
      'H.No', 'HNo', 'Floor', 'Block', 'Building', 'Bld', 'Apt', 'Apartment',
      'Near', 'Opposite', 'Opp', 'Behind', 'Ward', 'Street', 'Nagar',
      'Colony', 'Society', 'Vihar', 'Enclave', 'Gali', 'City', 'Dist',
      'District', 'State', 'Pin', 'PinCode', 'Haryana', 'Karnataka',
      'Delhi', 'Mumbai', 'Gurgaon', 'Gurugram', 'Bangalore', 'Bengaluru'
    ],
    stateNames: [
      'Telangana', 'Karnataka', 'Haryana', 'Delhi', 'Maharashtra',
      'Tamil Nadu', 'Gujarat', 'Uttar Pradesh', 'West Bengal', 'Rajasthan'
    ],
    corporateSuffixes: [
      /\bPRIVATE LIMITED\b/i,
      /\bPVT\.?\s*LTD\.?\b/i,
      /\bLIMITED\b/i,
      /\bLTD\.?\b/i,
      /\bCO\b/i,
      /\bCORP\b/i,
      /\bCORPORATION\b/i,
      /\bTRUST\b/i,
      /\bBANK\b/i,
      /\bSERVICES\b/i,
    ],
    monthNames: {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    }
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
      start: /Allowances to the extent exempt (?:u\/s|under section) 10/is,
      end: /(?:Total Exempt Allowances|Total amount of exemption claimed under section 10)/is
    },
    exemptAllowancesLines: /Exempt\s+Allowance\s+([0-9a-zA-Z()]+)\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/gi,
    totalExemptAllowances: {
      lineRegexes: [
        /Total\s+Exempt\s+Allowances/i,
        /Total\s+allowances\s+to\s+the\s+extent\s+exempt/i,
        /Total\s+amount\s+of\s+exemption\s+claimed\s+under\s+section\s+10/i
      ],
      fallbackRegexes: [
        /Total\s+Exempt\s+Allowances\s*(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i,
        /Total\s+amount\s+of\s+exemption\s+claimed\s+under\s+section\s+10\s*(?:[^\d-]*)(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i
      ],
      numericTokenIndex: -1
    },
    standardDeductionCap: 75000,
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
        /Total\s+deductions\s+under\s+Chapter\s+VI-A/i,
        /Aggregate\s+of\s+deductible\s+amount\s+under\s+Chapter\s+VI-A/i
      ],
      fallbackRegexes: [
        /Total Chapter VI-A Deductions\s+([\d,.-]+\.\d{2})/i,
        /Aggregate\s+of\s+deductible\s+amount\s+under\s+Chapter\s+VI-A\s*(?:[^\d-]*)(-?\s*\d+(?:,\s*\d+)*\.\d{2})/i
      ],
      numericTokenIndex: -1
    },
    letterToField: {
      'a': 'deduction80C',
      'b': 'deduction80CCC',
      'c': 'deduction80CCD1',
      'e': 'deduction80CCD1B',
      'f': 'deduction80CCD2',
      'g': 'deduction80D',
      'h': 'deduction80E',
      'k': 'deduction80G',
      'l': 'deduction80TTA',
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
        /(?<!Gross\s+|on\s+)Total\s+(?:taxable\s+)?Income/i,
        /(?:^|[^so])\s+Total\s+(?:taxable\s+)?Income/i
      ],
      fallbackRegexes: [
        /(?<!on\s+)Total\s+(?:taxable\s+)?Income\s+([\d,.-]+\.\d{2})/i
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
    },
    totalTdsDeducted: {
      lineRegexes: [
        /Total\s*\(Rs\.\)/i,
      ],
      fallbackRegexes: [
        /(?:Total\s+)?(?:tax|TDS)\s+deducted\s+(?:at\s+source)?\s*[:\-.]?\s*([\d,.-]+\.\d{2})/i,
      ],
      numericTokenIndex: 1,
    },
    totalTdsDeposited: {
      lineRegexes: [
        /Total\s*\(Rs\.\)/i,
      ],
      fallbackRegexes: [
        /(?:Total\s+)?(?:tax|TDS)\s+deposited\s*[:\-.]?\s*([\d,.-]+\.\d{2})/i,
      ],
      numericTokenIndex: 2,
    }
  },
  formatDetection: {
    detailedKeywords: [
      'FORM NO. 12BA',
      'DETAILS OF TAX DEDUCTED AND DEPOSITED',
      'CIT (TDS)',
      'Certificate No',
      'Quarter(s)',
      'Challan Identification Number',
    ],
    standardKeywords: [
      'Gross Salary',
      'Deductions under section 16',
      'Tax payable',
      'Income chargeable under the head "Salaries"',
    ],
  },
  ais: {
    sectionStops: [
      /^\s*Interest\s+from\s+deposit/i,
      /^\s*Sale\s+of\s+securities/i,
      /^\s*Purchase\s+of\s+securities/i,
      /^\s*Dividend/i,
      /^\s*Part\s+B\d/i,
      /^\s*Salary\s*$/i,
    ],
    savingsPatterns: [
      /Interest\s+from\s+savings\s+bank/i,
      /Savings\s+bank\s+interest/i,
    ],
    depositPatterns: [
      /Interest\s+on\s+deposits?/i,
      /Deposit\s+interest/i,
      /Interest\s+from\s+deposits?/i,
      /Interest\s+on\s+time\s+deposit/i,
    ],
    dividendPatterns: [
      /Dividend\s+Income/i,
      /\bDividend\b/i,
    ],
    deductorStopWords: [
      /Download\s+ID/i,
      /Generation\s+Date/i,
      /^\s*PAN\s+Name\s+Financial\s+Year/i,
      /^\s*[A-Z]{5}\d{4}[A-Z]\s+[A-Z\s]+\s+\d{4}-\d{2}/i,
      /SR\.\s+DATE\s+OF\s+SALE/i,
      /NO\.\s+TRANSFER\s+CLASS/i,
      /^\s*VALUE\s*$/i,
    ],
    cleanLinePatterns: [
      /\b(19\d[A-Z]*|206[A-Z]*)\b/gi,
      /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g,
      /-?\s*\d[\d,]*\.\d{2}/g,
      /\b[FUO]\b/g,
      /\b(S\.No|Sl\.No|Section|Date|Status|Booking|Amt|Amount|Paid|Credited|Tax|Deducted|Deposited|TDS|TCS|Total|Challan|BSR|Code|Page|Annual|Statement)\b/gi,
      /\b(PART\s+[A-Z])\b/gi,
    ],
  },
  tis: {
    salaryPatterns: [/Salary/i],
    savingsPatterns: [
      /Interest\s+from\s+savings\s+bank/i,
      /Savings\s+bank\s+interest/i,
    ],
    depositPatterns: [
      /Interest\s+on\s+deposits?/i,
      /Deposit\s+interest/i,
      /Interest\s+from\s+deposits?/i,
    ],
    dividendPatterns: [
      /Dividend\s+Income/i,
      /\bDividend\b/i,
    ],
  },
  form26as: {
    deductorStopWords: [
      /Download\s+ID/i,
      /Generation\s+Date/i,
      /^\s*PAN\s+Name\s+Financial\s+Year/i,
      /^\s*[A-Z]{5}\d{4}[A-Z]\s+[A-Z\s]+\s+\d{4}-\d{2}/i,
      /SR\.\s+DATE\s+OF\s+SALE/i,
      /NO\.\s+TRANSFER\s+CLASS/i,
      /^\s*VALUE\s*$/i,
    ],
    cleanLinePatterns: [
      /\b(19\d[A-Z]*|206[A-Z]*)\b/gi,
      /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g,
      /-?\s*\d[\d,]*\.\d{2}/g,
      /\b[FUO]\b/g,
      /\b(S\.No|Sl\.No|Section|Date|Status|Booking|Amt|Amount|Paid|Credited|Tax|Deducted|Deposited|TDS|TCS|Total|Challan|BSR|Code|Page|Annual|Statement)\b/gi,
      /\b(PART\s+[A-Z])\b/gi,
    ],
  },
};
