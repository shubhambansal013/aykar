# Form-16 Parser Extraction Configuration

This document provides documentation on the centralized extraction configuration implemented for the Form-16 parser.

The goal of this design is to completely decouple extraction regex patterns, positional anchors, and column preferences from the procedural code. This separation allows human developers to easily understand and fine-tune extraction rules without editing complex parsing pipelines.

---

## Configuration File Location
The configuration resides at:
`src/lib/form16/extractionConfig.ts`

---

## Configuration Structure

The configuration exports an object named `extractionConfig` conforming to the `ExtractionConfig` interface:

### 1. `FieldExtractionRule`
Each parsed numeric field or identifier uses a `FieldExtractionRule`:

```typescript
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
```

---

## Component Details

### A. Basic Info (`basicInfo`)
Handles PAN (Employer/Employee), TAN, Assessment Year, Employer Block, Employee Block, Declarations, and Period mapping.

- **`employerBlock` & `employeeBlock`**: Define boundaries (start and end regexes) to isolate employer and employee text blocks.
- **`employeeDeclarations`**: An ordered list of regexes to detect the employee's name from declarations (e.g., Form 12BB, Form 12BA, or Verification line).

### B. Salary (`salary`)
Handles standard components of Part B of Form-16:
- **`grossSalaryBlock`**: Scopes search for sections 17(1), 17(2), and 17(3).
- **`salaryAsPer17_1`**, **`perquisites17_2`**, **`profitsInLieu17_3`**, **`grossSalary`**: Positional and fallback patterns for the main salary figures.
- **`standardDeduction16ia`**, **`entertainmentAllowance16ii`**, **`professionalTax16iii`**: For Section 16 deductions.

### C. Other Income (`otherIncome`)
Extracts external income:
- **`houseProperty`**: Supports negative values (e.g., house property losses like `-50,000.00`).
- **`totalOtherSources`**: Extract general other income.

### D. Deductions (`deductions`)
Chapter VI-A deductions are parsed by isolating the deductions block using `chapterVIABlock` and extracting specific sections:
- **Sections**: `80C`, `80CCC`, `80CCD(1)`, `80CCD(1B)`, `80CCD(2)`, `80D`, `80E`, `80G`, `80TTA`.
- Uses `numericTokenIndex: -1` to capture the *last* number in the matched line, representing the finalized deductible amount, while ignoring intermediate columns or gross declared values.

### E. Tax Computation (`taxComputation`)
- Extracting totals (`grossTotalIncome`, `totalIncome`, `taxPayable`).
- Includes negative lookbehinds in `totalIncome` line regexes (e.g., `/(?<!Gross\s+)Total\s+Income/i`) to ensure the parser does not incorrectly grab "Gross Total Income" when searching for "Total Income".

---

## How to Modify / Tune Extraction Rules

If the parser fails to extract a field from a new Form-16 format:

1. **Adjust Fallback Regexes**: Add the exact matching pattern from the PDF text to `fallbackRegexes` for the corresponding field.
2. **Add Positional Line Regexes**: Add a unique substring or regex matching that visual line to `lineRegexes`.
3. **Change Column Offset**: If a line contains multiple numbers (e.g., `80C  1,80,000.00  1,50,000.00`), adjust `numericTokenIndex`. Set it to `0` to get the first amount, or `-1` to get the last column amount (typically the qualified deduction).
