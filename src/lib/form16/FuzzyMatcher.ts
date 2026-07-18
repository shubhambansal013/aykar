/**
 * FuzzyMatcher provides robust fuzzy label matching and string similarity computations
 * using the Sørensen-Dice coefficient on bigrams. This decouples the parser from exact
 * regexes, making it resilient to typos, spacing differences, and portal reformatting.
 */
export class FuzzyMatcher {
  /**
   * Computes the similarity score (between 0.0 and 1.0) between two strings
   * using the Sørensen-Dice coefficient on bigrams, with an enhanced boost for substring containment.
   */
  public static getSimilarity(s1: string, s2: string): number {
    const str1 = s1.replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, ' ').trim().toLowerCase();
    const str2 = s2.replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, ' ').trim().toLowerCase();

    if (str1 === str2) return 1.0;
    if (!str1 || !str2) return 0.0;

    // Substring containment boost
    if (str1.includes(str2) || str2.includes(str1)) {
      const ratio = Math.min(str1.length, str2.length) / Math.max(str1.length, str2.length);
      return 0.6 + 0.4 * ratio;
    }

    if (str1.length < 2 || str2.length < 2) {
      return str1 === str2 ? 1.0 : 0.0;
    }

    const getBigrams = (str: string): Map<string, number> => {
      const bigrams = new Map<string, number>();
      for (let i = 0; i < str.length - 1; i++) {
        const bigram = str.substring(i, i + 2);
        bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
      }
      return bigrams;
    };

    const bigrams1 = getBigrams(str1);
    const bigrams2 = getBigrams(str2);

    let intersection = 0;
    for (const [bigram, count1] of bigrams1.entries()) {
      if (bigrams2.has(bigram)) {
        intersection += Math.min(count1, bigrams2.get(bigram)!);
      }
    }

    let totalBigrams = 0;
    for (const count of bigrams1.values()) totalBigrams += count;
    for (const count of bigrams2.values()) totalBigrams += count;

    return (2.0 * intersection) / totalBigrams;
  }

  /**
   * Checks if target string has any substring/phrase that fuzzy matches the query label.
   */
  public static containsFuzzy(text: string, query: string, threshold = 0.7): boolean {
    const cleanText = text.toLowerCase();
    const cleanQuery = query.toLowerCase();

    // Exact digit matching requirement: if query has digits, the text must contain all those digits
    const queryDigits = cleanQuery.match(/\d+/g);
    const textDigits = cleanText.match(/\d+/g);
    if (queryDigits) {
      if (!textDigits) return false;
      for (const d of queryDigits) {
        if (!textDigits.includes(d)) return false;
      }
    }

    if (cleanText.includes(cleanQuery)) return true;

    // Slide a window of cleanQuery's word length across cleanText's words
    const queryWords = cleanQuery.split(/\s+/).filter(Boolean);
    const textWords = cleanText.split(/\s+/).filter(Boolean);

    if (queryWords.length === 0) return false;
    if (textWords.length < queryWords.length) {
      return this.getSimilarity(cleanText, cleanQuery) >= threshold;
    }

    const windowSize = queryWords.length;
    for (let i = 0; i <= textWords.length - windowSize; i++) {
      const windowStr = textWords.slice(i, i + windowSize).join(' ');
      if (this.getSimilarity(windowStr, cleanQuery) >= threshold) {
        return true;
      }
    }

    // Try slightly wider window size for flexibility (+1 word)
    if (textWords.length >= windowSize + 1) {
      for (let i = 0; i <= textWords.length - (windowSize + 1); i++) {
        const windowStr = textWords.slice(i, i + windowSize + 1).join(' ');
        if (this.getSimilarity(windowStr, cleanQuery) >= threshold) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Finds the best match for a query among a list of candidate strings.
   */
  public static findBestMatch(
    query: string,
    candidates: string[],
    threshold = 0.5
  ): { bestCandidate: string | null; score: number } {
    let bestScore = 0;
    let bestCandidate: string | null = null;

    for (const candidate of candidates) {
      const score = this.getSimilarity(query, candidate);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    if (bestScore >= threshold) {
      return { bestCandidate, score: bestScore };
    }

    return { bestCandidate: null, score: bestScore };
  }
}
