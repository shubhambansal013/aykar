import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, test, vi, beforeEach, describe, it } from 'vitest';
import Home from './page';
import * as extractor from '@/lib/form16/extractor';
import * as parser from '@/lib/form16/parser';
import * as validator from '@/lib/itr/validator';
import * as mapper from '@/lib/itr/mapper';

// Mock the libraries
vi.mock('@/lib/form16/extractor');
vi.mock('@/lib/form16/parser', async () => {
  const actual = await vi.importActual<typeof import('@/lib/form16/parser')>('@/lib/form16/parser');
  return {
    ...actual,
    parseForm16Text: vi.fn(),
  };
});
vi.mock('@/lib/itr/validator');
vi.mock('@/lib/itr/mapper');
vi.mock('@/lib/ais/parser', () => ({
  parseAISText: vi.fn().mockReturnValue({ interestSavings: 1000 })
}));
vi.mock('@/lib/tis/parser', () => ({
  parseTISText: vi.fn().mockReturnValue({ interestSavings: 1000 })
}));
vi.mock('@/lib/form26as/parser', () => ({
  parseForm26ASText: vi.fn().mockReturnValue({ tdsSalary: [] })
}));

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
  }, 20000);

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

    expect(screen.getByText(/AI Chat/i)).toBeDefined();
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
    expect(screen.getAllByDisplayValue('1000000')[0]).toBeDefined();

    // Trigger AI Review
    const reviewBtn = screen.getByText('AI Review');
    expect(reviewBtn).toBeDefined();
    fireEvent.click(reviewBtn);

    await waitFor(() => {
      expect(screen.getByText('AI Review Complete!')).toBeDefined();
    });

    vi.restoreAllMocks();
  }, 45000);

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

    fireEvent.change(screen.getAllByDisplayValue('100')[0], { target: { value: '200' } });
    expect(screen.getAllByDisplayValue('200')[0]).toBeDefined();

    fireEvent.change(screen.getAllByDisplayValue('50')[0], { target: { value: '150' } });
    expect(screen.getAllByDisplayValue('150')[0]).toBeDefined();

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
  }, 45000);

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

    // Also attach a text file to test readFileAsText and raise function coverage
    const txtFile = new File(['plain text content'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(attachInput!, { target: { files: [txtFile] } });

    await waitFor(() => {
      expect(screen.getByText('test.txt')).toBeDefined();
    });

    const removeBtn = screen.getAllByLabelText('remove attachment');
    fireEvent.click(removeBtn[0]);

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

  test('handles sendOnlyRawData state toggling and affects fetch payload', async () => {
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

    const mockProposalResponse = {
      role: 'assistant',
      content: 'AI Answer'
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

    // Open chat
    const chatBtn = screen.getByLabelText('open ai chat');
    fireEvent.click(chatBtn);

    // Verify checkbox is unchecked by default
    const checkbox = screen.getByLabelText('Send only raw data to AI agent') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    // badge should be present by default
    expect(screen.getByTestId('parsed-itr-badge')).toBeDefined();

    // check the checkbox to send only raw data
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    // badge should not be present now
    expect(screen.queryByTestId('parsed-itr-badge')).toBeNull();

    // uncheck the checkbox to send parsed data again
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);

    // badge should now be present
    expect(screen.getByTestId('parsed-itr-badge')).toBeDefined();

    // Ask a question in input and send
    const input = screen.getByPlaceholderText('Ask your tax question...');
    fireEvent.change(input, { target: { value: 'How can I save more tax?' } });
    const sendBtn = screen.getByLabelText('send message');
    fireEvent.click(sendBtn);

    // Check payload passed to fetch has itrData defined
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Find call with `/api/chat`
    const chatCall = mockFetch.mock.calls.find((call: any) => call[0] === '/api/chat');
    expect(chatCall).toBeDefined();
    const body = JSON.parse(chatCall![1].body);
    expect(body.itrData).not.toBeNull();
    expect(body.itrData.employee.pan).toBe('ABCDE1234F');

    vi.restoreAllMocks();
  }, 35000);

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
      expect(screen.getAllByDisplayValue('1100000')[0]).toBeDefined();
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

  test('handles AI updates proposal accept and undo end-to-end in Home page', async () => {
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
    });

    // Verify Applied Successfully confirmation is shown
    expect(screen.getByText('Applied Successfully!')).toBeDefined();

    // Click Undo
    const undoBtn = screen.getByText('Undo');
    fireEvent.click(undoBtn);

    // Verify that the data reverts back
    await waitFor(() => {
      expect(screen.getByDisplayValue('ABCDE1234F')).toBeDefined();
      expect(screen.getByDisplayValue('John')).toBeDefined();
    });

    // Verify the confirmation is hidden and Accept / Reject buttons are back
    expect(screen.queryByText('Applied Successfully!')).toBeNull();
    expect(screen.getByText('Accept & Apply')).toBeDefined();

    vi.restoreAllMocks();
  });

  test('displays AIS, TIS, and 26AS attachment badges in chat panel context area and allows independent removal', async () => {
    const mockText = 'Raw PDF text';
    const mockData = {
      employee: { pan: 'ABCDE1234F', name: { firstName: 'John', lastName: 'Doe' } },
      salary: { grossSalary: 1000000, standardDeduction16ia: 50000 },
      deductions80C: 150000, deductions80D: 25000, deductions80TTA: 10000
    };

    vi.spyOn(extractor, 'extractTextFromPDF').mockResolvedValue(mockText);
    vi.spyOn(parser, 'parseForm16Text').mockReturnValue(mockData as any);
    vi.spyOn(validator, 'validateForm16Data').mockReturnValue([]);

    const { container } = render(<Home />);

    // Open chat
    const chatBtn = screen.getByLabelText('open ai chat');
    fireEvent.click(chatBtn);

    // Initially, no badges
    expect(screen.queryByTestId('form16-badge')).toBeNull();
    expect(screen.queryByTestId('ais-badge')).toBeNull();
    expect(screen.queryByTestId('tis-badge')).toBeNull();
    expect(screen.queryByTestId('form26as-badge')).toBeNull();

    // Upload Form-16 PDF
    const file = new File(['dummy'], 'form16.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'arrayBuffer', { value: vi.fn().mockResolvedValue(new ArrayBuffer(0)) });
    const fileInput = container.querySelector('#file-upload');
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput!, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('form16-badge')).toBeDefined();
    });

    // Upload AIS PDF
    const aisFile = new File(['dummy ais'], 'ais.pdf', { type: 'application/pdf' });
    Object.defineProperty(aisFile, 'arrayBuffer', { value: vi.fn().mockResolvedValue(new ArrayBuffer(0)) });
    const aisInput = container.querySelector('#ais-upload');
    expect(aisInput).not.toBeNull();
    fireEvent.change(aisInput!, { target: { files: [aisFile] } });

    await waitFor(() => {
      expect(screen.getByTestId('ais-badge')).toBeDefined();
    });

    // Upload TIS PDF
    const tisFile = new File(['dummy tis'], 'tis.pdf', { type: 'application/pdf' });
    Object.defineProperty(tisFile, 'arrayBuffer', { value: vi.fn().mockResolvedValue(new ArrayBuffer(0)) });
    const tisInput = container.querySelector('#tis-upload');
    expect(tisInput).not.toBeNull();
    fireEvent.change(tisInput!, { target: { files: [tisFile] } });

    await waitFor(() => {
      expect(screen.getByTestId('tis-badge')).toBeDefined();
    });

    // Upload Form 26AS PDF
    const f26asFile = new File(['dummy 26as'], 'form26as.pdf', { type: 'application/pdf' });
    Object.defineProperty(f26asFile, 'arrayBuffer', { value: vi.fn().mockResolvedValue(new ArrayBuffer(0)) });
    const f26asInput = container.querySelector('#f26as-upload');
    expect(f26asInput).not.toBeNull();
    fireEvent.change(f26asInput!, { target: { files: [f26asFile] } });

    await waitFor(() => {
      expect(screen.getByTestId('form26as-badge')).toBeDefined();
    });

    // Verify all four badges are displayed
    expect(screen.getByTestId('form16-badge')).toBeDefined();
    expect(screen.getByTestId('ais-badge')).toBeDefined();
    expect(screen.getByTestId('tis-badge')).toBeDefined();
    expect(screen.getByTestId('form26as-badge')).toBeDefined();

    // Remove TIS badge and verify it is removed independently
    const removeTisBtn = screen.getByLabelText('remove tis context');
    fireEvent.click(removeTisBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('tis-badge')).toBeNull();
    });
    expect(screen.getByTestId('form16-badge')).toBeDefined();
    expect(screen.getByTestId('ais-badge')).toBeDefined();
    expect(screen.getByTestId('form26as-badge')).toBeDefined();

    // Remove AIS badge and verify it is removed independently
    const removeAisBtn = screen.getByLabelText('remove ais context');
    fireEvent.click(removeAisBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('ais-badge')).toBeNull();
    });
    expect(screen.getByTestId('form16-badge')).toBeDefined();
    expect(screen.getByTestId('form26as-badge')).toBeDefined();

    // Remove Form 26AS badge and verify it is removed independently
    const remove26asBtn = screen.getByLabelText('remove form26as context');
    fireEvent.click(remove26asBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('form26as-badge')).toBeNull();
    });
    expect(screen.getByTestId('form16-badge')).toBeDefined();

    vi.restoreAllMocks();
  }, 45000);

  test('handles end-to-end user document reconciliation, validation cues, and AI advisory flow', async () => {
    // 1. Setup mock functions for PDF text extraction and parsing
    const mockText = 'Raw extracted text content for integration test';
    const mockData = {
      employer: { name: 'Refactored Corp', pan: 'AAAPB1234C', tan: 'AAAB12345C', address: '123 clean street' },
      employee: { name: { firstName: 'Alice', lastName: 'Smith' }, pan: 'ABCDE1234F', address: '456 clean avenue' },
      assessmentYear: '2026-27',
      period: { from: '2025-04-01', to: '2026-03-31' },
      salary: {
        grossSalary: 1200000,
        salaryAsPer17_1: 1100000,
        perquisites17_2: 100000,
        profitsInLieu17_3: 0,
        exemptAllowancesUs10: [],
        totalExemptAllowances: 0,
        netSalary: 1200000,
        standardDeduction16ia: 50000,
        entertainmentAllowance16ii: 0,
        professionalTax16iii: 0,
        totalDeductionsUs16: 50000,
        incomeChargeableUnderHeadSalaries: 1150000,
      },
      otherIncome: { houseProperty: 0, otherSources: [], totalOtherSources: 0 },
      grossTotalIncome: 1150000,
      deductions80C: 150000,
      totalChapterVIADeductions: 150000,
      totalIncome: 1000000,
      taxPayable: 75000,
    };

    vi.spyOn(extractor, 'extractTextFromPDF').mockResolvedValue(mockText);
    vi.spyOn(parser, 'parseForm16Text').mockReturnValue(mockData as any);
    vi.spyOn(validator, 'validateForm16Data').mockReturnValue([]);

    // 2. Mock API call response for AI review with recommendations and data updates
    const mockAIResponse = {
      role: 'assistant',
      content: `Here is your review.
\`\`\`json
{
  "recommendations": [
    { "type": "warning", "field": "salary.grossSalary", "message": "Confirming gross salary details", "suggestion": "Looks good!" }
  ],
  "updatedForm16Data": {
    "employer": { "name": "Refactored Corp" },
    "employee": { "pan": "ABCDE1234F", "name": { "firstName": "AliceUpdated", "lastName": "Smith" } },
    "assessmentYear": "2026-27",
    "salary": { "grossSalary": 1200000 }
  }
}
\`\`\``
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockAIResponse
    });
    vi.stubGlobal('fetch', mockFetch);

    render(<Home />);

    // 3. Upload the simulated Form-16 PDF
    const fileInput = screen.getByLabelText(/1. Upload Form-16 PDF/i);
    const file = new File(['mock pdf content'], 'form16_clean.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: vi.fn().mockResolvedValue(new ArrayBuffer(16))
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // 4. Verify that data gets populated in the CueTextField elements correctly
    await waitFor(() => {
      expect(screen.getByDisplayValue('Refactored Corp')).toBeDefined();
      expect(screen.getByDisplayValue('Alice')).toBeDefined();
    });

    // 5. Trigger the AI Review advisory flow
    const aiReviewBtn = screen.getByText('AI Review');
    fireEvent.click(aiReviewBtn);

    // 6. Verify that recommendations from Markdown and AssistantMessage render seamlessly
    await waitFor(() => {
      expect(screen.getByText('AI Suggested Updates')).toBeDefined();
      expect(screen.getByText('Confirming gross salary details')).toBeDefined();
    });

    // 7. Apply the updates and verify changes flow to the main form
    const acceptBtn = screen.getByText('Accept & Apply');
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(screen.getByDisplayValue('AliceUpdated')).toBeDefined();
    });

    vi.restoreAllMocks();
  }, 45000);

  test('handles uploading a form again after removal by clearing the input target value', async () => {
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

    const { container } = render(<Home />);

    // Open chat to access context badges if needed
    const chatBtn = screen.getByLabelText('open ai chat');
    fireEvent.click(chatBtn);

    const fileInput = screen.getByLabelText(/1. Upload Form-16 PDF/i) as HTMLInputElement;
    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: vi.fn().mockResolvedValue(new ArrayBuffer(8))
    });

    // 1. First upload
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/2. Review & Edit Extracted Information/i)).toBeDefined();
    });

    // 2. Clear target value should have been executed in the handler
    expect(fileInput.value).toBe('');

    // 3. Remove the uploaded file (via remove badge)
    const removeBtn = screen.getByLabelText('remove form16 context');
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.queryByText(/2. Review & Edit Extracted Information/i)).toBeNull();
    });

    // 4. Second upload of the EXACT same file
    // Since input value was reset to '', this change event will correctly fire.
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/2. Review & Edit Extracted Information/i)).toBeDefined();
    });

    expect(fileInput.value).toBe('');
    vi.restoreAllMocks();
  }, 45000);

  test('renders modernized UI/UX components correctly', async () => {
    // This test directly verifies our Jules UI/UX Modernization enhancements.
    const file = new File(['%PDF-1.5 ...'], 'form16.pdf', { type: 'application/pdf' });
    render(<Home />);

    const fileInput = screen.getByLabelText(/1. Upload Form-16 PDF/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for file parsing to complete and render the forms
    await waitFor(() => {
      expect(screen.getByText(/2. Review & Edit Extracted Information/i)).toBeDefined();
    });

    // 1. Check that verified-badges (auto-verified counts) next to section headers are present
    const badges = screen.getAllByTestId('verified-badge');
    expect(badges.length).toBeGreaterThan(0);

    // 2. Check that progressive disclosure of audit trails is collapsed by default (View Calculation Breakdown ▾ is shown)
    const toggleSalaryBtn = screen.getByTestId('toggle-audit-salary');
    expect(toggleSalaryBtn.textContent).toContain('View Calculation Breakdown ▾');
    expect(screen.queryByText('SALARY AUDIT TRAIL & BREAKDOWN:')).toBeNull();

    // 3. Click the toggle and verify progressive disclosure unfolds
    fireEvent.click(toggleSalaryBtn);
    expect(toggleSalaryBtn.textContent).toContain('Hide Calculation Breakdown ▴');
    expect(screen.getByText('SALARY AUDIT TRAIL & BREAKDOWN:')).toBeDefined();

    // 4. Verify the Optimal Badge is nested inside the Optimal regime card
    const optimalBadge = screen.getByText('Optimal');
    expect(optimalBadge).toBeDefined();

    vi.restoreAllMocks();
  }, 45000);

  it('handles multiple Form-16 uploads, badges rendering, and deletion dynamically', async () => {
    const mockText1 = 'Employer Acme Corp Gross Salary 500,000.00';
    const mockText2 = 'Employer Beta Inc Gross Salary 700,000.00';

    const mockData1 = {
      employer: { name: 'Acme Corp', tan: 'TAN1', pan: 'PAN1', address: 'Addr1' },
      employee: { name: { firstName: 'John', middleName: '', lastName: 'Doe' }, pan: 'ABCDE1234F', address: 'Addr' },
      assessmentYear: '2026-27',
      period: { from: '01-Apr-2025', to: '31-Aug-2025' },
      salary: {
        grossSalary: 500000,
        salaryAsPer17_1: 500000,
        perquisites17_2: 0,
        profitsInLieu17_3: 0,
        exemptAllowancesUs10: [],
        totalExemptAllowances: 0,
        netSalary: 500000,
        standardDeduction16ia: 75000,
        entertainmentAllowance16ii: 0,
        professionalTax16iii: 0,
        totalDeductionsUs16: 75000,
        incomeChargeableUnderHeadSalaries: 425000,
      },
      otherIncome: { houseProperty: 0, otherSources: [], totalOtherSources: 0 },
      grossTotalIncome: 425000,
      totalChapterVIADeductions: 0,
      totalIncome: 350000,
      taxPayable: 5000,
    };

    const mockData2 = {
      employer: { name: 'Beta Inc', tan: 'TAN2', pan: 'PAN2', address: 'Addr2' },
      employee: { name: { firstName: 'John', middleName: '', lastName: 'Doe' }, pan: 'ABCDE1234F', address: 'Addr' },
      assessmentYear: '2026-27',
      period: { from: '01-Sep-2025', to: '31-Mar-2026' },
      salary: {
        grossSalary: 700000,
        salaryAsPer17_1: 700000,
        perquisites17_2: 0,
        profitsInLieu17_3: 0,
        exemptAllowancesUs10: [],
        totalExemptAllowances: 0,
        netSalary: 700000,
        standardDeduction16ia: 75000,
        entertainmentAllowance16ii: 0,
        professionalTax16iii: 0,
        totalDeductionsUs16: 75000,
        incomeChargeableUnderHeadSalaries: 625000,
      },
      otherIncome: { houseProperty: 0, otherSources: [], totalOtherSources: 0 },
      grossTotalIncome: 625000,
      totalChapterVIADeductions: 0,
      totalIncome: 550000,
      taxPayable: 15000,
    };

    vi.spyOn(extractor, 'extractTextFromPDF')
      .mockResolvedValueOnce(mockText1)
      .mockResolvedValueOnce(mockText2);

    vi.spyOn(parser, 'parseForm16Text')
      .mockReturnValueOnce(mockData1 as any)
      .mockReturnValueOnce(mockData2 as any);

    vi.spyOn(validator, 'validateForm16Data').mockReturnValue([]);

    const { container } = render(<Home />);

    // Open chat
    const chatBtn = screen.getByLabelText('open ai chat');
    fireEvent.click(chatBtn);

    // Upload first Form-16
    const file1 = new File(['dummy1'], 'form16-1.pdf', { type: 'application/pdf' });
    Object.defineProperty(file1, 'arrayBuffer', { value: vi.fn().mockResolvedValue(new ArrayBuffer(0)) });
    const fileInput = container.querySelector('#file-upload');
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput!, { target: { files: [file1] } });

    await waitFor(() => {
      expect(screen.getByTestId('form16-badge')).toBeDefined();
      expect(screen.getByText('1 Uploaded')).toBeDefined();
    });

    // Upload second Form-16
    const file2 = new File(['dummy2'], 'form16-2.pdf', { type: 'application/pdf' });
    Object.defineProperty(file2, 'arrayBuffer', { value: vi.fn().mockResolvedValue(new ArrayBuffer(0)) });
    fireEvent.change(fileInput!, { target: { files: [file2] } });

    await waitFor(() => {
      expect(screen.getByTestId('form16-badge-1')).toBeDefined();
      expect(screen.getByText('2 Uploaded')).toBeDefined();
    });

    // Verify merging values in UI (e.g. gross salary = 1,200,000)
    expect(screen.getByDisplayValue('Acme Corp / Beta Inc')).toBeDefined();

    // Remove first Form-16 from the main list panel
    const deleteBtn = screen.getByLabelText('delete form16 file 0');
    fireEvent.click(deleteBtn);

    // Verify it is updated to "1 Uploaded" and employer name is now only Beta Inc
    await waitFor(() => {
      expect(screen.getByText('1 Uploaded')).toBeDefined();
      expect(screen.getByDisplayValue('Beta Inc')).toBeDefined();
    });

    vi.restoreAllMocks();
  }, 45000);

  test('opens right panel and switches to correct inspect tab when clicking View Extracted Data on uploaders', async () => {
    // 1. Setup mock functions for PDF text extraction and parsing
    const mockText = 'Raw extracted text content for integration test';
    const mockData = {
      employer: { name: 'Acme Corp', tan: 'AAAPB1234C', address: '123 clean street' },
      employee: { name: { firstName: 'Alice', lastName: 'Smith' }, pan: 'ABCDE1234F', address: '456 clean avenue' },
      assessmentYear: '2026-27',
      period: { from: '2025-04-01', to: '2026-03-31' },
      salary: {
        grossSalary: 1200000,
        salaryAsPer17_1: 1100000,
        perquisites17_2: 100000,
        profitsInLieu17_3: 0,
        exemptAllowancesUs10: [],
        totalExemptAllowances: 0,
        netSalary: 1200000,
        standardDeduction16ia: 50000,
        entertainmentAllowance16ii: 0,
        professionalTax16iii: 0,
        totalDeductionsUs16: 50000,
        incomeChargeableUnderHeadSalaries: 1150000,
      },
      otherIncome: { houseProperty: 0, otherSources: [], totalOtherSources: 0 },
      grossTotalIncome: 1150000,
      deductions80C: 150000,
      totalChapterVIADeductions: 150000,
      totalIncome: 1000000,
      taxPayable: 75000,
    };

    vi.spyOn(extractor, 'extractTextFromPDF').mockResolvedValue(mockText);
    vi.spyOn(parser, 'parseForm16Text').mockReturnValue(mockData as any);
    vi.spyOn(validator, 'validateForm16Data').mockReturnValue([]);

    render(<Home />);

    const fileInput = screen.getByLabelText(/1. Upload Form-16 PDF/i);
    const file = new File(['dummy'], 'form16.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'arrayBuffer', { value: vi.fn().mockResolvedValue(new ArrayBuffer(0)) });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/2. Review & Edit Extracted Information/i)).toBeDefined();
    });

    // Right panel switch tab inspect should be queryable
    const inspectBtn = screen.getByTestId('view-extracted-form16-btn');
    expect(inspectBtn).toBeDefined();

    fireEvent.click(inspectBtn);

    // Verify right panel is open and showing the DebugInfoSection tabs
    expect(screen.getByText('Debug Information & Raw Extracted Documents')).toBeDefined();
    expect(screen.getByText('Engine Reconciliation Result (Protobuf)')).toBeDefined();

    vi.restoreAllMocks();
  }, 45000);

  test('detects capital gains in uploaded AIS/TIS and shows blocking message instead of computing wrong tax', async () => {
    // 1. Setup mock data for standard Form-16
    const mockF16Text = 'Employer Acme Corp Gross Salary 500,000.00';
    const mockF16Data = {
      employer: { name: 'Acme Corp', tan: 'TAN1', pan: 'PAN1', address: 'Addr1' },
      employee: { name: { firstName: 'John', lastName: 'Doe' }, pan: 'ABCDE1234F', address: 'Addr' },
      assessmentYear: '2026-27',
      salary: {
        grossSalary: 500000,
        netSalary: 500000,
        incomeChargeableUnderHeadSalaries: 425000,
      },
      otherIncome: { houseProperty: 0, otherSources: [], totalOtherSources: 0 },
      grossTotalIncome: 425000,
      totalIncome: 350000,
      taxPayable: 5000,
    };

    // 2. Setup mock text for AIS containing capital gains
    const mockAisCgText = 'ANNUAL INFORMATION STATEMENT - Section containing STCG Capital Gains from sale of shares';

    vi.spyOn(extractor, 'extractTextFromPDF')
      .mockResolvedValueOnce(mockF16Text)
      .mockResolvedValueOnce(mockAisCgText);

    vi.spyOn(parser, 'parseForm16Text').mockReturnValue(mockF16Data as any);
    vi.spyOn(validator, 'validateForm16Data').mockReturnValue([]);

    const { container } = render(<Home />);

    // Upload Form-16 first
    const file1 = new File(['dummy1'], 'form16.pdf', { type: 'application/pdf' });
    Object.defineProperty(file1, 'arrayBuffer', { value: vi.fn().mockResolvedValue(new ArrayBuffer(0)) });
    const f16Input = container.querySelector('#file-upload');
    expect(f16Input).not.toBeNull();
    fireEvent.change(f16Input!, { target: { files: [file1] } });

    await waitFor(() => {
      expect(screen.getByText(/2. Review & Edit Extracted Information/i)).toBeDefined();
      expect(screen.getByText(/Tax Regime Comparison/i)).toBeDefined();
    });

    // Now upload AIS with capital gains
    const file2 = new File(['dummy2'], 'ais_with_cg.pdf', { type: 'application/pdf' });
    Object.defineProperty(file2, 'arrayBuffer', { value: vi.fn().mockResolvedValue(new ArrayBuffer(0)) });
    const aisInput = container.querySelector('#ais-upload');
    expect(aisInput).not.toBeNull();
    fireEvent.change(aisInput!, { target: { files: [file2] } });

    // Expect the blocking error Alert with data-testid="ais-tis-error-alert" to be displayed
    await waitFor(() => {
      expect(screen.getByTestId('ais-tis-error-alert')).toBeDefined();
      expect(screen.getByText(/This return requires ITR-2 \(for capital gains income\)/i)).toBeDefined();
    });

    // Hides the Regime Comparison Card and the Review/Edit Forms
    expect(screen.queryByText(/Tax Regime Comparison/i)).toBeNull();
    expect(screen.queryByText(/2. Review & Edit Extracted Information/i)).toBeNull();

    // Now remove the AIS document
    const removeAisBtn = screen.getByLabelText('remove ais context');
    fireEvent.click(removeAisBtn);

    // Expect error to be cleared and regime comparison / edit forms to be displayed again
    await waitFor(() => {
      expect(screen.queryByTestId('ais-tis-error-alert')).toBeNull();
      expect(screen.getByText(/Tax Regime Comparison/i)).toBeDefined();
      expect(screen.getByText(/2. Review & Edit Extracted Information/i)).toBeDefined();
    });

    vi.restoreAllMocks();
  }, 45000);
});
