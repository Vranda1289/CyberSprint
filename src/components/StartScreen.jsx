import React from 'react';
import { DifficultySelector } from './DifficultySelector.jsx';
import { RacingCar } from './RacingCar.jsx';

export function StartScreen({ difficulty, onSelectDifficulty, onStartRace }) {
  return (
    <div className="start-screen-container">
      {/* Animated Hero Branding */}
      <div className="start-hero">
        <div className="logo-badge">SYSTEM // ACTIVE</div>
        <h1 className="game-logo" data-text="CYBERSPRINT">
          CYBERSPRINT
        </h1>
        <p className="game-tagline">TYPE FAST. RACE HARD.</p>
      </div>

      {/* Mini Track Animated Preview */}
      <div className="mini-preview-container" aria-hidden="true">
        <div className="mini-track">
          <div className="mini-lane lane-1">
            <div className="mini-car-wrapper car-lead">
              <RacingCar color="#19E6FF" isPlayer={true} speed={75} />
            </div>
          </div>
          <div className="mini-lane lane-2">
            <div className="mini-car-wrapper car-chase-1">
              <RacingCar color="#FF3B5C" speed={65} />
            </div>
          </div>
          <div className="mini-lane lane-3">
            <div className="mini-car-wrapper car-chase-2">
              <RacingCar color="#9BEA3A" speed={55} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Configuration Card */}
      <div className="start-config-card">
        <div className="section-label">SELECT DIFFICULTY TIER</div>
        <DifficultySelector
          selected={difficulty}
          onSelect={onSelectDifficulty}
        />

        <div className="how-it-works">
          <h3>PROTOCOL BRIEFING:</h3>
          <ul>
            <li>Type accurately to accelerate your hovercar down the shared track.</li>
            <li>Typing errors engage dampeners: mistakes must be cleared with <strong>Backspace</strong>.</li>
            <li>Out-pace 5 autonomous neural bots to cross the checkered finish line first.</li>
          </ul>
        </div>

        <button
          id="start-race-btn"
          type="button"
          className="start-race-button"
          disabled={!difficulty}
          onClick={onStartRace}
        >
          <span className="btn-glitch-text">START RACE</span>
          <span className="btn-icon">▶</span>
        </button>

        {!difficulty && (
          <div className="start-selection-hint" role="status">
            Select a difficulty to start
          </div>
        )}
      </div>
    </div>
  );
}
