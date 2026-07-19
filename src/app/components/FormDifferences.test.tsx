import { expect, test, describe } from 'vitest';
import { getForm16Differences } from './FormDifferences';

describe('FormDifferences Unit Tests', () => {
  test('returns empty array if no updated data is passed', () => {
    const diffs = getForm16Differences({ assessmentYear: '2026-27' }, null);
    expect(diffs).toEqual([]);
  });

  test('identifies assessmentYear differences correctly', () => {
    const current = { assessmentYear: '2025-26' };
    const updated = { assessmentYear: '2026-27' };
    const diffs = getForm16Differences(current, updated);
    expect(diffs).toEqual([
      { path: 'assessmentYear', label: 'Assessment Year', oldVal: '2025-26', newVal: '2026-27' }
    ]);
  });

  test('ignores equivalent empty values or zeros', () => {
    const current = { assessmentYear: '', salary: { grossSalary: 0 } };
    const updated = { assessmentYear: undefined, salary: { grossSalary: null } };
    const diffs = getForm16Differences(current, updated);
    expect(diffs).toEqual([]);
  });
});
