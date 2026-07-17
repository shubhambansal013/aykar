import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, describe, it, vi, beforeEach } from 'vitest';
import Home from '../../app/page';
import * as extractor from '@/lib/form16/extractor';
import * as parser from '@/lib/form16/parser';
import * as validator from '@/lib/itr/validator';
import * as mapper from '@/lib/itr/mapper';

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

describe('Home Page - Dual Regime Tax Comparison', () => {
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

  it('renders side-by-side tax regime comparison when data is loaded', async () => {
    const mockText = 'Form-16 raw content';
    const mockData = {
      employer: { name: 'Test Corp', tan: 'MUMT12345A', pan: 'MUMC12345A', address: 'Mumbai' },
      employee: { name: { firstName: 'John', middleName: '', lastName: 'Doe' }, pan: 'ABCDE1234F', address: 'Delhi' },
      assessmentYear: '2026',
      period: { from: '2025-04-01', to: '2026-03-31' },
      salary: {
        grossSalary: 1200000,
        salaryAsPer17_1: 1100000,
        perquisites17_2: 100000,
        profitsInLieu17_3: 0,
        exemptAllowancesUs10: [
          { code: '10(13A)', nature: 'HRA', amount: 100000 }
        ],
        totalExemptAllowances: 100000,
        netSalary: 1100000,
        standardDeduction16ia: 50000,
        entertainmentAllowance16ii: 0,
        professionalTax16iii: 2500,
        totalDeductionsUs16: 52500,
        incomeChargeableUnderHeadSalaries: 1047500,
      },
      otherIncome: { houseProperty: -50000, otherSources: [{ nature: 'Interest', amount: 10000 }], totalOtherSources: 10000 },
      grossTotalIncome: 1007500,
      deductions80C: 150000,
      deductions80CCC: 0,
      deductions80CCD1: 0,
      deductions80CCD1B: 0,
      deductions80CCD2: 20000,
      deductions80D: 25000,
      deductions80E: 0,
      deductions80G: 0,
      deductions80TTA: 10000,
      totalChapterVIADeductions: 205000,
      totalIncome: 802500,
      taxPayable: 0,
    };

    vi.spyOn(extractor, 'extractTextFromPDF').mockResolvedValue(mockText);
    vi.spyOn(parser, 'parseForm16Text').mockReturnValue(mockData as any);
    vi.spyOn(validator, 'validateForm16Data').mockReturnValue([]);

    const { container } = render(<Home />);

    // Upload Form-16 PDF
    const fileInput = screen.getByLabelText(/1. Upload Form-16 PDF/i);
    const file = new File(['mock content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: vi.fn().mockResolvedValue(new ArrayBuffer(8))
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for data load and comparison card rendering
    await waitFor(() => {
      expect(screen.getByTestId('tax-comparison-card')).toBeDefined();
    });

    // Check optimal regime is recommended (New Regime is 73840 vs Old Regime 75920, so New is optimal)
    expect(screen.getByTestId('efficiency-badge').textContent).toContain('New Regime Optimal');

    // Confirm details for both regimes are rendered in the card
    expect(screen.getByText(/Tax Regime Comparison & Selection/i)).toBeDefined();
    expect(screen.getByText(/Based on your data, the New Tax Regime is the most tax-efficient choice/i)).toBeDefined();

    // Toggle selected regime to Old Regime
    const selectOld = screen.getByTestId('select-old-regime');
    fireEvent.click(selectOld);

    // Verify downloaded file triggers mapForm16ToITR1 with OLD
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:url');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const downloadBtn = screen.getByTestId('download-itr-button');
    fireEvent.click(downloadBtn);

    expect(mapper.mapForm16ToITR1).toHaveBeenCalledWith(expect.any(Object), 'OLD');
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  }, 45000);
});
