import { useState, useRef, useCallback, useEffect } from 'react';
import {
  createTypingState,
  handleBackspace,
  applyInput,
} from '../game/typingEngine.js';

/**
 * Safely keeps the caret pinned to the end of the input value.
 * Prevents mobile virtual keyboards (Gboard) from placing the caret at index 0.
 *
 * @param {HTMLInputElement|null} input
 * @param {number} len
 */
const syncInputSelection = (input, len) => {
  if (!input) return;
  try {
    input.setSelectionRange(len, len);
  } catch (_) {
    // Ignore environments that do not support setSelectionRange
  }
};

/**
 * Hook managing hidden input focus, caret positioning, and typing interactions.
 * 
 * Guarantees that:
 * - Newly entered characters are processed in input order.
 * - Stale characters are never re-evaluated as new input.
 * - Input value and engine state stay strictly synchronized.
 * - Caret is pinned to the end so mobile keyboards don't prepend text.
 * - Desktop Backspace and mobile IME deletions work seamlessly without double-processing.
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

  // Track whether onFirstKey has been called (ref for stable closure access)
  const onFirstKeyRef = useRef(onFirstKey);
  onFirstKeyRef.current = onFirstKey;
  const firstKeyFiredRef = useRef(false);

  // Reset typing state when passage changes
  const resetTyping = useCallback((newPassage) => {
    const fresh = createTypingState(newPassage);
    typingStateRef.current = fresh;
    setTypingState(fresh);
    firstKeyFiredRef.current = false;
    if (inputRef.current) {
      inputRef.current.value = '';
      syncInputSelection(inputRef.current, 0);
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
      syncInputSelection(inputRef.current, typingStateRef.current.typed.length);
    }
  }, []);

  /**
   * Core input processing function.
   * Reads the live DOM input value and applies changes through the typing engine.
   */
  const processInputValue = useCallback(
    () => {
      if (!inputRef.current) return;

      const domValue = inputRef.current.value;
      const stateBefore = typingStateRef.current;

      if (!isRacingRef.current || stateBefore.finishedAtMs !== null) {
        inputRef.current.value = stateBefore.typed;
        syncInputSelection(inputRef.current, stateBefore.typed.length);
        return;
      }

      // Idempotent guard: if DOM matches engine state, nothing to do
      if (domValue === stateBefore.typed) {
        return;
      }

      // Fire onFirstKey on the very first character input
      if (!firstKeyFiredRef.current && onFirstKeyRef.current && stateBefore.keystrokes === 0) {
        if (domValue.length > stateBefore.typed.length) {
          firstKeyFiredRef.current = true;
          onFirstKeyRef.current();
        }
      }

      const nowMs = performance.now();
      const nextState = applyInput(stateBefore, domValue, nowMs);

      typingStateRef.current = nextState;
      setTypingState(nextState);

      // Keep DOM input value and caret position strictly synchronized
      if (inputRef.current) {
        inputRef.current.value = nextState.typed;
        syncInputSelection(inputRef.current, nextState.typed.length);
      }

      if (nextState.finishedAtMs !== null && onPlayerFinish) {
        onPlayerFinish(nextState.finishedAtMs);
      }
    },
    [onPlayerFinish]
  );

  // Handle keydown — ONLY for desktop Backspace.
  const handleKeyDown = useCallback(
    (e) => {
      // Allow browser shortcuts and navigation keys to work normally
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
          syncInputSelection(inputRef.current, nextState.typed.length);
        }
        return;
      }

      // Do NOT process character keys here. Let them flow to onChange.
    },
    []
  );

  // Handle onChange
  const handleInputChange = useCallback(() => {
    processInputValue();
  }, [processInputValue]);

  // Block paste, drop, and cut explicitly
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
      syncInputSelection(inputRef.current, typingStateRef.current.typed.length);
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
      onFocus: () => {
        setIsFocused(true);
        syncInputSelection(inputRef.current, typingStateRef.current.typed.length);
      },
      onBlur: () => setIsFocused(false),
      disabled: !isRacing || typingState.finishedAtMs !== null,
      autoComplete: 'off',
      autoCorrect: 'off',
      autoCapitalize: 'off',
      spellCheck: 'false',
      'data-form-type': 'other',
      'data-lpignore': 'true',
      inputMode: 'text',
      tabIndex: 0,
      'aria-label': 'Typing Input Area',
      enterKeyHint: 'done',
    },
  };
}
