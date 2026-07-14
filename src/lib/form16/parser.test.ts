import { describe, it, expect } from 'vitest';
import { parseForm16Text } from './parser';

describe('parseForm16Text', () => {
  it('should extract PAN and basic salary components', () => {
    const mockText = `
      PAN OF THE EMPLOYEE ABCDE1234F
      Assessment Year 2026-27
      Gross Salary 1,200,000.00
      Salary as per section 17(1) 1,100,000.00
      Standard deduction u/s 16(ia) 75,000.00
      TAN OF THE DEDUCTOR ABCD12345E
      80C 150,000.00
    `;
    const result = parseForm16Text(mockText);
    expect(result.employee.pan).toBe('ABCDE1234F');
    expect(result.employer.tan).toBe('ABCD12345E');
    expect(result.salary.grossSalary).toBe(1200000);
    expect(result.salary.standardDeduction16ia).toBe(75000);
    expect(result.deductions80C).toBe(150000);
  });

  it('should handle missing values gracefully', () => {
    const result = parseForm16Text('random text');
    expect(result.salary.grossSalary).toBe(0);
    expect(result.employee.pan).toBe('');
  });
});
