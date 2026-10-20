import React from 'react';

export function Countdown({ count }) {
  return (
    <div className="countdown-overlay" role="region" aria-label="Race Countdown">
      <div
        className="countdown-digit-wrapper"
        key={count} // re-triggers CSS punch-in animation on change
        aria-live="polite"
        aria-atomic="true"
      >
        <div className={`countdown-number ${count === 'GO!' ? 'is-go' : ''}`}>
          {count}
        </div>
        <div className="countdown-subtext">
          {count === 'GO!' ? 'ENGAGE SYSTEM THRUST' : 'SYNCHRONIZING ENGINES'}
        </div>
      </div>
    </div>
  );
}
