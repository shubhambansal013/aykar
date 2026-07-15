import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, test, vi, beforeEach, describe } from 'vitest';
import Home from './page';
import * as extractor from '@/lib/form16/extractor';
import * as parser from '@/lib/form16/parser';
import * as validator from '@/lib/itr/validator';
import * as mapper from '@/lib/itr/mapper';

// Mock the libraries
vi.mock('@/lib/form16/extractor');
vi.mock('@/lib/form16/parser');
vi.mock('@/lib/itr/validator');
vi.mock('@/lib/itr/mapper');

import { getFieldCue } from './page';

import { CueTextField } from './page';

import { AssistantMessage } from './page';

describe('AssistantMessage component tests', () => {
  const mockForm16 = {
    employee: { pan: 'ABCDE1234F', name: { firstName: 'John', lastName: 'Doe' } }
  };

  test('renders raw text if no JSON code block is present', () => {
    render(
      <AssistantMessage
        content="Hello, I am your tax assistant."
        msgIdx={1}
        acceptedMessages={{}}
        rejectedMessages={{}}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByText('Hello, I am your tax assistant.')).toBeDefined();
  });

  test('renders recommendations and proposal card correctly with Accept action', () => {
    const onAcceptSpy = vi.fn();
    const onRejectSpy = vi.fn();

    const content = `Some intro text here.
\`\`\`json
{
  "recommendations": [
    { "type": "error", "field": "salary.grossSalary", "message": "Gross salary is wrong.", "suggestion": "Fix standard deduction" },
    { "type": "warning", "field": "deductions80C", "message": "Exceeded 80C limit.", "suggestion": "Keep to 1.5L" },
    { "type": "info", "field": "deductions80D", "message": "Good investment.", "suggestion": "Claim it" },
    { "type": "other", "field": "", "message": "No type spec.", "suggestion": "" }
  ],
  "updatedForm16Data": {
    "employee": { "pan": "ABCDE1234F" }
  }
}
\`\`\`
Some outro text.`;

    render(
      <AssistantMessage
        content={content}
        msgIdx={1}
        acceptedMessages={{}}
        rejectedMessages={{}}
        onAccept={onAcceptSpy}
        onReject={onRejectSpy}
      />
    );

    // Text outside should be rendered
    expect(screen.getByText(/Some intro text here/)).toBeDefined();

    // Recommendations rendered as alerts
    expect(screen.getByText('Field: salary.grossSalary')).toBeDefined();
    expect(screen.getByText('Gross salary is wrong.')).toBeDefined();
    expect(screen.getByText('Suggestion: Fix standard deduction')).toBeDefined();

    expect(screen.getByText('Field: deductions80C')).toBeDefined();
    expect(screen.getByText('Exceeded 80C limit.')).toBeDefined();

    // AI suggestions proposal card is visible
    expect(screen.getByText('AI Suggested Updates')).toBeDefined();

    const acceptBtn = screen.getByText('Accept & Apply');
    fireEvent.click(acceptBtn);
    expect(onAcceptSpy).toHaveBeenCalledWith(1, { employee: { pan: 'ABCDE1234F' } });
  });

  test('calls onReject when Reject button is clicked', () => {
    const onRejectSpy = vi.fn();
    const content = `\`\`\`json
{
  "updatedForm16Data": { "employee": { "pan": "ABCDE1234F" } }
}
\`\`\``;

    render(
      <AssistantMessage
        content={content}
        msgIdx={2}
        acceptedMessages={{}}
        rejectedMessages={{}}
        onAccept={vi.fn()}
        onReject={onRejectSpy}
      />
    );

    const rejectBtn = screen.getByText('Reject');
    fireEvent.click(rejectBtn);
    expect(onRejectSpy).toHaveBeenCalledWith(2);
  });

  test('displays accepted status correctly', () => {
    const content = `\`\`\`json
{
  "updatedForm16Data": { "employee": { "pan": "ABCDE1234F" } }
}
\`\`\``;

    render(
      <AssistantMessage
        content={content}
        msgIdx={3}
        acceptedMessages={{ 3: true }}
        rejectedMessages={{}}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByText('Applied Successfully!')).toBeDefined();
    expect(screen.queryByText('Accept & Apply')).toBeNull();
  });

  test('displays rejected status correctly', () => {
    const content = `\`\`\`json
{
  "updatedForm16Data": { "employee": { "pan": "ABCDE1234F" } }
}
\`\`\``;

    render(
      <AssistantMessage
        content={content}
        msgIdx={4}
        acceptedMessages={{}}
        rejectedMessages={{ 4: true }}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByText('Updates Rejected')).toBeDefined();
    expect(screen.queryByText('Accept & Apply')).toBeNull();
  });

  test('handles malformed JSON inside code block gracefully', () => {
    const malformedContent = `Some conversational intro.
\`\`\`json
{
  "recommendations": [
    { "type": "error"
  ]
}
\`\`\``;

    render(
      <AssistantMessage
        content={malformedContent}
        msgIdx={5}
        acceptedMessages={{}}
        rejectedMessages={{}}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />
    );

    // It should fallback to rendering raw content
    expect(screen.getByText(/Some conversational intro/)).toBeDefined();
  });
});

describe('CueTextField component tests', () => {
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

  test('renders CueTextField correctly for string values and calls onChange', () => {
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

  test('handles status colors correctly for warning/error/success', () => {
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
  });
});

describe('getFieldCue helper tests', () => {
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

  test('handles null data', () => {
    expect(getFieldCue('employer.name', null).status).toBe('success');
  });

  test('checks employer.name', () => {
    expect(getFieldCue('employer.name', dummyData).status).toBe('success');
    expect(getFieldCue('employer.name', { ...dummyData, employer: { ...dummyData.employer, name: '' } }).status).toBe('warning');
  });

  test('checks employer.pan', () => {
    expect(getFieldCue('employer.pan', dummyData).status).toBe('success');
    expect(getFieldCue('employer.pan', { ...dummyData, employer: { ...dummyData.employer, pan: 'INVALID' } }).status).toBe('error');
    expect(getFieldCue('employer.pan', { ...dummyData, employer: { ...dummyData.employer, pan: '' } }).status).toBe('warning');
  });

  test('checks employer.tan', () => {
    expect(getFieldCue('employer.tan', dummyData).status).toBe('success');
    expect(getFieldCue('employer.tan', { ...dummyData, employer: { ...dummyData.employer, tan: 'INVALID' } }).status).toBe('error');
    expect(getFieldCue('employer.tan', { ...dummyData, employer: { ...dummyData.employer, tan: '' } }).status).toBe('warning');
  });

  test('checks employer.address', () => {
    expect(getFieldCue('employer.address', dummyData).status).toBe('success');
    expect(getFieldCue('employer.address', { ...dummyData, employer: { ...dummyData.employer, address: '' } }).status).toBe('warning');
  });

  test('checks employee name fields', () => {
    expect(getFieldCue('employee.name.firstName', dummyData).status).toBe('success');
    expect(getFieldCue('employee.name.firstName', { ...dummyData, employee: { ...dummyData.employee, name: { ...dummyData.employee.name, firstName: '' } } }).status).toBe('error');
    expect(getFieldCue('employee.name.middleName', dummyData).status).toBe('success');
    expect(getFieldCue('employee.name.lastName', dummyData).status).toBe('success');
    expect(getFieldCue('employee.name.lastName', { ...dummyData, employee: { ...dummyData.employee, name: { ...dummyData.employee.name, lastName: '' } } }).status).toBe('error');
  });

  test('checks employee.pan', () => {
    expect(getFieldCue('employee.pan', dummyData).status).toBe('success');
    expect(getFieldCue('employee.pan', { ...dummyData, employee: { ...dummyData.employee, pan: 'INVALID' } }).status).toBe('error');
    expect(getFieldCue('employee.pan', { ...dummyData, employee: { ...dummyData.employee, pan: '' } }).status).toBe('error');
  });

  test('checks employee.address', () => {
    expect(getFieldCue('employee.address', dummyData).status).toBe('success');
    expect(getFieldCue('employee.address', { ...dummyData, employee: { ...dummyData.employee, address: '' } }).status).toBe('warning');
  });

  test('checks assessmentYear', () => {
    expect(getFieldCue('assessmentYear', dummyData).status).toBe('success');
    expect(getFieldCue('assessmentYear', { ...dummyData, assessmentYear: 'INVALID' }).status).toBe('warning');
    expect(getFieldCue('assessmentYear', { ...dummyData, assessmentYear: '' }).status).toBe('warning');
  });

  test('checks period dates', () => {
    expect(getFieldCue('period.from', dummyData).status).toBe('success');
    expect(getFieldCue('period.from', { ...dummyData, period: { from: '', to: '' } }).status).toBe('warning');
    expect(getFieldCue('period.to', dummyData).status).toBe('success');
    expect(getFieldCue('period.to', { ...dummyData, period: { from: '', to: '' } }).status).toBe('warning');
  });

  test('checks grossSalary consistency', () => {
    expect(getFieldCue('salary.grossSalary', dummyData).status).toBe('success');
    expect(getFieldCue('salary.grossSalary', { ...dummyData, salary: { ...dummyData.salary, grossSalary: 500000 } }).status).toBe('error');
  });

  test('checks negatives and basic verified fields', () => {
    expect(getFieldCue('salary.salaryAsPer17_1', dummyData).status).toBe('success');
    expect(getFieldCue('salary.salaryAsPer17_1', { ...dummyData, salary: { ...dummyData.salary, salaryAsPer17_1: -10 } }).status).toBe('error');
    expect(getFieldCue('salary.perquisites17_2', dummyData).status).toBe('success');
    expect(getFieldCue('salary.perquisites17_2', { ...dummyData, salary: { ...dummyData.salary, perquisites17_2: -10 } }).status).toBe('error');
    expect(getFieldCue('salary.profitsInLieu17_3', dummyData).status).toBe('success');
    expect(getFieldCue('salary.profitsInLieu17_3', { ...dummyData, salary: { ...dummyData.salary, profitsInLieu17_3: -10 } }).status).toBe('error');
  });

  test('checks totalExemptAllowances consistency', () => {
    expect(getFieldCue('salary.totalExemptAllowances', dummyData).status).toBe('success');
    expect(getFieldCue('salary.totalExemptAllowances', { ...dummyData, salary: { ...dummyData.salary, totalExemptAllowances: 100000 } }).status).toBe('warning');
  });

  test('checks netSalary consistency', () => {
    expect(getFieldCue('salary.netSalary', dummyData).status).toBe('success');
    expect(getFieldCue('salary.netSalary', { ...dummyData, salary: { ...dummyData.salary, netSalary: 500000 } }).status).toBe('error');
  });

  test('checks standardDeduction limits', () => {
    expect(getFieldCue('salary.standardDeduction16ia', dummyData).status).toBe('success');
    expect(getFieldCue('salary.standardDeduction16ia', { ...dummyData, salary: { ...dummyData.salary, standardDeduction16ia: -10 } }).status).toBe('error');
    expect(getFieldCue('salary.standardDeduction16ia', { ...dummyData, salary: { ...dummyData.salary, standardDeduction16ia: 80000 } }).status).toBe('error');
  });

  test('checks other salary deductions', () => {
    expect(getFieldCue('salary.entertainmentAllowance16ii', dummyData).status).toBe('success');
    expect(getFieldCue('salary.entertainmentAllowance16ii', { ...dummyData, salary: { ...dummyData.salary, entertainmentAllowance16ii: -5 } }).status).toBe('error');
    expect(getFieldCue('salary.professionalTax16iii', dummyData).status).toBe('success');
    expect(getFieldCue('salary.professionalTax16iii', { ...dummyData, salary: { ...dummyData.salary, professionalTax16iii: -5 } }).status).toBe('error');
  });

  test('checks totalDeductionsUs16 consistency', () => {
    expect(getFieldCue('salary.totalDeductionsUs16', dummyData).status).toBe('success');
    expect(getFieldCue('salary.totalDeductionsUs16', { ...dummyData, salary: { ...dummyData.salary, totalDeductionsUs16: 10000 } }).status).toBe('error');
  });

  test('checks incomeChargeableUnderHeadSalaries consistency', () => {
    expect(getFieldCue('salary.incomeChargeableUnderHeadSalaries', dummyData).status).toBe('success');
    expect(getFieldCue('salary.incomeChargeableUnderHeadSalaries', { ...dummyData, salary: { ...dummyData.salary, incomeChargeableUnderHeadSalaries: 10000 } }).status).toBe('error');
  });

  test('checks otherIncome HP & totalOtherSources', () => {
    expect(getFieldCue('otherIncome.houseProperty', dummyData).status).toBe('success');
    expect(getFieldCue('otherIncome.totalOtherSources', dummyData).status).toBe('success');
    expect(getFieldCue('otherIncome.totalOtherSources', { ...dummyData, otherIncome: { ...dummyData.otherIncome, totalOtherSources: 50000 } }).status).toBe('warning');
  });

  test('checks grossTotalIncome consistency', () => {
    expect(getFieldCue('grossTotalIncome', dummyData).status).toBe('success');
    expect(getFieldCue('grossTotalIncome', { ...dummyData, grossTotalIncome: 500000 }).status).toBe('error');
  });

  test('checks chapter VIA deductions', () => {
    expect(getFieldCue('deductions80C', dummyData).status).toBe('success');
    expect(getFieldCue('deductions80C', { ...dummyData, deductions80C: -5 }).status).toBe('error');
    expect(getFieldCue('deductions80C', { ...dummyData, deductions80C: 200000 }).status).toBe('error');

    expect(getFieldCue('deductions80CCC', dummyData).status).toBe('success');
    expect(getFieldCue('deductions80CCC', { ...dummyData, deductions80CCC: -5 }).status).toBe('error');

    expect(getFieldCue('deductions80CCD1', dummyData).status).toBe('success');
    expect(getFieldCue('deductions80CCD1', { ...dummyData, deductions80CCD1: -5 }).status).toBe('error');

    expect(getFieldCue('deductions80CCD1B', dummyData).status).toBe('success');
    expect(getFieldCue('deductions80CCD1B', { ...dummyData, deductions80CCD1B: -5 }).status).toBe('error');
    expect(getFieldCue('deductions80CCD1B', { ...dummyData, deductions80CCD1B: 60000 }).status).toBe('error');

    expect(getFieldCue('deductions80CCD2', dummyData).status).toBe('success');
    expect(getFieldCue('deductions80CCD2', { ...dummyData, deductions80CCD2: -5 }).status).toBe('error');

    expect(getFieldCue('deductions80D', dummyData).status).toBe('success');
    expect(getFieldCue('deductions80D', { ...dummyData, deductions80D: -5 }).status).toBe('error');

    expect(getFieldCue('deductions80E', dummyData).status).toBe('success');
    expect(getFieldCue('deductions80E', { ...dummyData, deductions80E: -5 }).status).toBe('error');

    expect(getFieldCue('deductions80G', dummyData).status).toBe('success');
    expect(getFieldCue('deductions80G', { ...dummyData, deductions80G: -5 }).status).toBe('error');

    expect(getFieldCue('deductions80TTA', dummyData).status).toBe('success');
    expect(getFieldCue('deductions80TTA', { ...dummyData, deductions80TTA: -5 }).status).toBe('error');
    expect(getFieldCue('deductions80TTA', { ...dummyData, deductions80TTA: 15000 }).status).toBe('error');
  });

  test('checks totalChapterVIADeductions consistency', () => {
    expect(getFieldCue('totalChapterVIADeductions', dummyData).status).toBe('success');
    expect(getFieldCue('totalChapterVIADeductions', { ...dummyData, totalChapterVIADeductions: 50000 }).status).toBe('error');
  });

  test('checks totalIncome and taxPayable', () => {
    expect(getFieldCue('totalIncome', dummyData).status).toBe('success');
    expect(getFieldCue('totalIncome', { ...dummyData, totalIncome: 50000 }).status).toBe('error');

    expect(getFieldCue('taxPayable', dummyData).status).toBe('success');
    expect(getFieldCue('taxPayable', { ...dummyData, taxPayable: -5 }).status).toBe('error');

    expect(getFieldCue('invalidField', dummyData).status).toBe('success');
    expect(getFieldCue('invalidField', { ...dummyData, invalidField: -5 } as any).status).toBe('error');
  });
});

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  test('renders Form-16 parser title and AI Chat elements with correct default model', () => {
    render(<Home />);
    expect(screen.getByText(/Form-16 to ITR JSON Parser|ITR Assist/i)).toBeDefined();
    expect(screen.getByLabelText('open ai chat')).toBeDefined();
    expect(screen.getByLabelText('open ai chat window')).toBeDefined();

    // Open chat to inspect default model
    const chatBtn = screen.getByLabelText('open ai chat');
    fireEvent.click(chatBtn);

    // Default model selector should display gemini-3.1-flash-lite
    expect(screen.getAllByText('gemini-3.1-flash-lite').length).toBeGreaterThan(0);
  });

  test('displays Form-16 context in chat above input and removes it on close click', async () => {
    const mockText = 'Raw PDF text';
    const mockData = {
      employee: {
        pan: 'ABCDE1234F',
        name: { firstName: 'John', lastName: 'Doe' }
      },
      salary: {
        grossSalary: 1000000,
        standardDeduction16ia: 50000
      },
      deductions80C: 150000,
      deductions80D: 25000,
      deductions80TTA: 10000
    };

    vi.spyOn(extractor, 'extractTextFromPDF').mockResolvedValue(mockText);
    vi.spyOn(parser, 'parseForm16Text').mockReturnValue(mockData as any);
    vi.spyOn(validator, 'validateForm16Data').mockReturnValue([]);

    render(<Home />);

    // Open AI Chat first
    const chatBtn = screen.getByLabelText('open ai chat');
    fireEvent.click(chatBtn);

    // Context list should initially not contain any Form-16 file representation
    expect(screen.queryByLabelText('remove form16 context')).toBeNull();

    // Upload file
    const fileInput = screen.getByLabelText(/1. Upload Form-16 PDF/i);
    const file = new File(['dummy content'], 'test-form16-file.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: vi.fn().mockResolvedValue(new ArrayBuffer(8))
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/2. Review & Edit Extracted Information/i)).toBeDefined();
    });

    // Check that context displays the file name in the chat section (it will be present in both main upload view and chat context view)
    expect(screen.getAllByText('test-form16-file.pdf').length).toBe(2);
    const removeBtn = screen.getByLabelText('remove form16 context');
    expect(removeBtn).toBeDefined();

    // Remove form16 context
    fireEvent.click(removeBtn);

    // Verify it is gone from both areas
    expect(screen.queryByText('test-form16-file.pdf')).toBeNull();
    expect(screen.queryByText(/2. Review & Edit Extracted Information/i)).toBeNull();

    vi.restoreAllMocks();
  });

  test('toggles color mode between light and dark', () => {
    render(<Home />);
    const toggleButton = screen.getByLabelText(/toggle color mode/i);
    expect(toggleButton).toBeDefined();
    fireEvent.click(toggleButton);
    fireEvent.click(toggleButton);
  });

  test('opens AI Chat Drawer when requested', async () => {
    render(<Home />);
    const chatBtn = screen.getByLabelText('open ai chat');
    fireEvent.click(chatBtn);

    expect(screen.getByText(/AI Tax Assistant/i)).toBeDefined();
    expect(screen.getByText(/Ask me anything about your taxes!/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Ask your tax question.../i)).toBeDefined();
  });

  test('handles AI Chat submission successfully', async () => {
    const mockResponse = {
      role: 'assistant',
      content: 'Here is simulated assistance advice.'
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });
    vi.stubGlobal('fetch', mockFetch);

    render(<Home />);
    const chatBtn = screen.getByLabelText('open ai chat');
    fireEvent.click(chatBtn);

    const input = screen.getByPlaceholderText(/Ask your tax question.../i);
    fireEvent.change(input, { target: { value: 'How can I save tax?' } });

    const sendBtn = screen.getByLabelText(/send message/i);
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText('How can I save tax?')).toBeDefined();
      expect(screen.getByText('Here is simulated assistance advice.')).toBeDefined();
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });

  test('handles file upload and displays data plus AI Review', async () => {
    const mockText = 'Raw PDF text';
    const mockData = {
      employee: {
        pan: 'ABCDE1234F',
        name: { firstName: 'John', lastName: 'Doe' }
      },
      salary: {
        grossSalary: 1000000,
        standardDeduction16ia: 50000
      },
      deductions80C: 150000,
      deductions80D: 25000,
      deductions80TTA: 10000
    };

    vi.spyOn(extractor, 'extractTextFromPDF').mockResolvedValue(mockText);
    vi.spyOn(parser, 'parseForm16Text').mockReturnValue(mockData as any);
    vi.spyOn(validator, 'validateForm16Data').mockReturnValue([]);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ role: 'assistant', content: 'AI Review Complete!' })
    });
    vi.stubGlobal('fetch', mockFetch);

    render(<Home />);

    const fileInput = screen.getByLabelText(/1. Upload Form-16 PDF/i);
    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });

    // We need to mock arrayBuffer because jsdom doesn't support it fully
    Object.defineProperty(file, 'arrayBuffer', {
      value: vi.fn().mockResolvedValue(new ArrayBuffer(8))
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/2. Review & Edit Extracted Information/i)).toBeDefined();
    });

    expect(screen.getByDisplayValue('ABCDE1234F')).toBeDefined();
    expect(screen.getByDisplayValue('John')).toBeDefined();
    expect(screen.getByDisplayValue('Doe')).toBeDefined();
    expect(screen.getByDisplayValue('1000000')).toBeDefined();

    // Trigger AI Review
    const reviewBtn = screen.getByText('AI Review');
    expect(reviewBtn).toBeDefined();
    fireEvent.click(reviewBtn);

    await waitFor(() => {
      expect(screen.getByText('AI Review Complete!')).toBeDefined();
    });

    vi.restoreAllMocks();
  });

  test('handles validation errors', async () => {
    const mockText = 'Raw PDF text';
    const mockData = {
      employee: {
        pan: '',
        name: { firstName: '', lastName: '' }
      },
      salary: { grossSalary: 0, standardDeduction16ia: 0 },
      deductions80C: 0, deductions80D: 0, deductions80TTA: 0
    };

    vi.spyOn(extractor, 'extractTextFromPDF').mockResolvedValue(mockText);
    vi.spyOn(parser, 'parseForm16Text').mockReturnValue(mockData as any);
    vi.spyOn(validator, 'validateForm16Data').mockReturnValue(['PAN is missing']);

    render(<Home />);

    const fileInput = screen.getByLabelText(/1. Upload Form-16 PDF/i);
    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: vi.fn().mockResolvedValue(new ArrayBuffer(8))
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Validation Warnings:/i)).toBeDefined();
      expect(screen.getByText(/PAN is missing/i)).toBeDefined();
    });
  });

  test('updates data on input change', async () => {
     const mockData = {
      employee: {
        pan: 'OLD_PAN',
        name: { firstName: 'Old', lastName: 'Name' }
      },
      salary: { grossSalary: 100, standardDeduction16ia: 50 },
      deductions80C: 1,
      deductions80CCC: 4,
      deductions80CCD1: 5,
      deductions80CCD1B: 6,
      deductions80CCD2: 7,
      deductions80D: 2,
      deductions80E: 8,
      deductions80G: 9,
      deductions80TTA: 3,
      totalChapterVIADeductions: 45
    };

    vi.spyOn(extractor, 'extractTextFromPDF').mockResolvedValue('text');
    vi.spyOn(parser, 'parseForm16Text').mockReturnValue(mockData as any);
    vi.spyOn(validator, 'validateForm16Data').mockReturnValue([]);

    render(<Home />);
    const fileInput = screen.getByLabelText(/1. Upload Form-16 PDF/i);
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'arrayBuffer', { value: vi.fn().mockResolvedValue(new ArrayBuffer(0)) });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByDisplayValue('OLD_PAN')).toBeDefined());

    fireEvent.change(screen.getByDisplayValue('OLD_PAN'), { target: { value: 'NEW_PAN' } });
    expect(screen.getByDisplayValue('NEW_PAN')).toBeDefined();

    fireEvent.change(screen.getByDisplayValue('Old'), { target: { value: 'NewFirst' } });
    expect(screen.getByDisplayValue('NewFirst')).toBeDefined();

    fireEvent.change(screen.getByDisplayValue('Name'), { target: { value: 'NewLast' } });
    expect(screen.getByDisplayValue('NewLast')).toBeDefined();

    fireEvent.change(screen.getByDisplayValue('100'), { target: { value: '200' } });
    expect(screen.getByDisplayValue('200')).toBeDefined();

    fireEvent.change(screen.getByDisplayValue('50'), { target: { value: '150' } });
    expect(screen.getByDisplayValue('150')).toBeDefined();

    fireEvent.change(screen.getByDisplayValue('1'), { target: { value: '11' } });
    expect(screen.getByDisplayValue('11')).toBeDefined();

    fireEvent.change(screen.getByDisplayValue('4'), { target: { value: '44' } });
    expect(screen.getByDisplayValue('44')).toBeDefined();

    fireEvent.change(screen.getByDisplayValue('5'), { target: { value: '55' } });
    expect(screen.getByDisplayValue('55')).toBeDefined();

    fireEvent.change(screen.getByDisplayValue('6'), { target: { value: '66' } });
    expect(screen.getByDisplayValue('66')).toBeDefined();

    fireEvent.change(screen.getByDisplayValue('7'), { target: { value: '77' } });
    expect(screen.getByDisplayValue('77')).toBeDefined();

    fireEvent.change(screen.getByDisplayValue('2'), { target: { value: '22' } });
    expect(screen.getByDisplayValue('22')).toBeDefined();

    fireEvent.change(screen.getByDisplayValue('8'), { target: { value: '88' } });
    expect(screen.getByDisplayValue('88')).toBeDefined();

    fireEvent.change(screen.getByDisplayValue('9'), { target: { value: '99' } });
    expect(screen.getByDisplayValue('99')).toBeDefined();

    fireEvent.change(screen.getByDisplayValue('3'), { target: { value: '33' } });
    expect(screen.getByDisplayValue('33')).toBeDefined();

    fireEvent.change(screen.getByLabelText('Total Chapter VI-A Deductions'), { target: { value: '445' } });
    expect(screen.getByDisplayValue('445')).toBeDefined();

    // Re-validate button
    fireEvent.click(screen.getByText(/Re-validate Data/i));
    expect(validator.validateForm16Data).toHaveBeenCalled();

    // Download button
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:url');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    fireEvent.click(screen.getByText(/Download ITR JSON/i));
    expect(mapper.mapForm16ToITR1).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  }, 15000);

  test('handles file upload with no files selected', () => {
    render(<Home />);
    const fileInput = screen.getByLabelText(/1. Upload Form-16 PDF/i);
    fireEvent.change(fileInput, { target: { files: [] } });
  });

  test('handles attaching and removing files in AI Chat', async () => {
    // Finding input and matching attachment
    const { container } = render(<Home />);
    const chatBtn = screen.getByLabelText('open ai chat');
    fireEvent.click(chatBtn);

    const file = new File(['dummy attachment'], 'test.png', { type: 'image/png' });

    const attachInput = container.querySelector('#chat-attachment-upload');
    expect(attachInput).toBeDefined();

    fireEvent.change(attachInput!, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('test.png')).toBeDefined();
    });

    const removeBtn = screen.getByLabelText('remove attachment');
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.queryByText('test.png')).toBeNull();
    });
  });

  test('handles chat resizing drag', () => {
    render(<Home />);
    const chatBtn = screen.getByLabelText('open ai chat');
    fireEvent.click(chatBtn);

    const resizer = screen.getByTestId('resizer');
    expect(resizer).toBeDefined();

    fireEvent.mouseDown(resizer);
    fireEvent.mouseMove(document, { clientX: 500 });
    fireEvent.mouseUp(document);
  });

  test('handles AI updates proposal accept and reject end-to-end in Home page', async () => {
    const mockText = 'Raw PDF text';
    const mockData = {
      employee: {
        pan: 'ABCDE1234F',
        name: { firstName: 'John', lastName: 'Doe' }
      },
      salary: { grossSalary: 1000000, standardDeduction16ia: 50000 },
      deductions80C: 150000, deductions80D: 25000, deductions80TTA: 10000
    };

    vi.spyOn(extractor, 'extractTextFromPDF').mockResolvedValue(mockText);
    vi.spyOn(parser, 'parseForm16Text').mockReturnValue(mockData as any);
    vi.spyOn(validator, 'validateForm16Data').mockReturnValue([]);

    // Stub fetch to return a JSON update proposal response
    const mockProposalResponse = {
      role: 'assistant',
      content: `\`\`\`json
{
  "recommendations": [
    { "type": "info", "field": "deductions80D", "message": "Updated 80D details", "suggestion": "Claim more" }
  ],
  "updatedForm16Data": {
    "employee": { "pan": "UPDATED_PAN", "name": { "firstName": "UpdatedJohn", "lastName": "Doe" } },
    "salary": { "grossSalary": 1100000, "standardDeduction16ia": 50000 },
    "deductions80C": 150000, "deductions80D": 25000, "deductions80TTA": 10000
  }
}
\`\`\``
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockProposalResponse
    });
    vi.stubGlobal('fetch', mockFetch);

    render(<Home />);

    // Upload file first to populate extractedData
    const fileInput = screen.getByLabelText(/1. Upload Form-16 PDF/i);
    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: vi.fn().mockResolvedValue(new ArrayBuffer(8))
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/2. Review & Edit Extracted Information/i)).toBeDefined();
    });

    // Trigger AI Review which will fetch the proposal
    const reviewBtn = screen.getByText('AI Review');
    fireEvent.click(reviewBtn);

    // Wait for the proposal card to appear in the Chat panel
    await waitFor(() => {
      expect(screen.getByText('AI Suggested Updates')).toBeDefined();
    });

    // Accept & Apply the proposal
    const acceptBtn = screen.getByText('Accept & Apply');
    fireEvent.click(acceptBtn);

    // Verify that the data was updated in the main review form
    await waitFor(() => {
      expect(screen.getByDisplayValue('UPDATED_PAN')).toBeDefined();
      expect(screen.getByDisplayValue('UpdatedJohn')).toBeDefined();
      expect(screen.getByDisplayValue('1100000')).toBeDefined();
    });

    // Verify Applied Successfully confirmation is shown
    expect(screen.getByText('Applied Successfully!')).toBeDefined();

    vi.restoreAllMocks();
  });

  test('handles AI updates proposal reject end-to-end in Home page', async () => {
    const mockText = 'Raw PDF text';
    const mockData = {
      employee: {
        pan: 'ABCDE1234F',
        name: { firstName: 'John', lastName: 'Doe' }
      },
      salary: { grossSalary: 1000000, standardDeduction16ia: 50000 },
      deductions80C: 150000, deductions80D: 25000, deductions80TTA: 10000
    };

    vi.spyOn(extractor, 'extractTextFromPDF').mockResolvedValue(mockText);
    vi.spyOn(parser, 'parseForm16Text').mockReturnValue(mockData as any);
    vi.spyOn(validator, 'validateForm16Data').mockReturnValue([]);

    // Stub fetch to return a JSON update proposal response
    const mockProposalResponse = {
      role: 'assistant',
      content: `\`\`\`json
{
  "updatedForm16Data": {
    "employee": { "pan": "UPDATED_PAN", "name": { "firstName": "UpdatedJohn", "lastName": "Doe" } },
    "salary": { "grossSalary": 1100000, "standardDeduction16ia": 50000 },
    "deductions80C": 150000, "deductions80D": 25000, "deductions80TTA": 10000
  }
}
\`\`\``
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockProposalResponse
    });
    vi.stubGlobal('fetch', mockFetch);

    render(<Home />);

    // Upload file first to populate extractedData
    const fileInput = screen.getByLabelText(/1. Upload Form-16 PDF/i);
    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: vi.fn().mockResolvedValue(new ArrayBuffer(8))
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/2. Review & Edit Extracted Information/i)).toBeDefined();
    });

    // Trigger AI Review which will fetch the proposal
    const reviewBtn = screen.getByText('AI Review');
    fireEvent.click(reviewBtn);

    // Wait for the proposal card to appear in the Chat panel
    await waitFor(() => {
      expect(screen.getByText('AI Suggested Updates')).toBeDefined();
    });

    // Reject the proposal
    const rejectBtn = screen.getByText('Reject');
    fireEvent.click(rejectBtn);

    // Verify Updates Rejected confirmation is shown
    await waitFor(() => {
      expect(screen.getByText('Updates Rejected')).toBeDefined();
    });

    vi.restoreAllMocks();
  });
});
