import React from 'react';
import { CATEGORIES } from '../game/passages.js';

export function CategorySelector({ selected = 'all', onSelect }) {
  return (
    <div className="category-selector-container" role="radiogroup" aria-label="Select Content Category">
      <div className="category-chips-grid">
        {CATEGORIES.map((cat) => {
          const isSelected = selected === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`category-chip ${isSelected ? 'is-selected' : ''}`}
              onClick={() => onSelect(cat.id)}
              title={cat.description}
            >
              <span className="category-icon" aria-hidden="true">{cat.icon}</span>
              <span className="category-label">{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
