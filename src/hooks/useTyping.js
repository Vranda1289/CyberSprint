import { useState, useRef, useCallback, useEffect } from 'react';
import {
  createTypingState,
  handleBackspace,
  applyInput,
} from '../game/typingEngine.js';

/**
 * Maximum number of debug log entries to keep in memory.
 * Older entries are discarded to prevent memory issues.
 */
const MAX_DEBUG_LOG = 80;

/**
 * Hook managing hidden input focus and typing interactions.
 * 
 * Includes diagnostic instrumentation: every input-related event is recorded
 * to debugLogRef with full before/after state. The debug log is surfaced to
 * consumers via the returned object so a DebugPanel can render it.
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

  // ─── DIAGNOSTIC INSTRUMENTATION ───────────────────────────────────────
  // Debug log: ring buffer of event records, newest last.
  const debugLogRef = useRef([]);
  // Counter to force re-renders of the debug panel when log updates.
  const [debugTick, setDebugTick] = useState(0);
  // Track composition state for diagnostic display (NOT used for gating).
  const composingRef = useRef(false);

  function pushDebugEntry(entry) {
    const log = debugLogRef.current;
    log.push({ ...entry, ts: Date.now() });
    if (log.length > MAX_DEBUG_LOG) {
      log.splice(0, log.length - MAX_DEBUG_LOG);
    }
    setDebugTick((t) => t + 1);
  }
  // ─── END DIAGNOSTIC INSTRUMENTATION ───────────────────────────────────

  // Reset typing state when passage changes
  const resetTyping = useCallback((newPassage) => {
    const fresh = createTypingState(newPassage);
    typingStateRef.current = fresh;
    setTypingState(fresh);
    firstKeyFiredRef.current = false;
    debugLogRef.current = [];
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
   */
  const processInputValue = useCallback(
    (eventSource) => {
      if (!inputRef.current) return;

      const domValue = inputRef.current.value;
      const stateBefore = typingStateRef.current;

      if (!isRacingRef.current) {
        pushDebugEntry({
          evt: eventSource,
          domVal: domValue,
          engineTyped: stateBefore.typed,
          result: 'SKIP:not-racing',
          composing: composingRef.current,
        });
        inputRef.current.value = stateBefore.typed;
        return;
      }

      if (stateBefore.finishedAtMs !== null) {
        pushDebugEntry({
          evt: eventSource,
          domVal: domValue,
          engineTyped: stateBefore.typed,
          result: 'SKIP:finished',
          composing: composingRef.current,
        });
        inputRef.current.value = stateBefore.typed;
        return;
      }

      // Idempotent guard
      if (domValue === stateBefore.typed) {
        pushDebugEntry({
          evt: eventSource,
          domVal: domValue,
          engineTyped: stateBefore.typed,
          result: 'SKIP:no-change',
          composing: composingRef.current,
        });
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

      // ─── DIAGNOSTIC: detailed before/after comparison ────────────
      const isDeletion = domValue.length < stateBefore.typed.length;
      const appended = isDeletion ? '' : domValue.slice(stateBefore.typed.length);
      const expectedChar = stateBefore.passage[stateBefore.credited];
      const expectedCharCode = expectedChar ? expectedChar.charCodeAt(0) : undefined;
      const appendedCharCodes = appended ? [...appended].map(c => c.charCodeAt(0)) : [];

      let resultTag;
      if (nextState.credited > stateBefore.credited) {
        resultTag = `OK: Credited ${stateBefore.credited} -> ${nextState.credited} (matched "${expectedChar}")`;
      } else if (nextState.wrongCount > stateBefore.wrongCount) {
        if (stateBefore.wrongCount === 0) {
          resultTag = `ERR: Mismatch! Got "${appended}" [${appendedCharCodes.join(',')}] vs Expected "${expectedChar}" [${expectedCharCode}]`;
        } else {
          resultTag = `ERR: Extra wrong char "${appended}" (wrongCount ${stateBefore.wrongCount} -> ${nextState.wrongCount})`;
        }
      } else if (isDeletion) {
        resultTag = `DEL: Removed ${stateBefore.typed.length - domValue.length} char(s) (wrongCount ${stateBefore.wrongCount} -> ${nextState.wrongCount})`;
      } else if (nextState === stateBefore) {
        if (domValue.length === stateBefore.typed.length && domValue !== stateBefore.typed) {
          resultTag = `REJECTED: DOM value replaced with same length ("${domValue}" vs "${stateBefore.typed}")`;
        } else if (stateBefore.wrongCount >= 10) {
          resultTag = `REJECTED: Wrong buffer full (wrongCount=${stateBefore.wrongCount} >= 10), input blocked`;
        } else if (!domValue.startsWith(stateBefore.typed)) {
          resultTag = `REJECTED: Prefix mismatch (DOM "${domValue}" does not start with typed "${stateBefore.typed}")`;
        } else {
          resultTag = `REJECTED: applyInput returned same state (no change detected)`;
        }
      } else {
        resultTag = `UPDATED: credited=${nextState.credited}, wrongCount=${nextState.wrongCount}`;
      }

      pushDebugEntry({
        evt: eventSource,
        domVal: domValue,
        engineTypedBefore: stateBefore.typed,
        engineTypedAfter: nextState.typed,
        appended: appended || (isDeletion ? `[DEL ${stateBefore.typed.length - domValue.length}]` : ''),
        creditedBefore: stateBefore.credited,
        creditedAfter: nextState.credited,
        wrongBefore: stateBefore.wrongCount,
        wrongAfter: nextState.wrongCount,
        expectedChar,
        expectedCharCode,
        appendedCharCodes,
        result: resultTag,
        composing: composingRef.current,
      });
      // ─── END DIAGNOSTIC ──────────────────────────────────────────

      typingStateRef.current = nextState;
      setTypingState(nextState);

      // Sync the input element to the engine's typed value.
      inputRef.current.value = nextState.typed;

      if (nextState.finishedAtMs !== null && onPlayerFinish) {
        onPlayerFinish(nextState.finishedAtMs);
      }
    },
    [onPlayerFinish]
  );

  // Handle keydown — ONLY for Backspace.
  const handleKeyDown = useCallback(
    (e) => {
      // Allow Tab, Escape, and browser navigation keys to function normally
      if (e.key === 'Tab' || e.key === 'Escape' || e.altKey || e.ctrlKey || e.metaKey) {
        return;
      }

      // ─── DIAGNOSTIC: log every keydown ────────────────────────────
      pushDebugEntry({
        evt: 'keydown',
        key: e.key,
        code: e.code,
        isComposing: e.isComposing,
        composing: composingRef.current,
        domVal: inputRef.current?.value,
        engineTyped: typingStateRef.current.typed,
        result: e.key === 'Backspace' ? 'WILL-HANDLE' : 'PASS-THROUGH',
      });
      // ─── END DIAGNOSTIC ───────────────────────────────────────────

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

  // Handle onChange
  const handleInputChange = useCallback(
    () => {
      processInputValue('onChange');
    },
    [processInputValue]
  );

  // Composition events
  const handleCompositionStart = useCallback((e) => {
    composingRef.current = true;
    pushDebugEntry({
      evt: 'compositionStart',
      data: e.data,
      domVal: inputRef.current?.value,
      engineTyped: typingStateRef.current.typed,
      composing: true,
    });
  }, []);

  const handleCompositionUpdate = useCallback((e) => {
    pushDebugEntry({
      evt: 'compositionUpdate',
      data: e.data,
      domVal: inputRef.current?.value,
      engineTyped: typingStateRef.current.typed,
      composing: true,
    });
  }, []);

  const handleCompositionEnd = useCallback((e) => {
    pushDebugEntry({
      evt: 'compositionEnd',
      data: e.data,
      domVal: inputRef.current?.value,
      engineTyped: typingStateRef.current.typed,
      composing: false,
    });
    composingRef.current = false;
    processInputValue('compositionEnd');
  }, [processInputValue]);

  // Block paste and drop explicitly
  const handleBeforeInput = useCallback((e) => {
    pushDebugEntry({
      evt: 'beforeInput',
      inputType: e.inputType,
      data: e.data,
      domVal: inputRef.current?.value,
      engineTyped: typingStateRef.current.typed,
      composing: composingRef.current,
    });
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
    // Diagnostic data exposed for DebugPanel
    debugLogRef,
    debugTick,
    inputProps: {
      ref: inputRef,
      defaultValue: '',
      onChange: handleInputChange,
      onKeyDown: handleKeyDown,
      onCompositionStart: handleCompositionStart,
      onCompositionUpdate: handleCompositionUpdate,
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

