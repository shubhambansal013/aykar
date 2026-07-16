import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, vi, describe } from 'vitest';
import TaxRegimeComparisonCard from './TaxRegimeComparisonCard';

describe('TaxRegimeComparisonCard Unit Tests', () => {
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

  test('renders comparison details correctly and displays optimal recommendation', () => {
    render(
      <TaxRegimeComparisonCard
        extractedData={dummyData}
        selectedRegime="NEW"
        mode="light"
        onSelectRegime={vi.fn()}
      />
    );

    expect(screen.getByText('Tax Regime Comparison & Selection')).toBeDefined();
    expect(screen.getByTestId('tax-comparison-card')).toBeDefined();
    expect(screen.getByTestId('efficiency-badge')).toBeDefined();
    expect(screen.getAllByText('Old Tax Regime').length).toBeGreaterThan(0);
    expect(screen.getAllByText('New Tax Regime').length).toBeGreaterThan(0);
  });

  test('calls onSelectRegime when Old regime card is clicked', () => {
    const onSelectSpy = vi.fn();
    render(
      <TaxRegimeComparisonCard
        extractedData={dummyData}
        selectedRegime="NEW"
        mode="light"
        onSelectRegime={onSelectSpy}
      />
    );

    const oldRegimeCard = screen.getByTestId('select-old-regime');
    fireEvent.click(oldRegimeCard);
    expect(onSelectSpy).toHaveBeenCalledWith('OLD');
  });

  test('calls onSelectRegime when New regime card is clicked', () => {
    const onSelectSpy = vi.fn();
    render(
      <TaxRegimeComparisonCard
        extractedData={dummyData}
        selectedRegime="OLD"
        mode="light"
        onSelectRegime={onSelectSpy}
      />
    );

    const newRegimeCard = screen.getByTestId('select-new-regime');
    fireEvent.click(newRegimeCard);
    expect(onSelectSpy).toHaveBeenCalledWith('NEW');
  });
});
