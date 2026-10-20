import { useState, useRef, useCallback, useEffect } from 'react';
import {
  createTypingState,
  handleBackspace,
  applyInput,
} from '../game/typingEngine.js';

/**
 * Hook managing hidden input focus and typing interactions.
 * 
 * Architecture (mobile-compatible):
 * - The input is UNCONTROLLED (no `value` prop). React does not fight the
 *   native input value, which is critical for mobile virtual keyboards that
 *   do not reliably fire keydown with the actual character.
 * - onChange (via applyInput) is the SOLE source of character input on all
 *   platforms. This avoids the dual-processing bug where keydown processes
 *   a character and then onChange re-processes the same character from the
 *   native input value.
 * - keydown is used ONLY for Backspace (which fires reliably on all
 *   platforms) with e.preventDefault() to keep the input value in sync.
 * - Composition events (IME) are tracked to skip onChange during active
 *   composition, preventing partial/duplicate input from CJK keyboards
 *   or mobile predictive text.
 * - Blocks paste, drop, cut via onPaste/onDrop/onCut and onBeforeInput.
 * - Synchronizes with passage changes via useEffect.
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

  // Track IME composition state to skip onChange during active composition
  const composingRef = useRef(false);

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

  // Handle keydown — ONLY for Backspace.
  // All character input goes through onChange to avoid the mobile dual-processing bug.
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

      // Do NOT process characters here. Let them flow through to onChange.
      // On desktop, the native input will update and fire onChange.
      // On mobile, the virtual keyboard also updates the native input and fires onChange.
      // This is the key fix: a single code path for character input on all platforms.
    },
    []
  );

  // Handle onChange — the SOLE source of character input for all platforms.
  // applyInput diffs the new input value against the current typed state
  // and processes any appended characters or deletions atomically.
  const handleInputChange = useCallback(
    (e) => {
      // Skip onChange during active IME composition
      if (composingRef.current) {
        return;
      }

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

      // Fire onFirstKey on the very first character input
      if (!firstKeyFiredRef.current && onFirstKeyRef.current && currentState.keystrokes === 0) {
        const newValue = e.target.value;
        if (newValue.length > currentState.typed.length) {
          firstKeyFiredRef.current = true;
          onFirstKeyRef.current();
        }
      }

      const nowMs = performance.now();
      const nextState = applyInput(currentState, e.target.value, nowMs);

      typingStateRef.current = nextState;
      setTypingState(nextState);

      // Sync the input element to the engine's typed value.
      // This is important when the engine rejects or clamps input
      // (e.g., wrong buffer full, paste blocked).
      if (inputRef.current) {
        inputRef.current.value = nextState.typed;
      }

      if (nextState.finishedAtMs !== null && onPlayerFinish) {
        onPlayerFinish(nextState.finishedAtMs);
      }
    },
    [onPlayerFinish]
  );

  // Composition event handlers for IME input
  const handleCompositionStart = useCallback(() => {
    composingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback((e) => {
    composingRef.current = false;
    // Manually trigger input processing with the composed result.
    // Some browsers fire onChange before compositionend, some after.
    // Calling handleInputChange here ensures the final composed text is processed.
    handleInputChange(e);
  }, [handleInputChange]);

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
      // NO `value` prop — input is uncontrolled to avoid React fighting
      // with mobile virtual keyboards over the input's native value.
      // The input value is synced manually via inputRef.current.value.
      defaultValue: '',
      onChange: handleInputChange,
      onKeyDown: handleKeyDown,
      onCompositionStart: handleCompositionStart,
      onCompositionEnd: handleCompositionEnd,
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
      // Mobile UX: prevent zoom on focus, use a text input type
      // that doesn't trigger special mobile keyboard modes
      enterKeyHint: 'done',
    },
  };
}
