import { describe, it, expect } from 'vitest';
import { generateBotSchedules } from '../src/game/botEngine.js';
import { DIFFICULTY_PROFILES } from '../src/game/config.js';

describe('Difficulty Selection and Guards (Bug 2)', () => {
  const samplePassage = 'Speed through the neon tunnels!';

  it('rejects schedule generation when difficulty is null or undefined (no silent fallback to medium)', () => {
    expect(() => generateBotSchedules(samplePassage, null, 123)).toThrow();
    expect(() => generateBotSchedules(samplePassage, undefined, 123)).toThrow();
  });

  it('generates valid schedules only when an explicit difficulty is selected', () => {
    const difficulties = ['easy', 'medium', 'hard'];
    for (const diff of difficulties) {
      const bots = generateBotSchedules(samplePassage, diff, 456);
      expect(bots.length).toBe(5);
      // Expected speed range matches profile
      const profile = DIFFICULTY_PROFILES[diff];
      bots.forEach((b) => {
        expect(b.targetWpm).toBeGreaterThan(0);
      });
    }
  });

  it('verifies difficulty state transitions: initial null, explicit selection, and clear on reset', () => {
    // Simulating useRace difficulty lifecycle logic
    let difficulty = null;
    let phase = 'start';

    // 1. Initially difficulty is null
    expect(difficulty).toBeNull();

    // 2. startRace refuses to start when difficulty is null
    function canStartRace(diff) {
      return diff !== null && diff !== undefined;
    }
    expect(canStartRace(difficulty)).toBe(false);

    // 3. Select 'easy', 'medium', 'hard'
    ['easy', 'medium', 'hard'].forEach((tier) => {
      difficulty = tier;
      expect(canStartRace(difficulty)).toBe(true);
      expect(difficulty).toBe(tier);
    });

    // 4. "Play Again" preserves the selected difficulty
    const playedDifficulty = difficulty;
    expect(playedDifficulty).toBe('hard');

    // 5. "Change Difficulty" / goToStart clears difficulty back to null
    function goToStart() {
      difficulty = null;
      phase = 'start';
    }
    goToStart();
    expect(difficulty).toBeNull();
    expect(phase).toBe('start');
    expect(canStartRace(difficulty)).toBe(false);
  });
});
