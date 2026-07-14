# Form-16 Data Extraction & ITR Mapping Logic

This document explains how the Aykar application extracts data from Form-16 PDFs and maps it to the official Indian Income Tax Return (ITR) JSON format.

## 1. Data Extraction (Form-16 PDF)

The application uses a three-step process to get information from your PDF:

### A. Text Extraction
We use the `pdf.js` library to read the visual text from the PDF pages and convert it into a single long string of searchable text.

### B. Pattern Matching (Regex)
We use "Regular Expressions" (Regex) to find specific keywords and the numbers next to them. For example:
- **PAN Detection:** We look for 10-character patterns like `[A-Z]{5}[0-9]{4}[A-Z]` near the phrase "PAN OF THE EMPLOYEE".
- **Salary Detection:** We look for labels like "Gross Salary" or "Salary as per section 17(1)" and capture the currency amount appearing immediately after them.

### C. Heuristic Parsing
Since different employers might have slightly different Form-16 layouts, we use heuristics (logical guesses) to find the right data even if the exact wording varies slightly.

## 2. ITR Mapping Logic

Once we have the raw data, we map it to the official ITR-1 JSON schema provided by the Income Tax Department.

| Form-16 Field | ITR-1 JSON Path | Logic/Transformation |
| :--- | :--- | :--- |
| Employee PAN | `ITR.ITR1.PersonalInfo.PAN` | Direct mapping. |
| Gross Salary | `ITR.ITR1.ITR1_IncomeDeductions.GrossSalary` | Sum of 17(1), 17(2), and 17(3). |
| Standard Deduction | `ITR.ITR1.ITR1_IncomeDeductions.DeductionUs16ia` | Capped at ₹75,000 (AY 2026-27). |
| Section 80C | `ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80C` | Capped at ₹1,50,000. |
| Section 80D | `ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80D` | Health insurance premium. |

## 3. Validation Rules

The application runs several checks to ensure the data is correct before you download it:
- **PAN Format:** Checks if the PAN follows the standard 5 letters + 4 digits + 1 letter format.
- **Deduction Limits:** Ensures that 80C does not exceed ₹1.5 Lakh and 80TTA does not exceed ₹10,000.
- **Mathematical Consistency:** Checks if the Net Salary minus Deductions actually equals the Taxable Income.

## 4. How to verify
You can use the **Debug Information** section in the portal to see the "Raw Extracted Text". If a number is missing in the review form, check if it exists in the raw text. This helps our technical team improve the extraction patterns.
