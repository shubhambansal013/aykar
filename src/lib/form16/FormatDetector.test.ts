import { describe, it, expect } from 'vitest';
import { FormatDetector } from './FormatDetector';

describe('FormatDetector', () => {
  it('should detect DETAILED_FORM_16 correctly based on characteristics', () => {
    const text = `
      FORM NO. 12BA
      Statement showing particulars of perquisites
      DETAILS OF TAX DEDUCTED AND DEPOSITED
      Employer: THOMSON REUTERS
    `;
    const fp = FormatDetector.detect(text);
    expect(fp.template).toBe('DETAILED_FORM_16');
    expect(fp.confidence).toBeGreaterThan(0.3);
  });

  it('should detect STANDARD_FORM_16 correctly based on standard keywords', () => {
    const text = `
      PART B
      Gross Salary
      Deductions under section 16
      Tax payable
    `;
    const fp = FormatDetector.detect(text);
    expect(fp.template).toBe('STANDARD_FORM_16');
    expect(fp.confidence).toBeGreaterThan(0.5);
  });

  it('should return UNKNOWN for arbitrary text with no characteristics', () => {
    const text = `This is some arbitrary text with no form keywords in it.`;
    const fp = FormatDetector.detect(text);
    expect(fp.template).toBe('UNKNOWN');
    expect(fp.confidence).toBe(0.0);
  });
});
