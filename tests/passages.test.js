import { describe, it, expect } from 'vitest';
import {
  CATEGORIES,
  PASSAGE_BANK,
  PASSAGES,
  getPassagesByCategory,
  getRandomPassageObject,
  getRandomPassage,
} from '../src/game/passages.js';

describe('Upgraded Passages System', () => {
  it('contains at least 150 unique passages in the master catalog', () => {
    expect(PASSAGE_BANK.length).toBeGreaterThanOrEqual(150);
    // Ensure all IDs are unique
    const ids = PASSAGE_BANK.map((p) => p.id);
    expect(new Set(ids).size).toBe(PASSAGE_BANK.length);
    // Ensure all texts are unique
    const texts = PASSAGE_BANK.map((p) => p.text);
    expect(new Set(texts).size).toBe(PASSAGE_BANK.length);
  });

  it('distributes passages across all 8 required categories', () => {
    const requiredCategories = [
      'funny_relatable',
      'riddles',
      'universal_truths',
      'life_wisdom',
      'tech_humor',
      'gaming_culture',
      'weird_interesting',
      'short_stories',
    ];

    requiredCategories.forEach((cat) => {
      const passagesInCat = PASSAGE_BANK.filter((p) => p.category === cat);
      expect(
        passagesInCat.length,
        `Category '${cat}' has fewer than 15 passages`
      ).toBeGreaterThanOrEqual(15);
    });
  });

  it('includes a mixture of short, medium, and long passages', () => {
    const short = PASSAGE_BANK.filter((p) => p.text.length < 160);
    const medium = PASSAGE_BANK.filter((p) => p.text.length >= 160 && p.text.length <= 220);
    const long = PASSAGE_BANK.filter((p) => p.text.length > 220);

    expect(short.length).toBeGreaterThan(0);
    expect(medium.length).toBeGreaterThan(0);
    expect(long.length).toBeGreaterThan(0);

    // Ensure all passages are within practical typing limits (80 to 320 characters)
    PASSAGE_BANK.forEach((p, idx) => {
      expect(p.text.length).toBeGreaterThanOrEqual(80);
      expect(p.text.length).toBeLessThanOrEqual(320);
    });
  });

  it('each passage contains only printable ASCII characters (codes 32 to 126)', () => {
    PASSAGE_BANK.forEach((p, idx) => {
      for (let i = 0; i < p.text.length; i++) {
        const code = p.text.charCodeAt(i);
        expect(
          code >= 32 && code <= 126,
          `Passage ${p.id} contains non-ASCII char '${p.text[i]}' (code ${code}) at pos ${i}`
        ).toBe(true);
      }
    });
  });

  it('contains straight quotes only, no smart quotes', () => {
    const curlyQuotes = /[“”‘’]/;
    PASSAGE_BANK.forEach((p) => {
      expect(curlyQuotes.test(p.text), `Passage ${p.id} has curly quotes: "${p.text}"`).toBe(false);
    });
  });

  it('contains no newlines or double spaces', () => {
    PASSAGE_BANK.forEach((p) => {
      expect(p.text.includes('\n'), `Passage ${p.id} contains newline`).toBe(false);
      expect(p.text.includes('\r'), `Passage ${p.id} contains carriage return`).toBe(false);
      expect(p.text.includes('  '), `Passage ${p.id} contains double spaces`).toBe(false);
    });
  });

  it('category filtering works properly', () => {
    const riddles = getPassagesByCategory('riddles');
    expect(riddles.length).toBeGreaterThanOrEqual(20);
    riddles.forEach((r) => {
      expect(r.category).toBe('riddles');
      expect(r.answer).toBeDefined();
      expect(r.answer.length).toBeGreaterThan(0);
    });

    const all = getPassagesByCategory('all');
    expect(all.length).toBe(PASSAGE_BANK.length);
  });

  it('riddles store answers separately and never reveal the answer inside the passage text', () => {
    const riddles = getPassagesByCategory('riddles');
    riddles.forEach((r) => {
      expect(r.answer).toBeDefined();
      expect(r.answer.trim().length).toBeGreaterThan(0);
      // The answer must not be explicitly stated as the answer in the question text
      expect(r.text.toLowerCase().includes(`answer: ${r.answer.toLowerCase()}`)).toBe(false);
    });
  });

  it('getRandomPassage never returns the same passage consecutively when alternatives exist', () => {
    let current = getRandomPassage();
    for (let i = 0; i < 50; i++) {
      const next = getRandomPassage(current);
      expect(next).not.toBe(current);
      current = next;
    }
  });

  it('getRandomPassageObject supports category filtering and consecutive repeat avoidance', () => {
    let currentObj = getRandomPassageObject(null, 'tech_humor');
    expect(currentObj.category).toBe('tech_humor');

    for (let i = 0; i < 30; i++) {
      const nextObj = getRandomPassageObject(currentObj.id, 'tech_humor');
      expect(nextObj.category).toBe('tech_humor');
      expect(nextObj.id).not.toBe(currentObj.id);
      currentObj = nextObj;
    }
  });

  it('automatic mixed content pool avoids consecutive repeat and naturally mixes categories', () => {
    let currentObj = getRandomPassageObject();
    expect(currentObj).toBeDefined();
    expect(currentObj.text).toBeDefined();

    const seenCategories = new Set([currentObj.category]);

    for (let i = 0; i < 50; i++) {
      const nextObj = getRandomPassageObject(currentObj.id);
      // Immediately previous passage is never repeated
      expect(nextObj.id).not.toBe(currentObj.id);
      expect(nextObj.text).not.toBe(currentObj.text);

      // Natural mixing: consecutive races switch categories
      expect(nextObj.category).not.toBe(currentObj.category);

      seenCategories.add(nextObj.category);
      currentObj = nextObj;
    }

    // Over 50 races, multiple distinct categories are naturally drawn
    expect(seenCategories.size).toBeGreaterThanOrEqual(6);
  });
});
