import React from 'react';
import { DIFFICULTY_PROFILES } from '../game/config.js';

export function DifficultySelector({ selected, onSelect }) {
  const difficulties = ['easy', 'medium', 'hard'];

  return (
    <div
      className="difficulty-selector-group"
      role="radiogroup"
      aria-label="Select Race Difficulty"
    >
      {difficulties.map((level) => {
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
