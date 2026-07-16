import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, vi, describe } from 'vitest';
import SectionAuditTrail from './SectionAuditTrail';

describe('SectionAuditTrail Unit Tests', () => {
  const dummyData = {
    employer: { name: 'Emp Corp', pan: 'AAAPB1234C', tan: 'AAAB12345C', address: '123 Street' },
    employee: { name: { firstName: 'John', middleName: '', lastName: 'Doe' }, pan: 'ABCDE1234F', address: '456 Road' },
    assessmentYear: '2026-27',
    period: { from: '2025-04-01', to: '2026-03-31' },
    salary: {
      grossSalary: 1000000,
      salaryAsPer17_1: 900000,
      perquisites17_2: 100000,
      profitsInLieu17_3: 0,
      exemptAllowancesUs10: [{ amount: 50000 }],
      totalExemptAllowances: 50000,
      netSalary: 950000,
      standardDeduction16ia: 50000,
      entertainmentAllowance16ii: 0,
      professionalTax16iii: 2500,
      totalDeductionsUs16: 52500,
      incomeChargeableUnderHeadSalaries: 897500,
    },
    otherIncome: { houseProperty: 0, otherSources: [{ amount: 1000, nature: 'Interest' }], totalOtherSources: 1000 },
    grossTotalIncome: 898500,
    deductions80C: 150000,
    deductions80CCC: 0,
    deductions80CCD1: 0,
    deductions80CCD1B: 0,
    deductions80CCD2: 0,
    deductions80D: 25000,
    deductions80E: 0,
    deductions80G: 0,
    deductions80TTA: 10000,
    totalChapterVIADeductions: 185000,
    totalIncome: 713500,
    taxPayable: 12500,
  };

  test('returns null when extractedData is null', () => {
    const { container } = render(
      <SectionAuditTrail
        section="salary"
        extractedData={null}
        mode="light"
        selectedRegime="NEW"
        isExpanded={true}
        onToggle={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders collapsed state correctly with trigger button', () => {
    render(
      <SectionAuditTrail
        section="salary"
        extractedData={dummyData}
        mode="light"
        selectedRegime="NEW"
        isExpanded={false}
        onToggle={vi.fn()}
      />
    );
    const btn = screen.getByTestId('toggle-audit-salary');
    expect(btn).toBeDefined();
    expect(btn.textContent).toContain('View Calculation Breakdown ▾');
  });

  test('triggers onToggle on click', () => {
    const onToggleSpy = vi.fn();
    render(
      <SectionAuditTrail
        section="salary"
        extractedData={dummyData}
        mode="light"
        selectedRegime="NEW"
        isExpanded={false}
        onToggle={onToggleSpy}
      />
    );
    const btn = screen.getByTestId('toggle-audit-salary');
    fireEvent.click(btn);
    expect(onToggleSpy).toHaveBeenCalledTimes(1);
  });

  test('renders salary breakdown in expanded state', () => {
    render(
      <SectionAuditTrail
        section="salary"
        extractedData={dummyData}
        mode="light"
        selectedRegime="NEW"
        isExpanded={true}
        onToggle={vi.fn()}
      />
    );
    expect(screen.getByText('SALARY AUDIT TRAIL & BREAKDOWN:')).toBeDefined();
    expect(screen.getByText(/Gross Salary:/)).toBeDefined();
  });

  test('renders other income breakdown in expanded state', () => {
    render(
      <SectionAuditTrail
        section="other"
        extractedData={dummyData}
        mode="light"
        selectedRegime="NEW"
        isExpanded={true}
        onToggle={vi.fn()}
      />
    );
    expect(screen.getByText('OTHER INCOME AUDIT TRAIL & BREAKDOWN:')).toBeDefined();
    expect(screen.getByText(/House Property Income:/)).toBeDefined();
  });

  test('renders deductions breakdown in expanded state', () => {
    render(
      <SectionAuditTrail
        section="deductions"
        extractedData={dummyData}
        mode="light"
        selectedRegime="OLD"
        isExpanded={true}
        onToggle={vi.fn()}
      />
    );
    expect(screen.getByText('CHAPTER VI-A DEDUCTIONS AUDIT TRAIL:')).toBeDefined();
    expect(screen.getByText(/Allowed Deductions:/)).toBeDefined();
  });

  test('renders summary breakdown in expanded state', () => {
    render(
      <SectionAuditTrail
        section="summary"
        extractedData={dummyData}
        mode="light"
        selectedRegime="NEW"
        isExpanded={true}
        onToggle={vi.fn()}
      />
    );
    expect(screen.getByText('TAX COMPUTATION & REFUND BREAKDOWN:')).toBeDefined();
    expect(screen.getByText(/Balance Tax Payable Calculation:/)).toBeDefined();
  });
});
