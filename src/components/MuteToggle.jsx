import React, { useState } from 'react';
import { isAudioMuted, setAudioMuted } from '../audio/sfx.js';

export function MuteToggle() {
  const [muted, setMutedState] = useState(() => isAudioMuted());

  const handleToggle = () => {
    const next = !muted;
    setMutedState(next);
    setAudioMuted(next);
  };

  return (
    <button
      type="button"
      className="mute-toggle-btn"
      onClick={handleToggle}
      aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
      title={muted ? 'Unmute audio' : 'Mute audio'}
    >
      <span className="mute-icon" aria-hidden="true">
        {muted ? '🔇' : '🔊'}
      </span>
      <span className="mute-label">{muted ? 'MUTED' : 'AUDIO ON'}</span>
    </button>
  );
}
