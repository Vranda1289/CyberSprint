import React from 'react';

/**
 * Parameterized inline SVG Cyberpunk Hovercar.
 * Features:
 * - Angular aerodynamic chassis
 * - Cockpit canopy with neon specular reflection
 * - Dual rear vector thrusters with dynamic plasma boost flames
 * - Color customizable via props
 * - Player highlight ring and "YOU" badge when isPlayer=true
 */
export function RacingCar({
  color = '#19E6FF',
  isPlayer = false,
  speed = 0,
  isFinished = false,
  finishRank = null,
}) {
  const boostOpacity = Math.min(1, Math.max(0.2, speed / 80));
  const flameLength = Math.min(28, 10 + (speed / 100) * 18);

  return (
    <div
      className={`racing-car-wrapper ${isPlayer ? 'is-player' : ''} ${isFinished ? 'is-finished' : ''}`}
      style={{ '--car-color': color }}
    >
      {/* Player badge above car */}
      {isPlayer && <div className="car-player-tag">YOU</div>}

      {/* Finish position badge */}
      {isFinished && finishRank != null && (
        <div className="car-finish-badge">#{finishRank}</div>
      )}

      <svg
        className="racing-car-svg"
        viewBox="0 0 100 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* Neon Underglow Filter */}
          <filter id={`underglow-${color.replace('#', '')}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Jet Thruster Gradient */}
          <linearGradient id={`flame-${color.replace('#', '')}`} x1="100%" y1="50%" x2="0%" y2="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="40%" stopColor={color} stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FF3B5C" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Thruster exhaust flames (rear left and rear right) */}
        <polygon
          points={`6,14 ${6 - flameLength},18 6,22`}
          fill={`url(#flame-${color.replace('#', '')})`}
          opacity={boostOpacity}
          className="thruster-flame"
        />
        <polygon
          points={`6,22 ${6 - flameLength},26 6,30`}
          fill={`url(#flame-${color.replace('#', '')})`}
          opacity={boostOpacity}
          className="thruster-flame"
        />

        {/* Hovercar Shadow & Underglow */}
        <ellipse
          cx="48"
          cy="22"
          rx="38"
          ry="14"
          fill={color}
          opacity="0.28"
          filter={`url(#underglow-${color.replace('#', '')})`}
        />

        {/* Rear wings / fins */}
        <polygon points="6,6 18,14 10,20" fill="#0A1020" stroke={color} strokeWidth="1.2" />
        <polygon points="6,38 18,30 10,24" fill="#0A1020" stroke={color} strokeWidth="1.2" />

        {/* Main Chassis Body */}
        <path
          d="M12 12 L38 8 L72 12 L92 22 L72 32 L38 36 L12 32 L16 22 Z"
          fill="#0F1830"
          stroke={color}
          strokeWidth="1.6"
        />

        {/* Cockpit Canopy */}
        <polygon
          points="40,15 64,17 76,22 64,27 40,29 32,22"
          fill="#05070D"
          stroke="#E6F1FF"
          strokeWidth="0.8"
          opacity="0.9"
        />
        {/* Cockpit Glass Reflection */}
        <polygon points="44,17 60,18 50,22 36,21" fill={color} opacity="0.6" />

        {/* Forward Headlight Projectors */}
        <polygon points="86,18 94,22 86,26" fill={color} />
        <line x1="94" y1="22" x2="100" y2="22" stroke="#FFFFFF" strokeWidth="1.5" />

        {/* Player distinct outer accent ring */}
        {isPlayer && (
          <ellipse
            cx="48"
            cy="22"
            rx="46"
            ry="19"
            fill="none"
            stroke="#19E6FF"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.7"
          />
        )}
      </svg>
    </div>
  );
}
