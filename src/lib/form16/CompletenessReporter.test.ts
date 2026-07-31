import { describe, it, expect } from 'vitest';
import { CompletenessReporter } from './CompletenessReporter';

describe('CompletenessReporter', () => {
  it('should calculate completeness and confidence score correctly for fully populated data', () => {
    const mockData = {
      employer: { name: 'Acme Corp', tan: 'DELM12345F', pan: 'AABCH1234F' },
      employee: { pan: 'ABJPA1234F' },
      assessmentYear: '2026-27',
      salary: {
        grossSalary: 100000,
        salaryAsPer17_1: 90000,
        standardDeduction16ia: 75000,
        totalDeductionsUs16: 75000,
      },
      totalIncome: 25000,
      taxPayable: 0,
    };

    const report = CompletenessReporter.calculate(mockData);
    expect(report.score).toBe(100);
    expect(report.totalFields).toBe(11);
    expect(report.foundFields).toBe(11);
  });

  it('should handle partially populated data and calculate the right score', () => {
    const mockData = {
      employer: { name: 'Acme Corp' },
      salary: {
        grossSalary: 100000,
      },
    };

    const report = CompletenessReporter.calculate(mockData);
    expect(report.score).toBeLessThan(50);

    const nameStatus = report.fieldStatuses.find(f => f.fieldName === 'Employer Name');
    expect(nameStatus).toBeDefined();
    expect(nameStatus?.found).toBe(true);

    const tanStatus = report.fieldStatuses.find(f => f.fieldName === 'Employer TAN');
    expect(tanStatus).toBeDefined();
    expect(tanStatus?.found).toBe(false);
  });
});
