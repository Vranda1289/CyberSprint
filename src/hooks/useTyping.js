import { useState, useRef, useCallback, useEffect } from 'react';
import {
  createTypingState,
  handleCharacterInput,
  handleBackspace,
  applyInput,
} from '../game/typingEngine.js';

/**
 * Hook managing hidden input focus and typing interactions.
 * 
 * Rules:
 * - Blocks paste, drop, cut via onPaste/onDrop/onCut and onBeforeInput.
 * - Synchronizes with passage changes via useEffect.
 * - Atomically synchronizes input value with typingState.typed.
 * - Handles both keydown events and input/change events for IME / rapid typing.
 * - Does not trap Tab or Escape.
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

  // Synchronize when passage prop changes
  useEffect(() => {
    resetTyping(passage);
  }, [passage, resetTyping]);

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
      setIsFocused(true);
    }
  }, []);

  // Handle keydown for Backspace and standard characters
  const handleKeyDown = useCallback(
    (e) => {
      // Allow Tab, Escape, and browser navigation keys to function normally
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
        if (inputRef.current) {
          inputRef.current.value = nextState.typed;
        }
        return;
      }

      // Normal single characters
      if (e.key.length === 1) {
        e.preventDefault();
        if (onFirstKey && currentState.keystrokes === 0) {
          onFirstKey();
        }

        const nowMs = performance.now();
        const nextState = handleCharacterInput(currentState, e.key, nowMs);

        typingStateRef.current = nextState;
        setTypingState(nextState);
        if (inputRef.current) {
          inputRef.current.value = nextState.typed;
        }

        if (nextState.finishedAtMs !== null && onPlayerFinish) {
          onPlayerFinish(nextState.finishedAtMs);
        }
      }
    },
    [onPlayerFinish, onFirstKey]
  );

  // Handle input / change events (e.g., IME composition or fast bursts)
  const handleInputChange = useCallback(
    (e) => {
      if (!isRacingRef.current) {
        if (inputRef.current) {
          inputRef.current.value = typingStateRef.current.typed;
        }
        return;
      }

      const currentState = typingStateRef.current;
      if (currentState.finishedAtMs !== null) {
        if (inputRef.current) {
          inputRef.current.value = currentState.typed;
        }
        return;
      }

      const nowMs = performance.now();
      const nextState = applyInput(currentState, e.target.value, nowMs);

      typingStateRef.current = nextState;
      setTypingState(nextState);
      if (inputRef.current) {
        inputRef.current.value = nextState.typed;
      }

      if (nextState.finishedAtMs !== null && onPlayerFinish) {
        onPlayerFinish(nextState.finishedAtMs);
      }
    },
    [onPlayerFinish]
  );

  // Block paste and drop explicitly
  const handleBeforeInput = useCallback((e) => {
    if (e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop') {
      e.preventDefault();
    }
  }, []);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleCut = useCallback((e) => {
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
      value: typingState.typed,
      onChange: handleInputChange,
      onKeyDown: handleKeyDown,
      onBeforeInput: handleBeforeInput,
      onPaste: handlePaste,
      onDrop: handleDrop,
      onCut: handleCut,
      onFocus: () => setIsFocused(true),
      onBlur: () => setIsFocused(false),
      disabled: !isRacing || typingState.finishedAtMs !== null,
      autoComplete: 'off',
      autoCorrect: 'off',
      autoCapitalize: 'off',
      spellCheck: 'false',
      tabIndex: 0,
      'aria-label': 'Typing Input Area',
    },
  };
}
