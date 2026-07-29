import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, test, describe } from 'vitest';
import TaxSlabVisual from './TaxSlabVisual';

describe('TaxSlabVisual', () => {
  const newRegimeSlabs = [
    { range: 'Up to ₹4,00,000', rate: 0, taxableAmount: 400000, tax: 0 },
    { range: '₹4,00,001 to ₹8,00,000', rate: 5, taxableAmount: 400000, tax: 20000 },
    { range: '₹8,00,001 to ₹12,00,000', rate: 10, taxableAmount: 400000, tax: 40000 },
    { range: '₹12,00,001 to ₹16,00,000', rate: 15, taxableAmount: 400000, tax: 60000 },
    { range: '₹16,00,001 to ₹20,00,000', rate: 20, taxableAmount: 250000, tax: 50000 },
  ];

  const oldRegimeSlabs = [
    { range: 'Up to ₹2,50,000', rate: 0, taxableAmount: 250000, tax: 0 },
    { range: '₹2,50,001 to ₹5,00,000', rate: 5, taxableAmount: 250000, tax: 12500 },
    { range: '₹5,00,001 to ₹10,00,000', rate: 20, taxableAmount: 500000, tax: 100000 },
    { range: 'Above ₹10,00,000', rate: 30, taxableAmount: 500000, tax: 150000 },
  ];

  test('renders slab visual for new regime', () => {
    render(
      <TaxSlabVisual
        slabs={newRegimeSlabs}
        totalIncome={1850000}
        regime="NEW"
      />
    );

    expect(screen.getByTestId('tax-slab-visual')).toBeDefined();
    expect(screen.getByText(/Tax Slab Visual/)).toBeDefined();
    expect(screen.getByText(/New Regime/)).toBeDefined();
  });

  test('renders slab visual for old regime', () => {
    render(
      <TaxSlabVisual
        slabs={oldRegimeSlabs}
        totalIncome={1500000}
        regime="OLD"
      />
    );

    expect(screen.getByTestId('tax-slab-visual')).toBeDefined();
    expect(screen.getByText(/Old Regime/)).toBeDefined();
  });

  test('renders correct tax amounts', () => {
    render(
      <TaxSlabVisual
        slabs={newRegimeSlabs}
        totalIncome={1850000}
        regime="NEW"
      />
    );

    expect(screen.getByText('₹20,000')).toBeDefined();
    expect(screen.getByText('₹40,000')).toBeDefined();
    expect(screen.getByText('₹60,000')).toBeDefined();
    expect(screen.getByText('₹50,000')).toBeDefined();
  });

  test('renders total income marker', () => {
    render(
      <TaxSlabVisual
        slabs={newRegimeSlabs}
        totalIncome={1850000}
        regime="NEW"
      />
    );

    expect(screen.getByText('₹18,50,000')).toBeDefined();
  });

  test('returns null for empty slabs', () => {
    const { container } = render(
      <TaxSlabVisual
        slabs={[]}
        totalIncome={1850000}
        regime="NEW"
      />
    );

    expect(container.innerHTML).toBe('');
  });

  test('returns null for zero total income', () => {
    const { container } = render(
      <TaxSlabVisual
        slabs={newRegimeSlabs}
        totalIncome={0}
        regime="NEW"
      />
    );

    expect(container.innerHTML).toBe('');
  });

  test('filters zero-amount slabs from visual', () => {
    const mixedSlabs = [
      { range: 'Up to ₹4,00,000', rate: 0, taxableAmount: 400000, tax: 0 },
      { range: '₹4,00,001 to ₹8,00,000', rate: 5, taxableAmount: 0, tax: 0 },
      { range: '₹8,00,001 to ₹12,00,000', rate: 10, taxableAmount: 0, tax: 0 },
    ];

    render(
      <TaxSlabVisual
        slabs={mixedSlabs}
        totalIncome={400000}
        regime="NEW"
      />
    );

    expect(screen.getByText('Up to ₹4,00,000 @ 0%')).toBeDefined();
  });

  test('displays rate labels on segments when wide enough', () => {
    const singleSlab = [
      { range: 'Up to ₹4,00,000', rate: 0, taxableAmount: 400000, tax: 0 },
    ];

    render(
      <TaxSlabVisual
        slabs={singleSlab}
        totalIncome={400000}
        regime="NEW"
      />
    );

    expect(screen.getByText('0%')).toBeDefined();
  });
});
