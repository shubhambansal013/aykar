import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, test, describe } from 'vitest';
import DebugInfoSection from './DebugInfoSection';

describe('DebugInfoSection Unit Tests', () => {
  const dummyData = {
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

  test('renders raw text and intermediate data correctly', () => {
    render(
      <DebugInfoSection
        mode="light"
        combinedRawText="Simulated raw text from PDF"
        extractedData={dummyData}
      />
    );

    expect(screen.getByText('3. Debug Information (For Verification)')).toBeDefined();
    expect(screen.getByText('Raw Extracted Text')).toBeDefined();
    expect(screen.getByText('Intermediate Form16Data Object')).toBeDefined();
    expect(screen.getByText(/Simulated raw text from PDF/)).toBeDefined();
    expect(screen.getByText(/"grossSalary": 1000000/)).toBeDefined();
  });
});
