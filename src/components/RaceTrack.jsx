import React from 'react';
import { RaceLane } from './RaceLane.jsx';

export function RaceTrack({ racers = [], carNodesRef, isRacing }) {
  // Ensure exactly 6 lanes are mapped
  const lanes = [0, 1, 2, 3, 4, 5];

  return (
    <div className="race-track-container" role="region" aria-label="CyberSprint Track">
      <div className="track-header">
        <div className="track-decor-line" />
        <span className="track-title">NEO METROPOLIS // SECTOR 07 CIRCUIT</span>
        <div className="track-decor-line" />
      </div>

      <div className="track-lanes-wrapper">
        {lanes.map((laneIdx) => {
          const racer = racers.find((r) => r.laneIndex === laneIdx);
          return (
            <RaceLane
              key={laneIdx}
              laneIndex={laneIdx}
              racer={racer}
              isRacing={isRacing}
              carRef={(el) => {
                if (carNodesRef && carNodesRef.current) {
                  carNodesRef.current[laneIdx] = el;
                }
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
