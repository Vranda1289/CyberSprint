import { useState, useRef, useCallback, useEffect } from 'react';
import {
  COUNTDOWN_STEP_MS,
  HUD_UPDATE_HZ,
  PLAYER_LANE,
  SMOOTHING_TAU_MS,
  PLAYER_INFO,
} from '../game/config.js';
import { getRandomPassageObject } from '../game/passages.js';
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
  const [difficulty, setDifficulty] = useState(null);
  const [category, setCategory] = useState('all');
  const [countdownValue, setCountdownValue] = useState(3); // 3, 2, 1, 'GO!'
  const [activePassage, setActivePassage] = useState(() => getRandomPassageObject(null, 'all'));
  const passage = activePassage.text;
  const [seed, setSeed] = useState(() => parseSeedFromUrl() ?? Math.floor(Math.random() * 1000000));

  // Mutable refs for high-frequency rAF loop & state synchronization
  const rafIdRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const raceStartRef = useRef(0);
  const racersRef = useRef([]);
  const winnerRef = useRef(null);
  const firstFinishTimeRef = useRef(null);
  const lastHudUpdateRef = useRef(0);
  const playerSmoothedProgressRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const passageRef = useRef(passage);
  const passageObjRef = useRef(activePassage);
  const difficultyRef = useRef(difficulty);
  const categoryRef = useRef(category);
  const hasConcludedRef = useRef(false);
  const playerFinishedRef = useRef(false);

  // Synchronize refs with state
  useEffect(() => {
    passageRef.current = passage;
    passageObjRef.current = activePassage;
  }, [passage, activePassage]);

  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  useEffect(() => {
    categoryRef.current = category;
  }, [category]);

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

  // Stops and clears the rAF loop and countdown timers
  const stopLoop = useCallback(() => {
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (countdownIntervalRef.current != null) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Conclude race helper - guarantees execution exactly once
  const concludeRace = useCallback((reason) => {
    if (hasConcludedRef.current) return;
    hasConcludedRef.current = true;
    stopLoop();

    const currentPassage = passageRef.current;
    const passageLength = currentPassage.length;
    const finalElapsed = Math.max(0, performance.now() - raceStartRef.current);

    // Finalize stats and rankings
    const isPlayerFin = playerFinishedRef.current || playerCreditedRef.current >= passageLength;
    const updatedRacers = racersRef.current.map((racer) => {
      if (racer.isPlayer) {
        const finTime = racer.finishedAtMs ?? (isPlayerFin ? finalElapsed : null);
        const wpm = calculateWpm(racer.progress, finalElapsed, isPlayerFin, finTime);
        const pct = clamp(racer.progress / passageLength, 0, 1) * 100;
        return {
          ...racer,
          finishedAtMs: finTime,
          wpm,
          progressPct: pct,
        };
      }
      return {
        ...racer,
        progressPct: clamp(racer.progress / passageLength, 0, 1) * 100,
      };
    });

    const finalRacers = computeRankings(updatedRacers, passageLength);
    const finalWinner = determineWinner(finalRacers);
    const playerRacer = finalRacers.find((r) => r.isPlayer);
    const recordedElapsed = playerRacer?.finishedAtMs != null ? playerRacer.finishedAtMs : finalElapsed;

    racersRef.current = finalRacers;
    winnerRef.current = finalWinner;

    setHudSnapshot((prev) => ({
      ...prev,
      elapsedMs: recordedElapsed,
      racers: finalRacers,
      winner: finalWinner,
      playerRank: playerRacer ? playerRacer.rank : 6,
      playerWpm: playerRacer ? playerRacer.wpm : 0,
      playerAccuracy: playerRacer ? playerRacer.accuracy : 100,
      playerProgress: playerRacer ? playerRacer.progress : 0,
      playerFinished: playerRacer ? playerRacer.finishedAtMs != null : false,
      conclusionReason: reason,
    }));

    setPhase('results');
  }, [stopLoop]);

  // Handle direct player completion event from typing engine
  const handlePlayerFinish = useCallback((finishTimeMs) => {
    if (hasConcludedRef.current) return;
    playerFinishedRef.current = true;
    const now = performance.now();
    const elapsedMs = raceStartRef.current > 0 ? Math.max(0, now - raceStartRef.current) : (finishTimeMs ?? 0);

    // Update player finish timestamp immediately
    racersRef.current = racersRef.current.map((racer) => {
      if (racer.isPlayer && racer.finishedAtMs == null) {
        return {
          ...racer,
          progress: passageRef.current.length,
          finishedAtMs: elapsedMs,
        };
      }
      return racer;
    });

    concludeRace('PLAYER_FINISHED');
  }, [concludeRace]);

  // Main high-frequency rAF loop
  const runRaceFrame = useCallback(() => {
    if (hasConcludedRef.current) return;

    const now = performance.now();
    const elapsedMs = Math.max(0, now - raceStartRef.current);
    const currentPassage = passageRef.current;
    const passageLength = currentPassage.length;
    const deltaMs = lastFrameTimeRef.current > 0 ? (now - lastFrameTimeRef.current) : 16.6;
    lastFrameTimeRef.current = now;

    // 1. Update bot progress from pure schedules and player typing
    const updatedRacers = racersRef.current.map((racer) => {
      if (racer.isPlayer) {
        const credited = playerCreditedRef.current;
        const isFin = racer.finishedAtMs != null || playerFinishedRef.current || credited >= passageLength;
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
          progressPct: clamp(credited / passageLength, 0, 1) * 100,
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
          progressPct: clamp(botProg / passageLength, 0, 1) * 100,
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
    const isPlayerFin = playerRacer?.finishedAtMs != null || playerFinishedRef.current || playerCreditedRef.current >= passageLength;
    const conclusion = checkRaceConclusion({
      playerFinished: isPlayerFin,
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
        playerFinished: isPlayerFin,
        conclusionReason: null,
      });
    }

    // Continue frame loop
    rafIdRef.current = requestAnimationFrame(runRaceFrame);
  }, [concludeRace]);

  // Starts the countdown sequence
  const startRace = useCallback(() => {
    const currentDiff = difficultyRef.current;
    if (!currentDiff) {
      return;
    }
    stopLoop();
    hasConcludedRef.current = false;
    playerFinishedRef.current = false;

    // Choose fresh seed if not locked via URL
    const activeSeed = parseSeedFromUrl() ?? Math.floor(Math.random() * 1000000);
    setSeed(activeSeed);

    if (typeof console !== 'undefined' && console.log) {
      console.log(`[CyberSprint] Starting race with seed: ${activeSeed}, difficulty: ${currentDiff}`);
    }

    // Pick new passage respecting category and avoiding immediate repeat
    const nextPassageObj = getRandomPassageObject(passageObjRef.current?.id, categoryRef.current);
    passageObjRef.current = nextPassageObj;
    setActivePassage(nextPassageObj);
    passageRef.current = nextPassageObj.text;
    const nextPassage = nextPassageObj.text;

    // Initialize bot schedules with the active passage and difficulty
    const botEntries = generateBotSchedules(nextPassage, currentDiff, activeSeed);
    const freshRacers = createRacerLaneList(botEntries, PLAYER_INFO).map((r) => ({
      ...r,
      progressPct: 0,
    }));
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

    // Initialize HUD immediately so lanes, names, and cars render on starting grid during countdown
    setHudSnapshot({
      elapsedMs: 0,
      racers: freshRacers,
      winner: null,
      playerRank: PLAYER_INFO.laneIndex + 1,
      playerWpm: 0,
      playerAccuracy: 100,
      playerProgress: 0,
      playerFinished: false,
      conclusionReason: null,
    });

    // Set countdown phase
    setPhase('countdown');
    setCountdownValue(3);

    let step = 3;
    countdownIntervalRef.current = setInterval(() => {
      step -= 1;
      if (step > 0) {
        setCountdownValue(step);
      } else if (step === 0) {
        setCountdownValue('GO!');
      } else {
        if (countdownIntervalRef.current != null) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        // Start live race
        raceStartRef.current = performance.now();
        lastHudUpdateRef.current = performance.now();
        lastFrameTimeRef.current = performance.now();
        setPhase('racing');
        rafIdRef.current = requestAnimationFrame(runRaceFrame);
      }
    }, COUNTDOWN_STEP_MS);
  }, [stopLoop, runRaceFrame]);

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
    setDifficulty(null);
    difficultyRef.current = null;
    hasConcludedRef.current = false;
    playerFinishedRef.current = false;
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
    category,
    setCategory,
    activePassage,
    countdownValue,
    passage,
    seed,
    hudSnapshot,
    carNodesRef,
    updatePlayerTyping,
    handlePlayerFinish,
    startRace,
    skipToResults,
    playAgain,
    goToStart,
  };
}
