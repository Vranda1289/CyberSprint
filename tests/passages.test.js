import { describe, it, expect } from 'vitest';
import { PASSAGES, getRandomPassage } from '../src/game/passages.js';

describe('Passages (Section 7 Constraints)', () => {
  it('contains at least 12 original passages', () => {
    expect(PASSAGES.length).toBeGreaterThanOrEqual(12);
  });

  it('each passage is between 160 and 220 characters', () => {
    PASSAGES.forEach((passage, idx) => {
      expect(
        passage.length,
        `Passage ${idx} length ${passage.length} is outside 160-220 range: "${passage}"`
      ).toBeGreaterThanOrEqual(160);
      expect(
        passage.length,
        `Passage ${idx} length ${passage.length} is outside 160-220 range: "${passage}"`
      ).toBeLessThanOrEqual(220);
    });
  });

  it('each passage contains only printable ASCII characters (codes 32 to 126)', () => {
    PASSAGES.forEach((passage, idx) => {
      for (let i = 0; i < passage.length; i++) {
        const code = passage.charCodeAt(i);
        expect(
          code >= 32 && code <= 126,
          `Passage ${idx} contains non-ASCII char '${passage[i]}' (code ${code}) at pos ${i}`
        ).toBe(true);
      }
    });
  });

  it('contains straight quotes only, no smart quotes', () => {
    const curlyQuotes = /[“”‘’]/;
    PASSAGES.forEach((passage, idx) => {
      expect(curlyQuotes.test(passage), `Passage ${idx} has curly quotes: "${passage}"`).toBe(false);
    });
  });

  it('contains no newlines or double spaces', () => {
    PASSAGES.forEach((passage, idx) => {
      expect(passage.includes('\n'), `Passage ${idx} contains newline`).toBe(false);
      expect(passage.includes('\r'), `Passage ${idx} contains carriage return`).toBe(false);
      expect(passage.includes('  '), `Passage ${idx} contains double spaces`).toBe(false);
    });
  });

  it('getRandomPassage never returns the same passage consecutively', () => {
    let current = PASSAGES[0];
    for (let i = 0; i < 50; i++) {
      const next = getRandomPassage(current);
      expect(next).not.toBe(current);
      current = next;
    }
  });
});
