import { useState, useRef, useCallback, useEffect } from 'react';
import {
  createTypingState,
  handleBackspace,
  applyInput,
} from '../game/typingEngine.js';

/**
 * Hook managing hidden input focus and typing interactions.
 * 
 * Architecture (mobile-compatible, v2 — fixes Android GBoard composition bug):
 *
 * ROOT CAUSE OF PREVIOUS BUG:
 * Android GBoard (and many mobile virtual keyboards) fires compositionStart /
 * compositionEnd for **every regular Latin keystroke**, not just for CJK IME.
 * The previous code skipped onChange when composingRef was true, which meant
 * that on Android almost every character was silently dropped by onChange.
 * The compositionEnd handler then tried to re-process via handleInputChange(e),
 * but `e` was the CompositionEvent (not an InputEvent), and on many browsers
 * `e.target.value` at that point was stale or reflected only the composed
 * segment, not the full input value. This caused a mismatch between what the
 * engine expected (`state.typed`) and what the DOM actually contained, leading
 * to every character after the first being treated as wrong.
 *
 * FIX:
 * - onChange is NEVER skipped based on composition state. It always reads
 *   `inputRef.current.value` (the live DOM value) and diffs it against
 *   `state.typed` via `applyInput`. This is safe because `applyInput` is
 *   idempotent when the value hasn't changed (returns the same state).
 * - compositionEnd also reads `inputRef.current.value` instead of relying on
 *   the event object, ensuring the full accumulated input is processed.
 * - Backspace is still handled in keydown with preventDefault to keep the
 *   DOM input value synchronized with engine state.
 * - Paste, drop, cut are still blocked.
 * - The input remains UNCONTROLLED (no `value` prop).
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

  /**
   * Core input processing function.
   * Reads the LIVE DOM input value and diffs it against engine state.
   * This is the single authoritative code path for character input on
   * all platforms (desktop keyboard, mobile virtual keyboard, IME).
   */
  const processInputValue = useCallback(
    () => {
      if (!inputRef.current) return;

      const newValue = inputRef.current.value;

      if (!isRacingRef.current) {
        inputRef.current.value = typingStateRef.current.typed;
        return;
      }

      const currentState = typingStateRef.current;
      if (currentState.finishedAtMs !== null) {
        inputRef.current.value = currentState.typed;
        return;
      }

      // No change — nothing to process (idempotent guard)
      if (newValue === currentState.typed) {
        return;
      }

      // Fire onFirstKey on the very first character input
      if (!firstKeyFiredRef.current && onFirstKeyRef.current && currentState.keystrokes === 0) {
        if (newValue.length > currentState.typed.length) {
          firstKeyFiredRef.current = true;
          onFirstKeyRef.current();
        }
      }

      const nowMs = performance.now();
      const nextState = applyInput(currentState, newValue, nowMs);

      typingStateRef.current = nextState;
      setTypingState(nextState);

      // Sync the input element to the engine's typed value.
      // Critical when the engine rejects or clamps input
      // (e.g., wrong buffer full, paste blocked, deletion past lock boundary).
      inputRef.current.value = nextState.typed;

      if (nextState.finishedAtMs !== null && onPlayerFinish) {
        onPlayerFinish(nextState.finishedAtMs);
      }
    },
    [onPlayerFinish]
  );

  // Handle keydown — ONLY for Backspace.
  // All character input goes through onChange / processInputValue.
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
    },
    []
  );

  // Handle onChange — fires on every input value change on all platforms.
  // On Android GBoard this may fire during or after composition — that's fine,
  // processInputValue reads the live DOM value and diffs idempotently.
  const handleInputChange = useCallback(
    () => {
      processInputValue();
    },
    [processInputValue]
  );

  // Composition events: do NOT gate onChange.
  // compositionEnd triggers an extra processInputValue call to ensure the
  // final composed value is captured even if onChange fired before
  // compositionEnd (browser-dependent ordering).
  const handleCompositionStart = useCallback(() => {
    // No-op: we intentionally do NOT set a composing flag.
    // onChange is allowed to fire during composition.
  }, []);

  const handleCompositionEnd = useCallback(() => {
    // Process the final composed value from the live DOM.
    // This is a safety net: if onChange already processed this value,
    // processInputValue will see no diff and return immediately (idempotent).
    processInputValue();
  }, [processInputValue]);

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
      'data-form-type': 'other',
      'data-lpignore': 'true',
      inputMode: 'text',
      tabIndex: 0,
      'aria-label': 'Typing Input Area',
      enterKeyHint: 'done',
    },
  };
}
