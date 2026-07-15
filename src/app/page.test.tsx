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
    expect(screen.getByText(/Form-16 to ITR JSON Parser/i)).toBeDefined();
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
  });

  test('handles file upload with no files selected', () => {
    render(<Home />);
    const fileInput = screen.getByLabelText(/1. Upload Form-16 PDF/i);
    fireEvent.change(fileInput, { target: { files: [] } });
  });
});
