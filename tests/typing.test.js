import { describe, it, expect } from 'vitest';
import {
  createTypingState,
  handleCharacterInput,
  handleBackspace,
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
});
