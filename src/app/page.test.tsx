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

  test('renders Form-16 parser title', () => {
    render(<Home />);
    expect(screen.getByText(/Form-16 to ITR JSON Parser/i)).toBeDefined();
  });

  test('toggles color mode between light and dark', () => {
    render(<Home />);
    const toggleButton = screen.getByLabelText(/toggle color mode/i);
    expect(toggleButton).toBeDefined();
    fireEvent.click(toggleButton);
    fireEvent.click(toggleButton);
  });

  test('handles file upload and displays data', async () => {
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
