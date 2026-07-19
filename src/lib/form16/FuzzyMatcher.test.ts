import { describe, it, expect } from 'vitest';
import { FuzzyMatcher } from './FuzzyMatcher';

describe('FuzzyMatcher', () => {
  it('should compute similarity correctly for identical strings', () => {
    expect(FuzzyMatcher.getSimilarity('Gross Salary', 'Gross Salary')).toBe(1.0);
    expect(FuzzyMatcher.getSimilarity('gross salary', 'Gross Salary')).toBe(1.0);
  });

  it('should handle small differences/punctuation/spacing robustly', () => {
    const similarity = FuzzyMatcher.getSimilarity(
      'Gross Salary (as per Sec 17(1))',
      'Gross Salary (as per Sec 17_1)'
    );
    expect(similarity).toBeGreaterThan(0.85);
  });

  it('should check if a string contains another fuzzy phrase', () => {
    expect(FuzzyMatcher.containsFuzzy('Gross Salary income u/s 17(1)', 'Gross Salary')).toBe(true);
    expect(FuzzyMatcher.containsFuzzy('Gros Salry (as per Sec 17(1))', 'Gross Salary', 0.65)).toBe(true);
    expect(FuzzyMatcher.containsFuzzy('Completely different text', 'Gross Salary')).toBe(false);
  });

  it('should find the best match out of candidate strings', () => {
    const candidates = ['Salary u/s 17(1)', 'Perquisites u/s 17(2)', 'Profits u/s 17(3)'];
    const match = FuzzyMatcher.findBestMatch('Value of perquisites under section 17(2)', candidates);
    expect(match.bestCandidate).toBe('Perquisites u/s 17(2)');
    expect(match.score).toBeGreaterThan(0.5);
  });
});
