import React from 'react';
import { formatTime } from '../game/raceUtils.js';

export function RaceHUD({
  wpm = 0,
  accuracy = 100,
  playerRank = 1,
  elapsedMs = 0,
  difficulty = '',
  progressPct = 0,
  winner = null,
  isPlayerFinished = false,
  onSkipToResults,
}) {
  return (
    <div className="race-hud-container" role="region" aria-label="Race Telemetry">
      {/* Thin animated progress indicator */}
      <div className="hud-progress-bar-track">
        <div
          className="hud-progress-bar-fill"
          style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
        />
      </div>

      <div className="hud-chips-wrapper">
        {/* Speed / WPM */}
        <div className="hud-chip chip-wpm">
          <span className="chip-label">SPEED</span>
          <span className="chip-value">
            {wpm} <span className="chip-unit">WPM</span>
          </span>
        </div>

        {/* Accuracy */}
        <div className="hud-chip chip-accuracy">
          <span className="chip-label">ACCURACY</span>
          <span className="chip-value">
            {accuracy}%
          </span>
        </div>

        {/* Position / Rank */}
        <div className="hud-chip chip-rank">
          <span className="chip-label">POSITION</span>
          <span className="chip-value highlight-rank">
            {playerRank}<span className="chip-unit">/6</span>
          </span>
        </div>

        {/* Elapsed Time */}
        <div className="hud-chip chip-time">
          <span className="chip-label">ELAPSED</span>
          <span className="chip-value font-mono">
            {formatTime(elapsedMs)}
          </span>
        </div>

        {/* Difficulty Tier */}
        <div className="hud-chip chip-tier">
          <span className="chip-label">TIER</span>
          <span className="chip-value text-cyan">
            {difficulty.toUpperCase()}
          </span>
        </div>

        {/* Skip to results button when winner has crossed line */}
        {winner && !isPlayerFinished && onSkipToResults && (
          <button
            type="button"
            className="hud-skip-btn"
            onClick={onSkipToResults}
            title="Winner crossed the line! Skip remaining time to results."
          >
            SHOW RESULTS ▶
          </button>
        )}
      </div>
    </div>
  );
}
