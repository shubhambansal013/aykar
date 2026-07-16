import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, vi, describe } from 'vitest';
import { getFieldCue, CueTextField } from './FieldCues';

describe('FieldCues Unit Tests', () => {
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

  test('getFieldCue handles null data', () => {
    expect(getFieldCue('employer.name', null).status).toBe('none');
  });

  test('getFieldCue validates employer name correctly', () => {
    expect(getFieldCue('employer.name', dummyData).status).toBe('success');
    expect(getFieldCue('employer.name', { ...dummyData, employer: { ...dummyData.employer, name: '' } }).status).toBe('warning');
  });

  test('getFieldCue validates employer pan correctly', () => {
    expect(getFieldCue('employer.pan', dummyData).status).toBe('success');
    expect(getFieldCue('employer.pan', { ...dummyData, employer: { ...dummyData.employer, pan: 'INVALID' } }).status).toBe('error');
  });

  test('getFieldCue validates assessmentYear correctly', () => {
    expect(getFieldCue('assessmentYear', dummyData).status).toBe('success');
    expect(getFieldCue('assessmentYear', { ...dummyData, assessmentYear: 'INVALID' }).status).toBe('warning');
  });

  test('renders CueTextField correctly and calls onChange', () => {
    const onChangeSpy = vi.fn();
    render(
      <CueTextField
        label="Employee First Name"
        path="employee.name.firstName"
        data={dummyData}
        onChange={onChangeSpy}
      />
    );
    const input = screen.getByLabelText('Employee First Name');
    expect(input).toBeDefined();
    expect((input as HTMLInputElement).value).toBe('John');

    fireEvent.change(input, { target: { value: 'Jane' } });
    expect(onChangeSpy).toHaveBeenCalledWith('Jane');
  });

  test('CueTextField renders AI Spark icon and no recommendation text string when AI suggestion is applied', () => {
    const onChangeSpy = vi.fn();
    const updatedData = {
      ...dummyData,
      salary: {
        ...dummyData.salary,
        grossSalary: 1100000,
      },
    };
    const originalData = { ...dummyData };
    const appliedAiSuggestions = { ...updatedData };

    render(
      <CueTextField
        label="Gross Salary"
        path="salary.grossSalary"
        data={updatedData}
        originalData={originalData}
        appliedAiSuggestions={appliedAiSuggestions}
        onChange={onChangeSpy}
      />
    );

    // Should NOT contain the text string
    expect(screen.queryByText('Applied from AI recommendation')).toBeNull();

    // Should contain the ✨ Spark icon
    const spark = screen.getByText('✨');
    expect(spark).toBeDefined();
  });

  test('CueTextField renders side-by-side comparison text when grossSalary discrepancy is present', () => {
    const onChangeSpy = vi.fn();
    const discrepancyData = {
      ...dummyData,
      salary: {
        ...dummyData.salary,
        grossSalary: 1000000,
      },
      tisData: {
        salaryDerived: 1200000,
        interestSavings: 0,
        interestDeposit: 0,
        dividendIncome: 0,
      },
    };

    render(
      <CueTextField
        label="Gross Salary"
        path="salary.grossSalary"
        data={discrepancyData}
        onChange={onChangeSpy}
      />
    );

    // Should display the ⚠️ Form-16 vs TIS side-by-side comparison text
    const comparisonElement = screen.getByText(/Form-16: ₹10,00,000 vs TIS: ₹12,00,000/);
    expect(comparisonElement).toBeDefined();
  });
});
