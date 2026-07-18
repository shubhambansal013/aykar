import { describe, it, expect } from 'vitest';
import { NormalizedIntermediateForm } from './NormalizedIntermediateForm';

describe('NormalizedIntermediateForm', () => {
  it('should reconstruct lines and search fuzzy values near labels correctly', () => {
    const mockPageItems = [
      { str: 'Gross Salary (as per Sec 17(1))', transform: [1, 0, 0, 1, 100, 500], width: 10, height: 10 },
      { str: '1,50,000.00', transform: [1, 0, 0, 1, 400, 500], width: 10, height: 10 },
    ];

    const form = NormalizedIntermediateForm.fromPdfContent([mockPageItems]);
    expect(form.pages.length).toBe(1);
    expect(form.pages[0].lines[0]).toContain('Gross Salary');
    expect(form.pages[0].lines[0]).toContain('1,50,000.00');

    const matchedNumber = form.findNumberNearLabel('Gross Salary');
    expect(matchedNumber).toBe(150000.00);
  });

  it('should search text next to labels correctly', () => {
    const mockPageItems = [
      { str: 'Employee PAN:', transform: [1, 0, 0, 1, 100, 500], width: 10, height: 10 },
      { str: 'ABCDE1234F', transform: [1, 0, 0, 1, 200, 500], width: 10, height: 10 },
    ];

    const form = NormalizedIntermediateForm.fromPdfContent([mockPageItems]);
    const pan = form.findTextNearLabel('Employee PAN', 'right');
    expect(pan).toBe('ABCDE1234F');
  });
});
