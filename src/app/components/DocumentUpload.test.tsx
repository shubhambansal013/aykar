import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DocumentUpload from './DocumentUpload';

const defaultProps = {
  form16List: [],
  aisFile: null,
  tisFile: null,
  form26asFile: null,
  aisLoading: false,
  tisLoading: false,
  form26asLoading: false,
  loading: false,
  isUploadCollapsed: false,
  mode: 'light' as const,
  readyDocsCount: 0,
  onFileUpload: vi.fn(),
  onAISUpload: vi.fn(),
  onTISUpload: vi.fn(),
  onForm26ASUpload: vi.fn(),
  onToggleShowUploadArea: vi.fn(),
  onCollapseUpload: vi.fn(),
  onRemoveForm16: vi.fn(),
  onOpenRightPanel: vi.fn(),
};

describe('DocumentUpload', () => {
  it('renders upload grid with 4 document slots', () => {
    render(<DocumentUpload {...defaultProps} />);
    expect(screen.getByText('1. Upload Financial Documents')).toBeDefined();
    expect(screen.getByText('1. Upload Form-16 PDF')).toBeDefined();
    expect(screen.getByText('AIS PDF (Annual Info)')).toBeDefined();
    expect(screen.getByText('TIS PDF (Tax Summary)')).toBeDefined();
    expect(screen.getByText('Form 26AS PDF (Tax Paid)')).toBeDefined();
  });

  it('shows compact status bar when isUploadCollapsed is true', () => {
    render(<DocumentUpload {...defaultProps} isUploadCollapsed readyDocsCount={2} />);
    expect(screen.getByTestId('compact-upload-status')).toBeDefined();
    expect(screen.getByText(/Docs Ready/)).toBeDefined();
  });

  it('shows file names after upload', () => {
    const form16List = [
      { file: new File([''], 'form16.pdf'), rawText: '', data: {} },
    ];
    render(<DocumentUpload {...defaultProps} form16List={form16List} />);
    expect(screen.getByText('form16.pdf')).toBeDefined();
  });

  it('calls onFileUpload when form-16 file is selected', () => {
    const onFileUpload = vi.fn();
    render(<DocumentUpload {...defaultProps} onFileUpload={onFileUpload} />);
    const input = screen.getByLabelText(/Upload Form-16 PDF/i);
    fireEvent.change(input, { target: { files: [new File([''], 'test.pdf')] } });
    expect(onFileUpload).toHaveBeenCalled();
  });
});
