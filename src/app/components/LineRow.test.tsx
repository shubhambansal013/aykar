import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LineRow, SectionTitle } from './LineRow';

describe('LineRow', () => {
  it('renders label and value', () => {
    render(<LineRow label="Gross Salary" value="₹10,00,000" />);
    expect(screen.getByText('Gross Salary')).toBeDefined();
    expect(screen.getByText('₹10,00,000')).toBeDefined();
  });

  it('shows add icon when operator is add', () => {
    const { container } = render(<LineRow label="Income" value="₹5,000" operator="add" />);
    expect(container.querySelector('[data-testid="AddIcon"]')).toBeTruthy();
  });

  it('shows subtract icon when operator is subtract', () => {
    const { container } = render(<LineRow label="Deduction" value="₹1,000" operator="subtract" />);
    expect(container.querySelector('[data-testid="RemoveIcon"]')).toBeTruthy();
  });

  it('no icon when operator is equals or undefined', () => {
    const { container, rerender } = render(<LineRow label="Total" value="₹4,000" operator="equals" />);
    expect(container.querySelector('[data-testid="AddIcon"]')).toBeFalsy();
    expect(container.querySelector('[data-testid="RemoveIcon"]')).toBeFalsy();

    rerender(<LineRow label="Total" value="₹4,000" />);
    expect(container.querySelector('[data-testid="AddIcon"]')).toBeFalsy();
    expect(container.querySelector('[data-testid="RemoveIcon"]')).toBeFalsy();
  });

  it('applies total styling when isTotal is true', () => {
    render(<LineRow label="Net" value="₹9,000" isTotal />);
    const label = screen.getByText('Net');
    expect(label.className).toContain('MuiTypography');
    expect(screen.getByText('₹9,000')).toBeDefined();
  });

  it('applies isNegative color', () => {
    render(<LineRow label="Loss" value="-₹500" isNegative />);
    const value = screen.getByText('-₹500');
    expect(value).toBeDefined();
  });

  it('renders source badge when source prop provided', () => {
    render(<LineRow label="TDS" value="₹1,000" source="Form16" />);
    expect(screen.getByText('Form-16')).toBeDefined();
  });
});

describe('SectionTitle', () => {
  it('renders children with correct styling', () => {
    render(<SectionTitle>Income Summary</SectionTitle>);
    const title = screen.getByText('Income Summary');
    expect(title).toBeDefined();
    expect(title.tagName).toBe('H6');
  });
});
