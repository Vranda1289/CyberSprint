import React, { useEffect, useRef } from 'react';
import { useRace } from './hooks/useRace.js';
import { useTyping } from './hooks/useTyping.js';
import { StartScreen } from './components/StartScreen.jsx';
import { Countdown } from './components/Countdown.jsx';
import { RaceTrack } from './components/RaceTrack.jsx';
import { RaceHUD } from './components/RaceHUD.jsx';
import { TypingPanel } from './components/TypingPanel.jsx';
import { ResultsScreen } from './components/ResultsScreen.jsx';
import { MuteToggle } from './components/MuteToggle.jsx';
import {
  playCountdownBeep,
  playErrorSound,
  playWinSound,
  playDefeatSound,
} from './audio/sfx.js';

import './styles/tokens.css';
import './styles/global.css';
import './styles/start-screen.css';
import './styles/race-screen.css';
import './styles/results-screen.css';

export default function App() {
  const {
    phase,
    difficulty,
    setDifficulty,
    countdownValue,
    passage,
    hudSnapshot,
    carNodesRef,
    updatePlayerTyping,
    startRace,
    skipToResults,
    playAgain,
    goToStart,
  } = useRace();

  const isRacing = phase === 'racing';

  const {
    typingState,
    inputProps,
    isFocused,
    focusInput,
    resetTyping,
  } = useTyping({
    passage,
    isRacing,
    onPlayerFinish: (finishTime) => {
      // finish callback
    },
  });

  // Keep race loop informed of player typing progress
  useEffect(() => {
    updatePlayerTyping(
      typingState.credited,
      typingState.keystrokes,
      typingState.correctKeystrokes
    );
  }, [
    typingState.credited,
    typingState.keystrokes,
    typingState.correctKeystrokes,
    updatePlayerTyping,
  ]);

  // Audio: error buzz when wrongCount increments
  const prevWrongCountRef = useRef(0);
  useEffect(() => {
    if (typingState.wrongCount > prevWrongCountRef.current) {
      playErrorSound();
    }
    prevWrongCountRef.current = typingState.wrongCount;
  }, [typingState.wrongCount]);

  // Audio: countdown beeps
  useEffect(() => {
    if (phase === 'countdown') {
      playCountdownBeep(countdownValue === 'GO!');
    }
  }, [phase, countdownValue]);

  // Audio: race finish sound
  useEffect(() => {
    if (phase === 'results') {
      if (hudSnapshot.playerRank === 1) {
        playWinSound();
      } else {
        playDefeatSound();
      }
    }
  }, [phase, hudSnapshot.playerRank]);

  // Reset typing state on new race or restart
  const handleStartRace = () => {
    resetTyping(passage);
    startRace();
  };

  const handlePlayAgain = () => {
    resetTyping(passage);
    playAgain();
  };

  const handleChangeDifficulty = () => {
    resetTyping(passage);
    goToStart();
  };

  const playerRacer = hudSnapshot.racers.find((r) => r.isPlayer);
  const playerProgressPct = passage.length > 0
    ? (typingState.credited / passage.length) * 100
    : 0;

  return (
    <div className="cybersprint-app">
      <div className="scanline-overlay" aria-hidden="true" />

      {/* Global Top Navbar */}
      <header className="app-topbar">
        <div className="topbar-logo" onClick={goToStart} role="button" tabIndex={0}>
          <span className="logo-glitch">CYBERSPRINT</span>
          <span className="logo-version">// v1.0</span>
        </div>
        <div className="topbar-controls">
          <MuteToggle />
        </div>
      </header>

      {/* Main Game Phase Routing */}
      <main className="app-main-content">
        {phase === 'start' && (
          <StartScreen
            difficulty={difficulty}
            onSelectDifficulty={setDifficulty}
            onStartRace={handleStartRace}
          />
        )}

        {(phase === 'countdown' || phase === 'racing') && (
          <div className="race-screen-container">
            {phase === 'countdown' && <Countdown count={countdownValue} />}

            {/* Top: 6-Lane Track */}
            <RaceTrack
              racers={hudSnapshot.racers}
              carNodesRef={carNodesRef}
              isRacing={isRacing}
            />

            {/* Middle: Telemetry HUD */}
            <RaceHUD
              wpm={playerRacer?.wpm || hudSnapshot.playerWpm}
              accuracy={playerRacer?.accuracy || hudSnapshot.playerAccuracy}
              playerRank={hudSnapshot.playerRank}
              elapsedMs={hudSnapshot.elapsedMs}
              difficulty={difficulty}
              progressPct={playerProgressPct}
              winner={hudSnapshot.winner}
              isPlayerFinished={hudSnapshot.playerFinished}
              onSkipToResults={skipToResults}
            />

            {/* Bottom: Typing Terminal */}
            <TypingPanel
              passage={passage}
              typingState={typingState}
              inputProps={inputProps}
              isFocused={isFocused}
              onPanelClick={focusInput}
            />
          </div>
        )}

        {phase === 'results' && (
          <ResultsScreen
            racers={hudSnapshot.racers}
            winner={hudSnapshot.winner}
            playerRank={hudSnapshot.playerRank}
            playerWpm={hudSnapshot.playerWpm}
            playerAccuracy={hudSnapshot.playerAccuracy}
            elapsedMs={hudSnapshot.elapsedMs}
            difficulty={difficulty}
            onPlayAgain={handlePlayAgain}
            onChangeDifficulty={handleChangeDifficulty}
          />
        )}
      </main>
    </div>
  );
}
