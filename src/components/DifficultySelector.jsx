import React from 'react';
import { DIFFICULTY_PROFILES } from '../game/config.js';

export function DifficultySelector({ selected = null, onSelect }) {
  const difficulties = ['easy', 'medium', 'hard'];

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = (index + 1) % difficulties.length;
      const nextDiff = difficulties[nextIdx];
      onSelect(nextDiff);
      const nextEl = document.getElementById(`difficulty-${nextDiff}`);
      if (nextEl) nextEl.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = (index - 1 + difficulties.length) % difficulties.length;
      const prevDiff = difficulties[prevIdx];
      onSelect(prevDiff);
      const prevEl = document.getElementById(`difficulty-${prevDiff}`);
      if (prevEl) prevEl.focus();
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onSelect(difficulties[index]);
    }
  };

  return (
    <div
      className="difficulty-selector-group"
      role="radiogroup"
      aria-label="Select Race Difficulty"
    >
      {difficulties.map((level, index) => {
        const profile = DIFFICULTY_PROFILES[level];
        const isSelected = selected === level;

        return (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={isSelected}
            id={`difficulty-${level}`}
            className={`difficulty-card ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelect(level)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            tabIndex={0}
          >
            <div className="difficulty-card-header">
              <span className="difficulty-name">{profile.label}</span>
              <span className="difficulty-speed">
                {profile.wpmRange[0]}–{profile.wpmRange[1]} WPM
              </span>
            </div>
            <p className="difficulty-desc">{profile.description}</p>
            <div className="selection-indicator" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
