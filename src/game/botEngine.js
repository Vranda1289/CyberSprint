import { createPRNG, deriveSeed } from './prng.js';
import { DIFFICULTY_PROFILES, BOT_ROSTER } from './config.js';
import { lerp, clamp } from './raceUtils.js';

/**
 * Generates deterministic typing/racing schedules for all 5 AI bots.
 * 
 * Each bot's schedule is an array of timestamps `t[i]` in milliseconds (relative
 * to race start) when character i (0 <= i < passageLength) is completed.
 *
 * Rules (Section 5):
 * - Independent PRNG stream per bot (derived from raceSeed + botIndex).
 * - Bot progress is a pure function of elapsed time t.
 * - Bots NEVER read the player's progress (no rubber-banding).
 *
 * @param {string} passage - The target text to type
 * @param {string} difficulty - 'easy' | 'medium' | 'hard'
 * @param {number} raceSeed - Seed for the race
 * @returns {Array<{ bot: object, schedule: number[], targetWpm: number, accuracy: number, finishTimeMs: number }>}
 */
export function generateBotSchedules(passage, difficulty, raceSeed) {
  const profile = DIFFICULTY_PROFILES[difficulty];
  if (!profile) {
    throw new Error(`Invalid or missing difficulty: "${difficulty}"`);
  }
  const passageLength = passage.length;
  const numBots = BOT_ROSTER.length;

  // Race-wide PRNG for per-race macro jitter
  const racePrng = createPRNG(raceSeed);
  const raceMacroJitter = (racePrng() * 2 - 1) * profile.perRaceJitter;

  return BOT_ROSTER.map((bot, botIndex) => {
    // Derive unique, independent PRNG stream for this bot
    const botSeed = deriveSeed(raceSeed, botIndex);
    const botPrng = createPRNG(botSeed);

    // Spread bot baseline across wpmRange using its skillRank (0 to 4)
    const skillFraction = numBots > 1 ? bot.skillRank / (numBots - 1) : 0.5;
    const baselineWpm = lerp(profile.wpmRange[0], profile.wpmRange[1], skillFraction);

    // Apply race-level jitter and bot-specific micro-jitter
    const botMicroJitter = (botPrng() * 2 - 1) * 0.04;
    const effectiveWpm = Math.max(10, baselineWpm * (1 + raceMacroJitter + botMicroJitter));

    // Determine bot accuracy for this race
    const botAccuracy = lerp(profile.accuracyRange[0], profile.accuracyRange[1], botPrng());

    // Base interval per character in milliseconds: 60000 / (WPM * 5)
    const baseCharInterval = 60000 / (effectiveWpm * 5);

    const schedule = new Array(passageLength);
    let cumulativeMs = 0;

    for (let i = 0; i < passageLength; i++) {
      // 1. Burstiness / natural cadence noise
      const intervalNoise = (botPrng() * 2 - 1) * profile.burstiness;
      let stepInterval = Math.max(10, baseCharInterval * (1 + intervalNoise));

      // 2. Error penalty: simulated mistake requiring Backspace correction
      const rollError = botPrng();
      if (rollError > botAccuracy) {
        const errorPenalty = lerp(profile.errorPenaltyMs[0], profile.errorPenaltyMs[1], botPrng());
        stepInterval += errorPenalty;
      }

      // 3. Word-boundary hesitation: slight pause on spaces
      if (passage[i] === ' ') {
        const rollHesitation = botPrng();
        if (rollHesitation < profile.hesitationChance) {
          const hesitation = lerp(profile.hesitationMs[0], profile.hesitationMs[1], botPrng());
          stepInterval += hesitation;
        }
      }

      cumulativeMs += stepInterval;
      schedule[i] = cumulativeMs;
    }

    const finishTimeMs = schedule[passageLength - 1];

    return {
      bot,
      schedule,
      targetWpm: Math.round(effectiveWpm * 10) / 10,
      accuracy: Math.round(botAccuracy * 1000) / 10,
      finishTimeMs,
    };
  });
}

/**
 * Pure function: calculates a bot's progress (character count) at elapsed time t.
 * Supports smooth fractional interpolation between character completion timestamps.
 * 
 * @param {number[]} schedule - Array of completion timestamps for each character
 * @param {number} t - Elapsed time in ms
 * @param {number} passageLength
 * @returns {number} Fractional progress (0 <= progress <= passageLength)
 */
export function getBotProgressAtTime(schedule, t, passageLength) {
  if (t <= 0 || !schedule || schedule.length === 0) {
    return 0;
  }

  const len = schedule.length;
  const targetLen = passageLength != null ? Math.min(passageLength, len) : len;
  if (targetLen <= 0) return 0;

  const finishTime = schedule[targetLen - 1];
  if (t >= finishTime) {
    return targetLen;
  }

  // Before first character completion
  if (t < schedule[0]) {
    return schedule[0] > 0 ? clamp(t / schedule[0], 0, 1) : 0;
  }

  // Binary search for interval schedule[i] <= t < schedule[i+1]
  let low = 0;
  let high = targetLen - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (schedule[mid] <= t) {
      if (mid === targetLen - 1 || schedule[mid + 1] > t) {
        // schedule[mid] <= t < schedule[mid + 1]
        const intervalStart = schedule[mid];
        const intervalEnd = schedule[mid + 1];
        const fraction = intervalEnd > intervalStart ? (t - intervalStart) / (intervalEnd - intervalStart) : 0;
        return (mid + 1) + clamp(fraction, 0, 1);
      }
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return 0;
}
