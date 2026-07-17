import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, describe } from 'vitest';
import DebugInfoSection from './DebugInfoSection';

describe('DebugInfoSection Unit Tests', () => {
  const dummyReconciledData = {
    employer: { name: 'Emp Corp', pan: 'AAAPB1234C', tan: 'AAAB12345C', address: '123 Street' },
    employee: { name: { firstName: 'John', middleName: '', lastName: 'Doe' }, pan: 'ABCDE1234F', address: '456 Road' },
    assessmentYear: '2026-27',
    period: { from: '2025-04-01', to: '2026-03-31' },
    salary: { grossSalary: 1000000 },
    otherIncome: { houseProperty: 0 },
    grossTotalIncome: 1000000,
    totalChapterVIADeductions: 0,
    totalIncome: 1000000,
    taxPayable: 112500,
  } as any;

  const dummyForm16List = [
    {
      file: { name: 'f16-first.pdf' },
      rawText: 'Raw Form-16 text',
      data: { id: 'F16-BUNDLE-1', taxpayerProfile: { name: 'John Doe' } }
    }
  ] as any[];

  const dummyAis = { id: 'AIS-PROTO-1', sftInfo: {} } as any;
  const dummyTis = { id: 'TIS-PROTO-1', categories: [] } as any;
  const dummyForm26as = { id: 'F26AS-PROTO-1', tdsSalary: [] } as any;

  test('renders headers and initial tabs correctly', () => {
    render(
      <DebugInfoSection
        mode="light"
        combinedRawText="Simulated raw text from PDF"
        extractedData={dummyReconciledData}
        form16List={dummyForm16List}
        aisData={dummyAis}
        tisData={dummyTis}
        form26asData={dummyForm26as}
      />
    );

    expect(screen.getByText('Debug Information & Raw Extracted Documents')).toBeDefined();
    expect(screen.getByText('Reconciled Data')).toBeDefined();
    expect(screen.getByText('Form-16 Data')).toBeDefined();
    expect(screen.getByText('AIS Data')).toBeDefined();
    expect(screen.getByText('TIS Data')).toBeDefined();
    expect(screen.getByText('Form 26AS Data')).toBeDefined();
    expect(screen.getByText('Raw PDF Text')).toBeDefined();

    // Reconciled Data tab is the first tab, and should display reconciled data content.
    expect(screen.getByText('Engine Reconciliation Result (Protobuf)')).toBeDefined();
    expect(screen.getByText(/"grossSalary": 1000000/)).toBeDefined();
  });

  test('switching tabs displays correct document data and names', () => {
    render(
      <DebugInfoSection
        mode="light"
        combinedRawText="Simulated raw text from PDF"
        extractedData={dummyReconciledData}
        form16List={dummyForm16List}
        aisData={dummyAis}
        tisData={dummyTis}
        form26asData={dummyForm26as}
      />
    );

    // Switch to Form-16 tab
    const form16Tab = screen.getByText('Form-16 Data');
    fireEvent.click(form16Tab);
    expect(screen.getByText('Certificate #1: f16-first.pdf')).toBeDefined();
    expect(screen.getByText(/"F16-BUNDLE-1"/)).toBeDefined();

    // Switch to AIS tab
    const aisTab = screen.getByText('AIS Data');
    fireEvent.click(aisTab);
    expect(screen.getByText('Annual Information Statement (AIS) Proto')).toBeDefined();
    expect(screen.getByText(/"AIS-PROTO-1"/)).toBeDefined();

    // Switch to TIS tab
    const tisTab = screen.getByText('TIS Data');
    fireEvent.click(tisTab);
    expect(screen.getByText('Taxpayer Information Summary (TIS) Proto')).toBeDefined();
    expect(screen.getByText(/"TIS-PROTO-1"/)).toBeDefined();

    // Switch to Form 26AS tab
    const f26asTab = screen.getByText('Form 26AS Data');
    fireEvent.click(f26asTab);
    expect(screen.getByText('Form 26AS Tax Credit Proto')).toBeDefined();
    expect(screen.getByText(/"F26AS-PROTO-1"/)).toBeDefined();

    // Switch to Raw PDF Text tab
    const rawTab = screen.getByText('Raw PDF Text');
    fireEvent.click(rawTab);
    expect(screen.getByText('All Raw Extracted PDF Text')).toBeDefined();
    expect(screen.getByText('Simulated raw text from PDF')).toBeDefined();
  });

  test('shows correct empty state messages when documents are missing', () => {
    render(
      <DebugInfoSection
        mode="dark"
        combinedRawText=""
        extractedData={null}
        form16List={[]}
        aisData={null}
        tisData={null}
        form26asData={null}
      />
    );

    // 1. Reconciled Data tab empty state
    expect(screen.getByText('No reconciled engine data available.')).toBeDefined();

    // 2. Form-16 Data tab empty state
    const form16Tab = screen.getByText('Form-16 Data');
    fireEvent.click(form16Tab);
    expect(screen.getByText('No Form-16 certificates uploaded.')).toBeDefined();

    // 3. AIS Data tab empty state
    const aisTab = screen.getByText('AIS Data');
    fireEvent.click(aisTab);
    expect(screen.getByText('No AIS document uploaded yet.')).toBeDefined();

    // 4. TIS Data tab empty state
    const tisTab = screen.getByText('TIS Data');
    fireEvent.click(tisTab);
    expect(screen.getByText('No TIS document uploaded yet.')).toBeDefined();

    // 5. Form 26AS Data tab empty state
    const f26asTab = screen.getByText('Form 26AS Data');
    fireEvent.click(f26asTab);
    expect(screen.getByText('No Form 26AS document uploaded yet.')).toBeDefined();

    // 6. Raw PDF Text tab empty state
    const rawTab = screen.getByText('Raw PDF Text');
    fireEvent.click(rawTab);
    expect(screen.getByText('No raw text extracted yet.')).toBeDefined();
  });
});
