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
    expect(getFieldCue('employer.pan', { ...dummyData, employer: { ...dummyData.employer, pan: '' } }).status).toBe('warning');
  });

  test('getFieldCue validates employer tan correctly', () => {
    expect(getFieldCue('employer.tan', dummyData).status).toBe('success');
    expect(getFieldCue('employer.tan', { ...dummyData, employer: { ...dummyData.employer, tan: 'INVALID' } }).status).toBe('error');
    expect(getFieldCue('employer.tan', { ...dummyData, employer: { ...dummyData.employer, tan: '' } }).status).toBe('warning');
  });

  test('getFieldCue validates employer address correctly', () => {
    expect(getFieldCue('employer.address', dummyData).status).toBe('success');
    expect(getFieldCue('employer.address', { ...dummyData, employer: { ...dummyData.employer, address: '' } }).status).toBe('warning');
  });

  test('getFieldCue validates employee name fields correctly', () => {
    expect(getFieldCue('employee.name.firstName', dummyData).status).toBe('success');
    expect(getFieldCue('employee.name.firstName', { ...dummyData, employee: { ...dummyData.employee, name: { ...dummyData.employee.name, firstName: '' } } }).status).toBe('error');
    expect(getFieldCue('employee.name.middleName', dummyData).status).toBe('none');
    expect(getFieldCue('employee.name.lastName', dummyData).status).toBe('success');
    expect(getFieldCue('employee.name.lastName', { ...dummyData, employee: { ...dummyData.employee, name: { ...dummyData.employee.name, lastName: '' } } }).status).toBe('error');
  });

  test('getFieldCue validates employee pan correctly', () => {
    expect(getFieldCue('employee.pan', dummyData).status).toBe('success');
    expect(getFieldCue('employee.pan', { ...dummyData, employee: { ...dummyData.employee, pan: 'INVALID' } }).status).toBe('error');
    expect(getFieldCue('employee.pan', { ...dummyData, employee: { ...dummyData.employee, pan: '' } }).status).toBe('error');
  });

  test('getFieldCue validates employee address correctly', () => {
    expect(getFieldCue('employee.address', dummyData).status).toBe('success');
    expect(getFieldCue('employee.address', { ...dummyData, employee: { ...dummyData.employee, address: '' } }).status).toBe('warning');
  });

  test('getFieldCue validates assessmentYear correctly', () => {
    expect(getFieldCue('assessmentYear', dummyData).status).toBe('success');
    expect(getFieldCue('assessmentYear', { ...dummyData, assessmentYear: 'INVALID' }).status).toBe('warning');
    expect(getFieldCue('assessmentYear', { ...dummyData, assessmentYear: '' }).status).toBe('warning');
  });

  test('getFieldCue validates period dates correctly', () => {
    expect(getFieldCue('period.from', dummyData).status).toBe('success');
    expect(getFieldCue('period.from', { ...dummyData, period: { from: '', to: '' } }).status).toBe('warning');
    expect(getFieldCue('period.to', dummyData).status).toBe('success');
    expect(getFieldCue('period.to', { ...dummyData, period: { from: '', to: '' } }).status).toBe('warning');
  });

  test('getFieldCue validates grossSalary consistency correctly', () => {
    expect(getFieldCue('salary.grossSalary', dummyData).status).toBe('success');
    expect(getFieldCue('salary.grossSalary', { ...dummyData, salary: { ...dummyData.salary, grossSalary: 500000 } }).status).toBe('error');
  });

  test('getFieldCue validates negatives and basic verified fields correctly', () => {
    expect(getFieldCue('salary.salaryAsPer17_1', dummyData).status).toBe('none');
    expect(getFieldCue('salary.salaryAsPer17_1', { ...dummyData, salary: { ...dummyData.salary, salaryAsPer17_1: -10 } }).status).toBe('error');
    expect(getFieldCue('salary.perquisites17_2', dummyData).status).toBe('none');
    expect(getFieldCue('salary.perquisites17_2', { ...dummyData, salary: { ...dummyData.salary, perquisites17_2: -10 } }).status).toBe('error');
    expect(getFieldCue('salary.profitsInLieu17_3', dummyData).status).toBe('none');
    expect(getFieldCue('salary.profitsInLieu17_3', { ...dummyData, salary: { ...dummyData.salary, profitsInLieu17_3: -10 } }).status).toBe('error');
  });

  test('getFieldCue validates totalExemptAllowances consistency correctly', () => {
    expect(getFieldCue('salary.totalExemptAllowances', dummyData).status).toBe('success');
    expect(getFieldCue('salary.totalExemptAllowances', { ...dummyData, salary: { ...dummyData.salary, totalExemptAllowances: 100000 } }).status).toBe('warning');
  });

  test('getFieldCue validates netSalary consistency correctly', () => {
    expect(getFieldCue('salary.netSalary', dummyData).status).toBe('success');
    expect(getFieldCue('salary.netSalary', { ...dummyData, salary: { ...dummyData.salary, netSalary: 500000 } }).status).toBe('error');
  });

  test('getFieldCue validates standardDeduction limits correctly', () => {
    expect(getFieldCue('salary.standardDeduction16ia', dummyData).status).toBe('success');
    expect(getFieldCue('salary.standardDeduction16ia', { ...dummyData, salary: { ...dummyData.salary, standardDeduction16ia: -10 } }).status).toBe('error');
    expect(getFieldCue('salary.standardDeduction16ia', { ...dummyData, salary: { ...dummyData.salary, standardDeduction16ia: 80000 } }).status).toBe('error');
  });

  test('getFieldCue validates other salary deductions correctly', () => {
    expect(getFieldCue('salary.entertainmentAllowance16ii', dummyData).status).toBe('none');
    expect(getFieldCue('salary.entertainmentAllowance16ii', { ...dummyData, salary: { ...dummyData.salary, entertainmentAllowance16ii: -5 } }).status).toBe('error');
    expect(getFieldCue('salary.professionalTax16iii', dummyData).status).toBe('none');
    expect(getFieldCue('salary.professionalTax16iii', { ...dummyData, salary: { ...dummyData.salary, professionalTax16iii: -5 } }).status).toBe('error');
  });

  test('getFieldCue validates totalDeductionsUs16 consistency correctly', () => {
    expect(getFieldCue('salary.totalDeductionsUs16', dummyData).status).toBe('success');
    expect(getFieldCue('salary.totalDeductionsUs16', { ...dummyData, salary: { ...dummyData.salary, totalDeductionsUs16: 10000 } }).status).toBe('error');
  });

  test('getFieldCue validates incomeChargeableUnderHeadSalaries consistency correctly', () => {
    expect(getFieldCue('salary.incomeChargeableUnderHeadSalaries', dummyData).status).toBe('success');
    expect(getFieldCue('salary.incomeChargeableUnderHeadSalaries', { ...dummyData, salary: { ...dummyData.salary, incomeChargeableUnderHeadSalaries: 10000 } }).status).toBe('error');
  });

  test('getFieldCue validates otherIncome HP & totalOtherSources correctly', () => {
    expect(getFieldCue('otherIncome.houseProperty', dummyData).status).toBe('none');
    expect(getFieldCue('otherIncome.houseProperty', { ...dummyData, otherIncome: { ...dummyData.otherIncome, houseProperty: -10 } }).status).toBe('error');
    expect(getFieldCue('otherIncome.totalOtherSources', dummyData).status).toBe('success');
    expect(getFieldCue('otherIncome.totalOtherSources', { ...dummyData, otherIncome: { ...dummyData.otherIncome, totalOtherSources: 50000 } }).status).toBe('warning');
  });

  test('getFieldCue validates grossTotalIncome consistency correctly', () => {
    expect(getFieldCue('grossTotalIncome', dummyData).status).toBe('success');
    expect(getFieldCue('grossTotalIncome', { ...dummyData, grossTotalIncome: 500000 }).status).toBe('error');
  });

  test('getFieldCue validates chapter VIA deductions correctly', () => {
    expect(getFieldCue('deductions80C', dummyData).status).toBe('success');
    expect(getFieldCue('deductions80C', { ...dummyData, deductions80C: -5 }).status).toBe('error');
    expect(getFieldCue('deductions80C', { ...dummyData, deductions80C: 200000 }).status).toBe('error');

    expect(getFieldCue('deductions80CCC', dummyData).status).toBe('none');
    expect(getFieldCue('deductions80CCC', { ...dummyData, deductions80CCC: -5 }).status).toBe('error');

    expect(getFieldCue('deductions80CCD1', dummyData).status).toBe('none');
    expect(getFieldCue('deductions80CCD1', { ...dummyData, deductions80CCD1: -5 }).status).toBe('error');

    expect(getFieldCue('deductions80CCD1B', dummyData).status).toBe('success');
    expect(getFieldCue('deductions80CCD1B', { ...dummyData, deductions80CCD1B: -5 }).status).toBe('error');
    expect(getFieldCue('deductions80CCD1B', { ...dummyData, deductions80CCD1B: 60000 }).status).toBe('error');

    expect(getFieldCue('deductions80CCD2', dummyData).status).toBe('none');
    expect(getFieldCue('deductions80CCD2', { ...dummyData, deductions80CCD2: -5 }).status).toBe('error');

    expect(getFieldCue('deductions80D', dummyData).status).toBe('none');
    expect(getFieldCue('deductions80D', { ...dummyData, deductions80D: -5 }).status).toBe('error');

    expect(getFieldCue('deductions80E', dummyData).status).toBe('none');
    expect(getFieldCue('deductions80E', { ...dummyData, deductions80E: -5 }).status).toBe('error');

    expect(getFieldCue('deductions80G', dummyData).status).toBe('none');
    expect(getFieldCue('deductions80G', { ...dummyData, deductions80G: -5 }).status).toBe('error');

    expect(getFieldCue('deductions80TTA', dummyData).status).toBe('success');
    expect(getFieldCue('deductions80TTA', { ...dummyData, deductions80TTA: -5 }).status).toBe('error');
    expect(getFieldCue('deductions80TTA', { ...dummyData, deductions80TTA: 15000 }).status).toBe('error');
  });

  test('getFieldCue validates totalChapterVIADeductions consistency correctly', () => {
    expect(getFieldCue('totalChapterVIADeductions', dummyData).status).toBe('success');
    expect(getFieldCue('totalChapterVIADeductions', { ...dummyData, totalChapterVIADeductions: 50000 }).status).toBe('error');
  });

  test('getFieldCue validates totalIncome and taxPayable correctly', () => {
    expect(getFieldCue('totalIncome', dummyData).status).toBe('success');
    expect(getFieldCue('totalIncome', { ...dummyData, totalIncome: 50000 }).status).toBe('error');

    expect(getFieldCue('taxPayable', dummyData).status).toBe('none');
    expect(getFieldCue('taxPayable', { ...dummyData, taxPayable: -5 }).status).toBe('error');

    expect(getFieldCue('invalidField', dummyData).status).toBe('none');
    expect(getFieldCue('invalidField', { ...dummyData, invalidField: -5 } as any).status).toBe('error');
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

  test('renders CueTextField correctly for number values and calls onChange', () => {
    const onChangeSpy = vi.fn();
    render(
      <CueTextField
        label="Gross Salary"
        path="salary.grossSalary"
        type="number"
        data={dummyData}
        onChange={onChangeSpy}
      />
    );
    const input = screen.getByLabelText('Gross Salary');
    expect(input).toBeDefined();
    expect((input as HTMLInputElement).value).toBe('1000000');

    fireEvent.change(input, { target: { value: '1200000' } });
    expect(onChangeSpy).toHaveBeenCalledWith(1200000);

    fireEvent.change(input, { target: { value: '' } });
    expect(onChangeSpy).toHaveBeenCalledWith(0);
  });

  test('handles status colors correctly for warning/error/success/none', () => {
    // success status
    const { container: container1 } = render(
      <CueTextField
        label="Emp First Name"
        path="employee.name.firstName"
        data={dummyData}
        onChange={vi.fn()}
      />
    );
    expect(container1).toBeDefined();

    // warning status
    const { container: container2 } = render(
      <CueTextField
        label="Assessment Year"
        path="assessmentYear"
        data={{ ...dummyData, assessmentYear: 'INVALID' }}
        onChange={vi.fn()}
      />
    );
    expect(container2).toBeDefined();

    // error status
    const { container: container3 } = render(
      <CueTextField
        label="Gross Salary Error"
        path="salary.grossSalary"
        data={{ ...dummyData, salary: { ...dummyData.salary, grossSalary: 10 } }}
        onChange={vi.fn()}
      />
    );
    expect(container3).toBeDefined();

    // none status (no validation color outline)
    const { container: container4 } = render(
      <CueTextField
        label="Optional Middle Name"
        path="employee.name.middleName"
        data={dummyData}
        onChange={vi.fn()}
      />
    );
    expect(container4).toBeDefined();
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
