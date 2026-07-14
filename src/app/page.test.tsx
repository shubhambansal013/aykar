import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import Home from './page';

test('Home renders Form-16 parser title', () => {
  render(<Home />);
  expect(screen.getByText(/Form-16 to ITR JSON Parser/i)).toBeDefined();
});
