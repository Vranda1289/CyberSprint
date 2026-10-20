import React from 'react';
import { RacingCar } from './RacingCar.jsx';

export function RaceLane({
  laneIndex,
  racer,
  carRef,
  isRacing,
}) {
  const isPlayer = racer?.isPlayer;
  const isFinished = racer?.finishedAtMs != null;
  const progressPct = racer?.progressPct != null ? racer.progressPct : 0;

  return (
    <div className={`race-lane ${isPlayer ? 'player-lane' : ''}`}>
      {/* Lane Header Info */}
      <div className="lane-info-bar">
        <span className="lane-index">L{laneIndex + 1}</span>
        <span className="lane-racer-name" style={{ color: racer?.color || '#FFF' }}>
          {racer?.name}
        </span>
        {isPlayer && <span className="player-badge">YOU</span>}
        {racer?.rank && (
          <span className={`lane-rank-badge rank-${racer.rank}`}>
            #{racer.rank}
          </span>
        )}
      </div>

      {/* Track Surface with dashed markings */}
      <div className={`lane-track-surface ${isRacing ? 'is-active-scrolling' : ''}`}>
        <div className="start-grid-line" aria-hidden="true" />

        {/* Moving Car Container: transformed via direct DOM update */}
        <div
          ref={carRef}
          className="car-slider-slot"
          style={{ '--car-progress-pct': `${progressPct}%` }}
        >
          <RacingCar
            color={racer?.color}
            isPlayer={isPlayer}
            speed={racer?.wpm || 0}
            isFinished={isFinished}
            finishRank={racer?.rank}
          />
        </div>

        <div className="finish-checkered-line" aria-hidden="true" />
      </div>
    </div>
  );
}
