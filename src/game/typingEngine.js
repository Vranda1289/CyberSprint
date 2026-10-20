import { MAX_WRONG_BUFFER, MIN_WPM_ELAPSED_MS } from './config.js';

/**
 * Creates the initial pure typing state for a given passage.
 * @param {string} passage 
 * @returns {TypingState}
 */
export function createTypingState(passage = '') {
  return {
    passage,
    typed: '',
    credited: 0,
    wrongCount: 0,
    keystrokes: 0,
    correctKeystrokes: 0,
    startedAtMs: null,
    finishedAtMs: null,
  };
}

/**
 * Handles character input from the player.
 * 
 * Rules:
 * - If already finished, no-op.
 * - Multi-character/paste attempts (char.length !== 1) are ignored.
 * - If wrongCount reaches MAX_WRONG_BUFFER, new characters are blocked until Backspace.
 * - Backspace does not increment keystrokes (only appended chars count as keystrokes).
 * - A keystroke is counted as "correct" if and only if:
 *     wrongCount === 0 AND char === passage[credited]
 * - Accuracy formula:
 *     Accuracy = (correctKeystrokes / keystrokes) * 100 (or 100 if keystrokes === 0).
 *     Subsequent corrections do not erase earlier mistakes from the accuracy count.
 * - Correct characters are permanently locked: credited never decreases.
 * - Finish event records finishedAtMs exactly once when credited === passage.length.
 *
 * @param {TypingState} state
 * @param {string} char
 * @param {number} nowMs - Elapsed milliseconds from race start
 * @returns {TypingState}
 */
export function handleCharacterInput(state, char, nowMs = 0) {
  // If already finished, reject any input
  if (state.finishedAtMs !== null) {
    return state;
  }

  // Reject multi-character/paste inputs
  if (typeof char !== 'string' || char.length !== 1) {
    return state;
  }

  // If wrong buffer is full, ignore extra input until backspaced
  if (state.wrongCount >= MAX_WRONG_BUFFER) {
    return state;
  }

  const expectedChar = state.passage[state.credited];
  const isMatch = state.wrongCount === 0 && char === expectedChar;

  const newKeystrokes = state.keystrokes + 1;
  const newStartedAtMs = state.startedAtMs === null ? nowMs : state.startedAtMs;

  if (isMatch) {
    const newCredited = state.credited + 1;
    const isFinished = newCredited === state.passage.length;
    const newFinishedAtMs = isFinished && state.finishedAtMs === null ? nowMs : state.finishedAtMs;

    return {
      ...state,
      typed: state.typed + char,
      credited: newCredited,
      wrongCount: 0,
      keystrokes: newKeystrokes,
      correctKeystrokes: state.correctKeystrokes + 1,
      startedAtMs: newStartedAtMs,
      finishedAtMs: newFinishedAtMs,
    };
  } else {
    // Mismatched char or continuing to type after a mistake
    return {
      ...state,
      typed: state.typed + char,
      credited: state.credited, // Locked, credited never decreases
      wrongCount: state.wrongCount + 1,
      keystrokes: newKeystrokes,
      correctKeystrokes: state.correctKeystrokes, // Not incremented on mistake
      startedAtMs: newStartedAtMs,
      finishedAtMs: state.finishedAtMs,
    };
  }
}

/**
 * Handles Backspace key press.
 * 
 * Rules:
 * - Backspace removes ONLY incorrect characters from the buffer.
 * - Correct characters are LOCKED: credited never decreases, and backspacing
 *   when wrongCount === 0 is a no-op.
 * - Backspace is not an appended character, so it does not increment keystrokes.
 *
 * @param {TypingState} state
 * @returns {TypingState}
 */
export function handleBackspace(state) {
  if (state.finishedAtMs !== null) {
    return state;
  }

  if (state.wrongCount > 0) {
    return {
      ...state,
      typed: state.typed.slice(0, -1),
      wrongCount: state.wrongCount - 1,
      // credited remains strictly unchanged
    };
  }

  // At lock boundary: cannot erase locked characters
  return state;
}

/**
 * Calculates current typing accuracy percentage (0 to 100).
 * 
 * Accuracy Formula:
 *   Accuracy = (correctKeystrokes / keystrokes) * 100
 * When keystrokes === 0, returns 100.
 *
 * @param {number} keystrokes
 * @param {number} correctKeystrokes
 * @returns {number}
 */
export function calculateAccuracy(keystrokes, correctKeystrokes) {
  if (!keystrokes || keystrokes <= 0) return 100;
  const acc = (correctKeystrokes / keystrokes) * 100;
  return Math.max(0, Math.min(100, Math.round(acc * 10) / 10));
}

/**
 * Calculates Words Per Minute (WPM).
 * Standard formula: (credited characters / 5) / elapsedMinutes
 * 
 * @param {number} credited - Number of correct characters
 * @param {number} elapsedMs - Current elapsed time in ms
 * @param {boolean} isFinished - Whether racer has finished
 * @param {number|null} finishedAtMs - Exact finish timestamp in ms if finished
 * @returns {number} WPM (rounded to 1 decimal place)
 */
export function calculateWpm(credited, elapsedMs, isFinished = false, finishedAtMs = null) {
  if (credited <= 0) return 0;

  let effectiveElapsedMs;
  if (isFinished && finishedAtMs != null) {
    effectiveElapsedMs = finishedAtMs;
  } else {
    // Floor elapsed time during live race to prevent extreme initial spikes
    effectiveElapsedMs = Math.max(elapsedMs, MIN_WPM_ELAPSED_MS);
  }

  if (effectiveElapsedMs <= 0) return 0;
  const elapsedMinutes = effectiveElapsedMs / 60000;
  const words = credited / 5;
  const wpm = words / elapsedMinutes;

  return Math.max(0, Math.round(wpm * 10) / 10);
}
