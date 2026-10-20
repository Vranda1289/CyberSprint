import React from 'react';

export function TypingPanel({
  passage = '',
  typingState,
  inputProps,
  isFocused,
  onPanelClick,
}) {
  const { credited, wrongCount, isError } = typingState;
  const passageChars = passage.split('');

  return (
    <div
      className={`typing-panel-container ${!isFocused ? 'focus-lost' : ''}`}
      onClick={onPanelClick}
      role="region"
      aria-label="Typing Passage Terminal"
    >
      {/* Hidden input to receive keyboard events */}
      <input
        {...inputProps}
        className="visually-hidden-input"
        type="text"
      />

      {/* Focus lost reminder badge */}
      {!isFocused && (
        <div className="focus-hint-badge" aria-live="polite">
          <span className="pulse-dot" /> CLICK TERMINAL TO FOCUS INPUT
        </div>
      )}

      {/* Terminal Header */}
      <div className="terminal-header">
        <span className="terminal-dot red" />
        <span className="terminal-dot yellow" />
        <span className="terminal-dot green" />
        <span className="terminal-title">NEURAL LINK // INPUT STREAM</span>
        <span className="terminal-status">
          {isError ? (
            <span className="text-error font-mono">ERROR DETECTED // BACKSPACE TO CLEAR</span>
          ) : (
            <span className="text-cyan font-mono">CADENCE LOCKED</span>
          )}
        </span>
      </div>

      {/* Main Passage Text Stream */}
      <div className="passage-display" aria-hidden="true">
        {passageChars.map((char, index) => {
          let charClass = 'char-upcoming';
          const isSpace = char === ' ';

          if (index < credited) {
            charClass = 'char-correct';
          } else if (index >= credited && index < credited + wrongCount) {
            charClass = 'char-wrong';
          } else if (index === credited + wrongCount) {
            charClass = 'char-current';
          }

          return (
            <span
              key={index}
              className={`passage-char ${charClass} ${isSpace ? 'is-space' : ''}`}
            >
              {char}
            </span>
          );
        })}
      </div>
    </div>
  );
}
