import { describe, it, expect } from 'vitest';
import {
  createTypingState,
  handleCharacterInput,
  handleBackspace,
  applyInput,
  calculateAccuracy,
  calculateWpm,
} from '../src/game/typingEngine.js';
import { MAX_WRONG_BUFFER, MIN_WPM_ELAPSED_MS } from '../src/game/config.js';

describe('Typing Engine', () => {
  const samplePassage = 'Neon velocity, turbo 500!';

  it('correct typing advances credited count and moves along passage', () => {
    let state = createTypingState(samplePassage);
    expect(state.credited).toBe(0);

    state = handleCharacterInput(state, 'N', 100);
    expect(state.credited).toBe(1);
    expect(state.typed).toBe('N');
    expect(state.wrongCount).toBe(0);
    expect(state.keystrokes).toBe(1);
    expect(state.correctKeystrokes).toBe(1);

    state = handleCharacterInput(state, 'e', 200);
    expect(state.credited).toBe(2);
    expect(state.typed).toBe('Ne');
  });

  it('a wrong character does not advance credited count and registers error', () => {
    let state = createTypingState(samplePassage);
    state = handleCharacterInput(state, 'N', 100); // correct
    expect(state.credited).toBe(1);

    state = handleCharacterInput(state, 'x', 200); // wrong: expected 'e'
    expect(state.credited).toBe(1); // Locked, did not advance
    expect(state.wrongCount).toBe(1);
    expect(state.typed).toBe('Nx');
    expect(state.keystrokes).toBe(2);
    expect(state.correctKeystrokes).toBe(1);
  });

  it('respects wrong buffer limit (MAX_WRONG_BUFFER)', () => {
    let state = createTypingState(samplePassage);
    // Fill wrong buffer to limit
    for (let i = 0; i < MAX_WRONG_BUFFER; i++) {
      state = handleCharacterInput(state, 'z', 100 + i);
    }
    expect(state.wrongCount).toBe(MAX_WRONG_BUFFER);
    expect(state.typed.length).toBe(MAX_WRONG_BUFFER);

    // Attempting another character should be ignored
    const frozenState = handleCharacterInput(state, 'z', 999);
    expect(frozenState.wrongCount).toBe(MAX_WRONG_BUFFER);
    expect(frozenState.typed.length).toBe(MAX_WRONG_BUFFER);
    expect(frozenState.keystrokes).toBe(MAX_WRONG_BUFFER); // No increment
  });

  it('Backspace removes only wrong characters from buffer', () => {
    let state = createTypingState(samplePassage);
    state = handleCharacterInput(state, 'N', 100); // correct
    state = handleCharacterInput(state, 'x', 200); // wrong 1
    state = handleCharacterInput(state, 'y', 300); // wrong 2
    expect(state.wrongCount).toBe(2);
    expect(state.typed).toBe('Nxy');

    state = handleBackspace(state);
    expect(state.wrongCount).toBe(1);
    expect(state.typed).toBe('Nx');
    expect(state.credited).toBe(1);

    state = handleBackspace(state);
    expect(state.wrongCount).toBe(0);
    expect(state.typed).toBe('N');
    expect(state.credited).toBe(1);
  });

  it('locked characters cannot be erased with Backspace', () => {
    let state = createTypingState(samplePassage);
    state = handleCharacterInput(state, 'N', 100);
    state = handleCharacterInput(state, 'e', 200);
    expect(state.credited).toBe(2);
    expect(state.wrongCount).toBe(0);

    // Backspacing when no wrong characters are present must be a no-op
    const afterBackspace = handleBackspace(state);
    expect(afterBackspace.credited).toBe(2);
    expect(afterBackspace.typed).toBe('Ne');
    expect(afterBackspace.wrongCount).toBe(0);
  });

  it('multi-character or paste input is completely ignored', () => {
    let state = createTypingState(samplePassage);
    const beforeState = { ...state };

    const pasteAttempt = handleCharacterInput(state, 'Neon', 100);
    expect(pasteAttempt).toEqual(beforeState);

    const emptyAttempt = handleCharacterInput(state, '', 100);
    expect(emptyAttempt).toEqual(beforeState);
  });

  it('verifies space and punctuation exactness', () => {
    let state = createTypingState('Hi, there!');
    state = handleCharacterInput(state, 'H', 10);
    state = handleCharacterInput(state, 'i', 20);
    expect(state.credited).toBe(2);

    // Mismatched punctuation: typing '.' instead of ','
    state = handleCharacterInput(state, '.', 30);
    expect(state.credited).toBe(2);
    expect(state.wrongCount).toBe(1);

    // Fix error
    state = handleBackspace(state);
    expect(state.wrongCount).toBe(0);

    // Correct comma
    state = handleCharacterInput(state, ',', 40);
    expect(state.credited).toBe(3);

    // Correct space
    state = handleCharacterInput(state, ' ', 50);
    expect(state.credited).toBe(4);
    expect(state.wrongCount).toBe(0);
  });

  it('WPM formula: 50 characters in 12 seconds yields 50 WPM', () => {
    // (50 / 5) / (12000 / 60000) = 10 / 0.2 = 50 WPM
    const wpm = calculateWpm(50, 12000, true, 12000);
    expect(wpm).toBe(50);
  });

  it('WPM respects elapsed time floor (MIN_WPM_ELAPSED_MS)', () => {
    // Live WPM before floor has elapsed must use MIN_WPM_ELAPSED_MS (2000ms)
    // 5 characters in 500ms: using 2000ms gives (1 word) / (2/60 min) = 30 WPM
    const wpmAt500ms = calculateWpm(5, 500, false);
    const wpmAtFloor = (5 / 5) / (MIN_WPM_ELAPSED_MS / 60000);
    expect(wpmAt500ms).toBe(Math.round(wpmAtFloor * 10) / 10);
  });

  it('accuracy calculation does not get inflated by fixing mistakes', () => {
    // Player types: 'N' (correct), 'x' (mistake), Backspace, 'e' (correct)
    // Keystrokes = 3 (N, x, e; backspace does not count)
    // CorrectKeystrokes = 2 (N, e)
    // Accuracy = 2 / 3 * 100 = 66.7%
    let state = createTypingState(samplePassage);
    state = handleCharacterInput(state, 'N', 100);
    state = handleCharacterInput(state, 'x', 200);
    state = handleBackspace(state);
    state = handleCharacterInput(state, 'e', 300);

    expect(state.keystrokes).toBe(3);
    expect(state.correctKeystrokes).toBe(2);

    const acc = calculateAccuracy(state.keystrokes, state.correctKeystrokes);
    expect(acc).toBe(66.7);
  });

  it('finish timestamp is recorded exactly once when credited reaches passage length', () => {
    const shortPassage = 'Go!';
    let state = createTypingState(shortPassage);

    state = handleCharacterInput(state, 'G', 100);
    state = handleCharacterInput(state, 'o', 200);
    expect(state.finishedAtMs).toBeNull();

    state = handleCharacterInput(state, '!', 350);
    expect(state.credited).toBe(3);
    expect(state.finishedAtMs).toBe(350);

    // Any subsequent keypress is rejected and does not mutate finishedAtMs
    const postState = handleCharacterInput(state, '!', 500);
    expect(postState.finishedAtMs).toBe(350);
    expect(postState.credited).toBe(3);
  });

  // --- BUG 1 REPRODUCTION AND REGRESSION TESTS ---

  it('Bug 1 repro: typing wrong char at end of word, Backspace, then right char clears isError, advances credited, expectedChar is space', () => {
    // Passage: "Engage magnetic..."
    const testPassage = 'Engage magnetic';
    let state = createTypingState(testPassage);

    // Type "Engag" correctly
    for (const char of 'Engag') {
      state = handleCharacterInput(state, char, 100);
    }
    expect(state.credited).toBe(5);
    expect(state.wrongCount).toBe(0);

    // Type wrong character at end of word 'e': type 'x'
    state = handleCharacterInput(state, 'x', 200);
    expect(state.wrongCount).toBe(1);
    expect(state.isError).toBe(true);

    // Backspace removes error
    state = handleBackspace(state);
    expect(state.wrongCount).toBe(0);
    expect(state.isError).toBe(false);

    // Type correct character 'e'
    state = handleCharacterInput(state, 'e', 300);
    expect(state.credited).toBe(6);
    expect(state.wrongCount).toBe(0);
    expect(state.isError).toBe(false);
    expect(state.expectedChar).toBe(' ');
  });

  it('Bug 1 repro: same at final character of passage finishes race cleanly', () => {
    const testPassage = 'Win';
    let state = createTypingState(testPassage);
    state = handleCharacterInput(state, 'W', 10);
    state = handleCharacterInput(state, 'i', 20);
    expect(state.credited).toBe(2);

    // Mistake on final char 'n'
    state = handleCharacterInput(state, 'z', 30);
    expect(state.credited).toBe(2);
    expect(state.wrongCount).toBe(1);
    expect(state.isError).toBe(true);

    // Backspace
    state = handleBackspace(state);
    expect(state.wrongCount).toBe(0);
    expect(state.isError).toBe(false);

    // Correct final char 'n'
    state = handleCharacterInput(state, 'n', 50);
    expect(state.credited).toBe(3);
    expect(state.wrongCount).toBe(0);
    expect(state.isError).toBe(false);
    expect(state.expectedChar).toBeUndefined();
    expect(state.finishedAtMs).toBe(50);
  });

  it('Bug 1 repro: wrong char, Backspace, right char, then immediately type next word continues smoothly without extra Backspace', () => {
    const testPassage = 'Go fast';
    let state = createTypingState(testPassage);
    state = handleCharacterInput(state, 'G', 10);
    // Mistake on 'o'
    state = handleCharacterInput(state, 'x', 20);
    state = handleBackspace(state);
    // Correct 'o'
    state = handleCharacterInput(state, 'o', 30);
    expect(state.credited).toBe(2);
    expect(state.wrongCount).toBe(0);

    // Immediately type ' ' and 'f'
    state = handleCharacterInput(state, ' ', 40);
    expect(state.credited).toBe(3);
    expect(state.wrongCount).toBe(0);

    state = handleCharacterInput(state, 'f', 50);
    expect(state.credited).toBe(4);
    expect(state.wrongCount).toBe(0);
  });

  it('2-character input event (fast typing) is processed as sequential keystrokes via applyInput', () => {
    const testPassage = 'Speed';
    let state = createTypingState(testPassage);

    // Fast typing delivers 'Sp' in one input event
    state = applyInput(state, 'Sp', 100);
    expect(state.credited).toBe(2);
    expect(state.wrongCount).toBe(0);
    expect(state.keystrokes).toBe(2);
    expect(state.correctKeystrokes).toBe(2);
    expect(state.expectedChar).toBe('e');
  });

  it('paste events are blocked via applyInput with isPasteOrDrop flag', () => {
    const testPassage = 'Speed';
    let state = createTypingState(testPassage);
    const pasted = applyInput(state, 'Speed', 100, true);
    expect(pasted.typed).toBe('');
    expect(pasted.credited).toBe(0);
  });

  it('wrong-buffer limit reached -> extra input ignored -> input value stays equal to engine typed -> Backspace recovers', () => {
    const testPassage = 'Turbo';
    let state = createTypingState(testPassage);
    // Type 10 wrong characters via applyInput (buffer limit is MAX_WRONG_BUFFER = 5)
    state = applyInput(state, 'zzzzzzzzzz', 100);
    expect(state.wrongCount).toBe(MAX_WRONG_BUFFER);
    expect(state.typed.length).toBe(MAX_WRONG_BUFFER);
    expect(state.typed).toBe('zzzzz');

    // Trying to type more is ignored
    state = applyInput(state, 'zzzzzz', 110);
    expect(state.typed).toBe('zzzzz');
    expect(state.wrongCount).toBe(MAX_WRONG_BUFFER);

    // Backspace 5 times recovers cleanly
    for (let i = 0; i < MAX_WRONG_BUFFER; i++) {
      state = handleBackspace(state);
    }
    expect(state.wrongCount).toBe(0);
    expect(state.isError).toBe(false);
    expect(state.expectedChar).toBe('T');

    // Type correct 'T'
    state = handleCharacterInput(state, 'T', 200);
    expect(state.credited).toBe(1);
    expect(state.wrongCount).toBe(0);
    expect(state.expectedChar).toBe('u');
  });

  it('property test: credited never decreases and isError === (wrongCount > 0) across randomized operations', () => {
    const testPassage = 'The quick cyber hovercraft jumps over six neon barriers.';
    let state = createTypingState(testPassage);
    let prevCredited = 0;

    // Seeded random walk (using simple LCG)
    let seed = 424242;
    function rand() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }

    for (let step = 0; step < 300; step++) {
      const roll = rand();
      if (roll < 0.25) {
        // Backspace
        state = handleBackspace(state);
      } else if (roll < 0.65) {
        // Correct character (or try to)
        const nextExpected = testPassage[state.credited];
        if (nextExpected) {
          state = handleCharacterInput(state, nextExpected, step * 10);
        }
      } else {
        // Wrong character
        const wrongChar = String.fromCharCode(65 + Math.floor(rand() * 26));
        state = handleCharacterInput(state, wrongChar, step * 10);
      }

      // Assert invariant 1: credited never decreases
      expect(state.credited).toBeGreaterThanOrEqual(prevCredited);
      prevCredited = state.credited;

      // Assert invariant 2: isError always strictly equals wrongCount > 0
      expect(state.isError).toBe(state.wrongCount > 0);

      // Assert invariant 3: wrongCount is never negative
      expect(state.wrongCount).toBeGreaterThanOrEqual(0);

      // Assert invariant 4: wrongCount is bounded by MAX_WRONG_BUFFER
      expect(state.wrongCount).toBeLessThanOrEqual(MAX_WRONG_BUFFER);

      if (state.finishedAtMs !== null) {
        break;
      }
    }
  });

  // --- MOBILE TYPING BUG (Android GBoard composition) REGRESSION TESTS ---
  // These tests simulate what happens on Android: each keystroke arrives as
  // an applyInput call with the cumulative input value (the same way onChange
  // delivers the DOM input's value). This is the exact code path that was
  // broken when composition events caused onChange to be skipped.

  it('Mobile repro: sequential "Engage" via applyInput (simulating onChange with cumulative values)', () => {
    const testPassage = 'Engage magnetic dampeners';
    let state = createTypingState(testPassage);

    // Simulate Android GBoard: each keystroke updates the input value cumulatively
    state = applyInput(state, 'E', 100);
    expect(state.credited).toBe(1);
    expect(state.wrongCount).toBe(0);
    expect(state.isError).toBe(false);
    expect(state.expectedChar).toBe('n');

    state = applyInput(state, 'En', 200);
    expect(state.credited).toBe(2);
    expect(state.wrongCount).toBe(0);
    expect(state.expectedChar).toBe('g');

    state = applyInput(state, 'Eng', 300);
    expect(state.credited).toBe(3);
    expect(state.expectedChar).toBe('a');

    state = applyInput(state, 'Enga', 400);
    expect(state.credited).toBe(4);
    expect(state.expectedChar).toBe('g');

    state = applyInput(state, 'Engag', 500);
    expect(state.credited).toBe(5);
    expect(state.expectedChar).toBe('e');

    state = applyInput(state, 'Engage', 600);
    expect(state.credited).toBe(6);
    expect(state.wrongCount).toBe(0);
    expect(state.isError).toBe(false);
    expect(state.expectedChar).toBe(' ');
  });

  it('Mobile repro: wrong char followed by Backspace and correct char', () => {
    const testPassage = 'Engage';
    let state = createTypingState(testPassage);

    // Type E correctly
    state = applyInput(state, 'E', 100);
    expect(state.credited).toBe(1);

    // Type wrong char 'x' instead of 'n'
    state = applyInput(state, 'Ex', 200);
    expect(state.credited).toBe(1);
    expect(state.wrongCount).toBe(1);
    expect(state.isError).toBe(true);

    // Backspace (remove 'x', input value back to 'E')
    state = handleBackspace(state);
    expect(state.wrongCount).toBe(0);
    expect(state.isError).toBe(false);
    expect(state.typed).toBe('E');

    // Now type correct 'n' — input value is 'En'
    state = applyInput(state, 'En', 300);
    expect(state.credited).toBe(2);
    expect(state.wrongCount).toBe(0);
    expect(state.isError).toBe(false);
    expect(state.expectedChar).toBe('g');
  });

  it('Mobile repro: multiple characters arriving in a single input change', () => {
    const testPassage = 'Engage';
    let state = createTypingState(testPassage);

    // Android autocomplete might deliver 'Eng' in one shot
    state = applyInput(state, 'Eng', 100);
    expect(state.credited).toBe(3);
    expect(state.wrongCount).toBe(0);
    expect(state.keystrokes).toBe(3);
    expect(state.correctKeystrokes).toBe(3);
  });

  it('Mobile repro: spaces and punctuation work correctly via applyInput', () => {
    const testPassage = 'Go, now!';
    let state = createTypingState(testPassage);

    state = applyInput(state, 'G', 100);
    state = applyInput(state, 'Go', 200);
    state = applyInput(state, 'Go,', 300);
    state = applyInput(state, 'Go, ', 400);
    state = applyInput(state, 'Go, n', 500);
    state = applyInput(state, 'Go, no', 600);
    state = applyInput(state, 'Go, now', 700);
    state = applyInput(state, 'Go, now!', 800);

    expect(state.credited).toBe(8);
    expect(state.wrongCount).toBe(0);
    expect(state.isError).toBe(false);
    expect(state.finishedAtMs).toBe(800);
  });

  it('Mobile repro: passage completion triggers finishedAtMs', () => {
    const testPassage = 'Win';
    let state = createTypingState(testPassage);

    state = applyInput(state, 'W', 100);
    state = applyInput(state, 'Wi', 200);
    expect(state.finishedAtMs).toBeNull();

    state = applyInput(state, 'Win', 300);
    expect(state.credited).toBe(3);
    expect(state.finishedAtMs).toBe(300);

    // Further input after finish is rejected
    state = applyInput(state, 'Win!', 400);
    expect(state.finishedAtMs).toBe(300);
    expect(state.typed).toBe('Win');
  });

  it('Mobile repro: idempotent — same value delivered twice does not double-count', () => {
    const testPassage = 'Engage';
    let state = createTypingState(testPassage);

    state = applyInput(state, 'E', 100);
    expect(state.credited).toBe(1);
    expect(state.keystrokes).toBe(1);

    // Same value again (simulates onChange + compositionEnd both firing)
    state = applyInput(state, 'E', 150);
    expect(state.credited).toBe(1);
    expect(state.keystrokes).toBe(1); // NOT double-counted
  });

  it('Desktop regression: handleCharacterInput still works for direct keystroke processing', () => {
    const testPassage = 'Engage';
    let state = createTypingState(testPassage);

    for (const char of 'Engage') {
      state = handleCharacterInput(state, char, 100);
    }
    expect(state.credited).toBe(6);
    expect(state.wrongCount).toBe(0);
    expect(state.finishedAtMs).toBe(100);
  });
});

