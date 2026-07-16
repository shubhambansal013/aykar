import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, test, describe } from 'vitest';
import SectionHeaderBadge from './SectionHeaderBadge';

describe('SectionHeaderBadge Unit Tests', () => {
  test('returns null when count is 0', () => {
    const { container } = render(<SectionHeaderBadge count={0} mode="light" />);
    expect(container.firstChild).toBeNull();
  });

  test('renders count and label correctly in light mode', () => {
    render(<SectionHeaderBadge count={5} mode="light" />);
    const badge = screen.getByTestId('verified-badge');
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain('5 fields auto-verified');
  });

  test('renders count and label correctly in dark mode', () => {
    render(<SectionHeaderBadge count={12} mode="dark" />);
    const badge = screen.getByTestId('verified-badge');
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain('12 fields auto-verified');
  });
});
