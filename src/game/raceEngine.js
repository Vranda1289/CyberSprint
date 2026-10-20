import { POST_WINNER_WINDOW_MS, RACE_HARD_CAP_MS, PLAYER_LANE } from './config.js';

/**
 * Pure functions for race state evaluation, rankings, finish detection, and conclusion.
 */

/**
 * Detects new finishers and returns updated racer list with fixed finish times.
 * Rule: Finished racers can never finish again.
 *
 * @param {Array<object>} racers
 * @param {number} passageLength
 * @param {number} nowMs - Elapsed race time
 * @returns {Array<object>}
 */
export function detectFinishers(racers, passageLength, nowMs) {
  return racers.map((racer) => {
    if (racer.finishedAtMs != null) {
      return racer; // Already finished, immutable finish time
    }
    if (racer.progress >= passageLength) {
      return {
        ...racer,
        progress: passageLength,
        finishedAtMs: nowMs,
      };
    }
    return racer;
  });
}

/**
 * Determines the current winner.
 * Rule: Earliest recorded finish time. Ties broken by lower lane index.
 *
 * @param {Array<object>} racers
 * @returns {object|null} Winning racer or null
 */
export function determineWinner(racers) {
  const finishers = racers.filter((r) => r.finishedAtMs != null);
  if (finishers.length === 0) return null;

  return finishers.reduce((best, curr) => {
    if (!best) return curr;
    if (curr.finishedAtMs < best.finishedAtMs) return curr;
    if (curr.finishedAtMs === best.finishedAtMs && curr.laneIndex < best.laneIndex) return curr;
    return best;
  }, null);
}

/**
 * Computes official leaderboard rankings.
 * Rule:
 * 1. Finishers ranked first, ordered by finishTimeMs ascending (ties broken by laneIndex).
 * 2. Unfinished racers ranked next, ordered by progress descending (ties broken by laneIndex).
 *
 * @param {Array<object>} racers
 * @param {number} passageLength
 * @returns {Array<object>} Racers with assigned `rank` (1-indexed)
 */
export function computeRankings(racers, passageLength) {
  const finishers = racers
    .filter((r) => r.finishedAtMs != null)
    .sort((a, b) => {
      if (a.finishedAtMs !== b.finishedAtMs) {
        return a.finishedAtMs - b.finishedAtMs;
      }
      return a.laneIndex - b.laneIndex;
    });

  const unfinished = racers
    .filter((r) => r.finishedAtMs == null)
    .sort((a, b) => {
      if (b.progress !== a.progress) {
        return b.progress - a.progress;
      }
      return a.laneIndex - b.laneIndex;
    });

  const ordered = [...finishers, ...unfinished];
  return ordered.map((racer, index) => ({
    ...racer,
    rank: index + 1,
  }));
}

/**
 * Checks if the race should conclude.
 * Rules (Section 6):
 * - Player finishes OR
 * - POST_WINNER_WINDOW_MS (15,000ms) after first finisher OR
 * - RACE_HARD_CAP_MS (120,000ms) elapsed.
 *
 * @param {object} params
 * @param {boolean} params.playerFinished
 * @param {number|null} params.firstFinishTimeMs
 * @param {number} params.elapsedMs
 * @returns {{ shouldConclude: boolean, reason: string|null }}
 */
export function checkRaceConclusion({ playerFinished, firstFinishTimeMs, elapsedMs }) {
  if (playerFinished) {
    return { shouldConclude: true, reason: 'PLAYER_FINISHED' };
  }

  if (firstFinishTimeMs != null && elapsedMs >= firstFinishTimeMs + POST_WINNER_WINDOW_MS) {
    return { shouldConclude: true, reason: 'POST_WINNER_WINDOW_EXPIRED' };
  }

  if (elapsedMs >= RACE_HARD_CAP_MS) {
    return { shouldConclude: true, reason: 'HARD_CAP_EXPIRED' };
  }

  return { shouldConclude: false, reason: null };
}

/**
 * Initializes pure racer entries for the 6 lanes.
 * Lane 0: Bot 0
 * Lane 1: Bot 1
 * Lane 2: Player (PLAYER_LANE)
 * Lane 3: Bot 2
 * Lane 4: Bot 3
 * Lane 5: Bot 4
 *
 * @param {Array<object>} botEntries - From botEngine
 * @param {object} playerInfo - From config
 * @returns {Array<object>} 6 racer structures
 */
export function createRacerLaneList(botEntries, playerInfo) {
  const racers = new Array(6);

  // Assign Player to PLAYER_LANE (lane 2)
  racers[PLAYER_LANE] = {
    id: playerInfo.id,
    name: playerInfo.name,
    color: playerInfo.color,
    laneIndex: PLAYER_LANE,
    isPlayer: true,
    progress: 0,
    wpm: 0,
    accuracy: 100,
    finishedAtMs: null,
    rank: PLAYER_LANE + 1,
  };

  // Distribute 5 bots across remaining lanes: 0, 1, 3, 4, 5
  let botIdx = 0;
  for (let lane = 0; lane < 6; lane++) {
    if (lane === PLAYER_LANE) continue;
    const botData = botEntries[botIdx];
    racers[lane] = {
      id: botData.bot.id,
      name: botData.bot.name,
      color: botData.bot.color,
      laneIndex: lane,
      isPlayer: false,
      progress: 0,
      wpm: 0,
      targetWpm: botData.targetWpm,
      accuracy: botData.accuracy,
      schedule: botData.schedule,
      finishTimeMs: botData.finishTimeMs,
      finishedAtMs: null,
      rank: lane + 1,
    };
    botIdx++;
  }

  return racers;
}
