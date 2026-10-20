import React from 'react';
import { RacingCar } from './RacingCar.jsx';
import { formatTime } from '../game/raceUtils.js';

export function ResultsScreen({
  racers = [],
  winner = null,
  playerRank = 1,
  playerWpm = 0,
  playerAccuracy = 100,
  elapsedMs = 0,
  difficulty = 'medium',
  onPlayAgain,
  onChangeDifficulty,
}) {
  const isPlayerWinner = winner?.isPlayer === true || playerRank === 1;

  return (
    <div className="results-screen-container">
      {/* Restrained victory glow / confetti accent */}
      {isPlayerWinner && <div className="victory-confetti-burst" aria-hidden="true" />}

      {/* Hero Victory / Defeat Header */}
      <div className={`results-banner ${isPlayerWinner ? 'banner-win' : 'banner-loss'}`}>
        <div className="results-badge">
          {isPlayerWinner ? 'PODIUM FINISH // 1ST PLACE' : 'RACE CONCLUDED'}
        </div>
        <h1 className="results-title">
          {isPlayerWinner ? 'VICTORY' : 'DEFEAT'}
        </h1>
        <p className="results-subtitle">
          {isPlayerWinner
            ? 'Grid dominance established. Flawless neural cadence.'
            : `Rival ${winner?.name || 'AI'} claimed 1st place.`}
        </p>
      </div>

      {/* Main Highlights Grid */}
      <div className="results-stats-grid">
        <div className="stat-card">
          <span className="stat-label">FINAL POSITION</span>
          <span className={`stat-value ${playerRank === 1 ? 'text-cyan' : ''}`}>
            #{playerRank} <span className="stat-sub">/ 6</span>
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">TYPING SPEED</span>
          <span className="stat-value text-correct">
            {playerWpm} <span className="stat-sub">WPM</span>
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">ACCURACY</span>
          <span className="stat-value">
            {playerAccuracy}%
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">RACE TIME</span>
          <span className="stat-value font-mono">
            {formatTime(elapsedMs)}
          </span>
        </div>
      </div>

      {/* Full 6-Racer Leaderboard */}
      <div className="leaderboard-table-card">
        <div className="leaderboard-header">
          <span>OFFICIAL STANDINGS // {difficulty.toUpperCase()} CIRCUIT</span>
        </div>
        <div className="leaderboard-list">
          {racers.map((racer) => {
            const isFin = racer.finishedAtMs != null;
            const finishDisplay = isFin
              ? formatTime(racer.finishedAtMs)
              : `DNF (${Math.round((racer.progress / 100) * 100)}%)`;

            return (
              <div
                key={racer.id || racer.laneIndex}
                className={`leaderboard-row ${racer.isPlayer ? 'is-player-row' : ''} ${racer.rank === 1 ? 'is-winner-row' : ''}`}
              >
                <div className="row-rank">#{racer.rank}</div>
                <div className="row-car-preview" aria-hidden="true">
                  <RacingCar color={racer.color} speed={racer.wpm} />
                </div>
                <div className="row-name">
                  <span style={{ color: racer.color }}>{racer.name}</span>
                  {racer.isPlayer && <span className="player-tag-pill">YOU</span>}
                </div>
                <div className="row-speed font-mono">{racer.wpm} WPM</div>
                <div className="row-time font-mono">{finishDisplay}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="results-actions">
        <button
          id="play-again-btn"
          type="button"
          className="btn-primary"
          onClick={onPlayAgain}
        >
          PLAY AGAIN
        </button>
        <button
          id="change-diff-btn"
          type="button"
          className="btn-secondary"
          onClick={onChangeDifficulty}
        >
          CHANGE DIFFICULTY
        </button>
      </div>
    </div>
  );
}
