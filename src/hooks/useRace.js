import { useState, useRef, useCallback, useEffect } from 'react';
import {
  COUNTDOWN_STEP_MS,
  HUD_UPDATE_HZ,
  PLAYER_LANE,
  SMOOTHING_TAU_MS,
  PLAYER_INFO,
} from '../game/config.js';
import { getRandomPassage } from '../game/passages.js';
import { generateBotSchedules, getBotProgressAtTime } from '../game/botEngine.js';
import {
  detectFinishers,
  determineWinner,
  computeRankings,
  checkRaceConclusion,
  createRacerLaneList,
} from '../game/raceEngine.js';
import { parseSeedFromUrl, clamp } from '../game/raceUtils.js';
import { calculateWpm, calculateAccuracy } from '../game/typingEngine.js';

export function useRace() {
  const [phase, setPhase] = useState('start'); // 'start' | 'countdown' | 'racing' | 'results'
  const [difficulty, setDifficulty] = useState('medium');
  const [countdownValue, setCountdownValue] = useState(3); // 3, 2, 1, 'GO!'
  const [passage, setPassage] = useState(() => getRandomPassage());
  const [seed, setSeed] = useState(() => parseSeedFromUrl() ?? Math.floor(Math.random() * 1000000));

  // Mutable refs for high-frequency rAF loop
  const rafIdRef = useRef(null);
  const raceStartRef = useRef(0);
  const racersRef = useRef([]);
  const winnerRef = useRef(null);
  const firstFinishTimeRef = useRef(null);
  const lastHudUpdateRef = useRef(0);
  const playerSmoothedProgressRef = useRef(0);
  const lastFrameTimeRef = useRef(0);

  // Direct DOM references to car track nodes for 60fps CSS transform updates
  const carNodesRef = useRef([]);

  // React snapshot updated at ~10Hz for React components (HUD, Leaderboard, Results)
  const [hudSnapshot, setHudSnapshot] = useState({
    elapsedMs: 0,
    racers: [],
    winner: null,
    playerRank: 3,
    playerWpm: 0,
    playerAccuracy: 100,
    playerProgress: 0,
    playerFinished: false,
    conclusionReason: null,
  });

  // Reference to current player credited count provided by useTyping
  const playerCreditedRef = useRef(0);
  const playerStatsRef = useRef({ keystrokes: 0, correctKeystrokes: 0 });

  // Update player typing data from external typing engine
  const updatePlayerTyping = useCallback((credited, keystrokes, correctKeystrokes) => {
    playerCreditedRef.current = credited;
    playerStatsRef.current = { keystrokes, correctKeystrokes };
  }, []);

  // Stops and clears the rAF loop
  const stopLoop = useCallback(() => {
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  // Conclude race helper
  const concludeRace = useCallback((reason) => {
    stopLoop();
    setPhase('results');

    // Finalize stats
    const finalElapsed = Math.max(0, performance.now() - raceStartRef.current);
    const finalRacers = computeRankings(racersRef.current, passage.length);
    const finalWinner = determineWinner(finalRacers);
    const playerRacer = finalRacers.find((r) => r.isPlayer);

    setHudSnapshot((prev) => ({
      ...prev,
      elapsedMs: finalElapsed,
      racers: finalRacers,
      winner: finalWinner,
      playerRank: playerRacer ? playerRacer.rank : 6,
      playerWpm: playerRacer ? playerRacer.wpm : 0,
      playerAccuracy: playerRacer ? playerRacer.accuracy : 100,
      playerProgress: playerRacer ? playerRacer.progress : 0,
      playerFinished: playerRacer ? playerRacer.finishedAtMs != null : false,
      conclusionReason: reason,
    }));
  }, [stopLoop, passage.length]);

  // Main high-frequency rAF loop
  const runRaceFrame = useCallback(() => {
    const now = performance.now();
    const elapsedMs = Math.max(0, now - raceStartRef.current);
    const passageLength = passage.length;
    const deltaMs = lastFrameTimeRef.current > 0 ? (now - lastFrameTimeRef.current) : 16.6;
    lastFrameTimeRef.current = now;

    // 1. Update bot progress from their pure schedules
    const updatedRacers = racersRef.current.map((racer) => {
      if (racer.isPlayer) {
        const credited = playerCreditedRef.current;
        const isFin = racer.finishedAtMs != null || credited >= passageLength;
        const finTime = racer.finishedAtMs ?? (isFin ? elapsedMs : null);
        const wpm = calculateWpm(credited, elapsedMs, isFin, finTime);
        const acc = calculateAccuracy(
          playerStatsRef.current.keystrokes,
          playerStatsRef.current.correctKeystrokes
        );

        return {
          ...racer,
          progress: credited,
          wpm,
          accuracy: acc,
          finishedAtMs: finTime,
        };
      } else {
        // Pure bot progress at elapsedMs
        const botProg = getBotProgressAtTime(racer.schedule, elapsedMs, passageLength);
        const isFin = racer.finishedAtMs != null || botProg >= passageLength;
        const finTime = racer.finishedAtMs ?? (isFin ? racer.finishTimeMs : null);
        const wpm = calculateWpm(Math.floor(botProg), elapsedMs, isFin, finTime);

        return {
          ...racer,
          progress: botProg,
          wpm,
          finishedAtMs: finTime,
        };
      }
    });

    // 2. Detect finishers and determine winner
    const withFinishers = detectFinishers(updatedRacers, passageLength, elapsedMs);
    const currentWinner = determineWinner(withFinishers);
    if (currentWinner && !winnerRef.current) {
      winnerRef.current = currentWinner;
      firstFinishTimeRef.current = currentWinner.finishedAtMs;
    }

    // 3. Compute rankings
    const rankedRacers = computeRankings(withFinishers, passageLength);
    racersRef.current = rankedRacers;

    // 4. Smooth player visual position toward credited / passageLength
    const targetPlayerProg = playerCreditedRef.current;
    const smoothingFactor = Math.min(1, deltaMs / SMOOTHING_TAU_MS);
    playerSmoothedProgressRef.current += (targetPlayerProg - playerSmoothedProgressRef.current) * smoothingFactor;

    // 5. Update car DOM nodes directly for smooth 60fps translation
    for (let i = 0; i < 6; i++) {
      const node = carNodesRef.current[i];
      if (node) {
        const racer = rankedRacers.find((r) => r.laneIndex === i);
        if (racer) {
          const displayProg = racer.isPlayer
            ? playerSmoothedProgressRef.current
            : racer.progress;
          const pct = clamp(displayProg / passageLength, 0, 1) * 100;
          node.style.setProperty('--car-progress-pct', `${pct}%`);
        }
      }
    }

    // 6. Check conclusion rules
    const playerRacer = rankedRacers.find((r) => r.isPlayer);
    const conclusion = checkRaceConclusion({
      playerFinished: playerRacer?.finishedAtMs != null,
      firstFinishTimeMs: firstFinishTimeRef.current,
      elapsedMs,
    });

    if (conclusion.shouldConclude) {
      concludeRace(conclusion.reason);
      return;
    }

    // 7. Emit throttled React snapshot for HUD & UI (~10Hz)
    const intervalMs = 1000 / HUD_UPDATE_HZ;
    if (now - lastHudUpdateRef.current >= intervalMs) {
      lastHudUpdateRef.current = now;
      setHudSnapshot({
        elapsedMs,
        racers: rankedRacers,
        winner: winnerRef.current,
        playerRank: playerRacer ? playerRacer.rank : 3,
        playerWpm: playerRacer ? playerRacer.wpm : 0,
        playerAccuracy: playerRacer ? playerRacer.accuracy : 100,
        playerProgress: playerRacer ? playerRacer.progress : 0,
        playerFinished: playerRacer?.finishedAtMs != null,
        conclusionReason: null,
      });
    }

    // Continue frame loop
    rafIdRef.current = requestAnimationFrame(runRaceFrame);
  }, [passage.length, concludeRace]);

  // Starts the countdown sequence
  const startRace = useCallback(() => {
    stopLoop();
    // Choose fresh seed if not locked via URL
    const activeSeed = parseSeedFromUrl() ?? Math.floor(Math.random() * 1000000);
    setSeed(activeSeed);

    if (typeof console !== 'undefined' && console.log) {
      console.log(`[CyberSprint] Starting race with seed: ${activeSeed}, difficulty: ${difficulty}`);
    }

    // Pick new passage
    const nextPassage = getRandomPassage(passage);
    setPassage(nextPassage);

    // Initialize bot schedules
    const botEntries = generateBotSchedules(nextPassage, difficulty, activeSeed);
    const freshRacers = createRacerLaneList(botEntries, PLAYER_INFO);
    racersRef.current = freshRacers;
    winnerRef.current = null;
    firstFinishTimeRef.current = null;
    playerCreditedRef.current = 0;
    playerSmoothedProgressRef.current = 0;
    playerStatsRef.current = { keystrokes: 0, correctKeystrokes: 0 };
    lastFrameTimeRef.current = 0;

    // Reset car DOM styles
    for (let i = 0; i < 6; i++) {
      const node = carNodesRef.current[i];
      if (node) {
        node.style.setProperty('--car-progress-pct', '0%');
      }
    }

    // Set countdown phase
    setPhase('countdown');
    setCountdownValue(3);

    let step = 3;
    const interval = setInterval(() => {
      step -= 1;
      if (step > 0) {
        setCountdownValue(step);
      } else if (step === 0) {
        setCountdownValue('GO!');
      } else {
        clearInterval(interval);
        // Start live race
        raceStartRef.current = performance.now();
        lastHudUpdateRef.current = performance.now();
        setPhase('racing');
        rafIdRef.current = requestAnimationFrame(runRaceFrame);
      }
    }, COUNTDOWN_STEP_MS);

    return () => clearInterval(interval);
  }, [difficulty, passage, stopLoop, runRaceFrame]);

  // Skip ahead to results if winner exists
  const skipToResults = useCallback(() => {
    if (winnerRef.current) {
      concludeRace('PLAYER_SKIPPED');
    }
  }, [concludeRace]);

  // Restart race with same difficulty
  const playAgain = useCallback(() => {
    startRace();
  }, [startRace]);

  // Change difficulty / return to start screen
  const goToStart = useCallback(() => {
    stopLoop();
    setPhase('start');
  }, [stopLoop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopLoop();
  }, [stopLoop]);

  return {
    phase,
    difficulty,
    setDifficulty,
    countdownValue,
    passage,
    seed,
    hudSnapshot,
    carNodesRef,
    updatePlayerTyping,
    startRace,
    skipToResults,
    playAgain,
    goToStart,
  };
}
