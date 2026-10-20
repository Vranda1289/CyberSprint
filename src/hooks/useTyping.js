import { useState, useRef, useCallback, useEffect } from 'react';
import {
  createTypingState,
  handleCharacterInput,
  handleBackspace,
} from '../game/typingEngine.js';

/**
 * Hook managing hidden input focus and typing interactions.
 * 
 * Rules (Section 4):
 * - Blocks paste, drop, cut.
 * - Handles single-character inputs and Backspace only.
 * - Rejects any input before race starts, after player finishes, or after race concludes.
 * - Refocuses on typing panel click. Does not trap Tab or Esc.
 */
export function useTyping({ passage, isRacing, onPlayerFinish, onFirstKey }) {
  const [typingState, setTypingState] = useState(() => createTypingState(passage));
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  // Keep state in a ref for synchronous access inside event listeners
  const typingStateRef = useRef(typingState);
  typingStateRef.current = typingState;

  const isRacingRef = useRef(isRacing);
  isRacingRef.current = isRacing;

  // Reset typing state when passage changes
  const resetTyping = useCallback((newPassage) => {
    const fresh = createTypingState(newPassage);
    typingStateRef.current = fresh;
    setTypingState(fresh);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
      setIsFocused(true);
    }
  }, []);

  // Handle keydown for Backspace and standard characters
  const handleKeyDown = useCallback(
    (e) => {
      // Allow Tab, Escape, and browser dev/navigation keys to function normally
      if (e.key === 'Tab' || e.key === 'Escape' || e.altKey || e.ctrlKey || e.metaKey) {
        return;
      }

      if (!isRacingRef.current) {
        return;
      }

      const currentState = typingStateRef.current;
      if (currentState.finishedAtMs !== null) {
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        const nextState = handleBackspace(currentState);
        typingStateRef.current = nextState;
        setTypingState(nextState);
        return;
      }

      // Normal single characters (letters, numbers, spaces, punctuation)
      if (e.key.length === 1) {
        e.preventDefault();
        if (onFirstKey && currentState.keystrokes === 0) {
          onFirstKey();
        }

        const nowMs = performance.now();
        const nextState = handleCharacterInput(currentState, e.key, nowMs);

        typingStateRef.current = nextState;
        setTypingState(nextState);

        // Check if this keypress finished the passage
        if (nextState.finishedAtMs !== null && onPlayerFinish) {
          onPlayerFinish(nextState.finishedAtMs);
        }
      }
    },
    [onPlayerFinish, onFirstKey]
  );

  // Paste / Cut / Drop handlers to strictly enforce typing rules
  const handlePaste = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
  }, []);

  // Auto-focus when racing begins
  useEffect(() => {
    if (isRacing && inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
      setIsFocused(true);
    }
  }, [isRacing]);

  return {
    typingState,
    typingStateRef,
    inputRef,
    isFocused,
    setIsFocused,
    focusInput,
    resetTyping,
    inputProps: {
      ref: inputRef,
      onKeyDown: handleKeyDown,
      onPaste: handlePaste,
      onDrop: handleDrop,
      onFocus: () => setIsFocused(true),
      onBlur: () => setIsFocused(false),
      autoComplete: 'off',
      autoCorrect: 'off',
      autoCapitalize: 'off',
      spellCheck: 'false',
      tabIndex: 0,
      'aria-label': 'Typing Input Area',
    },
  };
}
