import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, describe, vi } from 'vitest';
import DocumentViewer from './DocumentViewer';

describe('DocumentViewer Unit Tests', () => {
  test('renders header and document tabs', () => {
    render(
      <DocumentViewer
        mode="light"
        rawText="Form-16 extracted text content"
        aisRawText="AIS extracted text content"
        tisRawText=""
        form26asRawText=""
      />
    );

    expect(screen.getByText('Document Viewer')).toBeDefined();
    expect(screen.getByText('Form-16')).toBeDefined();
    expect(screen.getByText('AIS')).toBeDefined();
    expect(screen.getByText('TIS')).toBeDefined();
    expect(screen.getByText('Form 26AS')).toBeDefined();
  });

  test('displays form-16 text by default', () => {
    render(
      <DocumentViewer
        mode="light"
        rawText="Form-16 extracted text content"
        aisRawText="AIS extracted text"
        tisRawText=""
        form26asRawText=""
      />
    );

    expect(screen.getByText('Form-16 extracted text content')).toBeDefined();
  });

  test('switching tabs displays correct document text', () => {
    render(
      <DocumentViewer
        mode="light"
        rawText="Form-16 text here"
        aisRawText="AIS text here"
        tisRawText=""
        form26asRawText=""
      />
    );

    const aisTab = screen.getByText('AIS');
    fireEvent.click(aisTab);
    expect(screen.getByText('AIS text here')).toBeDefined();
  });

  test('shows empty state messages when documents are missing', () => {
    render(
      <DocumentViewer
        mode="dark"
        rawText=""
        aisRawText=""
        tisRawText=""
        form26asRawText=""
      />
    );

    expect(screen.getByText('No Form-16 document uploaded.')).toBeDefined();
  });

  test('search field highlights matching text', () => {
    render(
      <DocumentViewer
        mode="light"
        rawText="Gross Salary: 1000000 Standard Deduction: 50000"
        aisRawText=""
        tisRawText=""
        form26asRawText=""
      />
    );

    const searchInput = screen.getByPlaceholderText('Search document text...');
    fireEvent.change(searchInput, { target: { value: 'Salary' } });

    expect(screen.getByText('1 match')).toBeDefined();
  });

  test('controlled mode with activeTab and onTabChange', () => {
    const handleTabChange = vi.fn();
    render(
      <DocumentViewer
        mode="light"
        rawText="Form-16 text"
        aisRawText="AIS text"
        tisRawText=""
        form26asRawText=""
        activeTab={1}
        onTabChange={handleTabChange}
      />
    );

    expect(screen.getByText('AIS text')).toBeDefined();

    const form16Tab = screen.getByText('Form-16');
    fireEvent.click(form16Tab);
    expect(handleTabChange).toHaveBeenCalledWith(0);
  });

  test('controlled search via searchQuery prop', () => {
    render(
      <DocumentViewer
        mode="light"
        rawText="Gross Salary: 1000000"
        aisRawText=""
        tisRawText=""
        form26asRawText=""
        searchQuery="Salary"
        onSearchChange={() => {}}
      />
    );

    expect(screen.getByText('1 match')).toBeDefined();
  });
});
