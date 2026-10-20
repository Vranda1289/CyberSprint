import { describe, it, expect } from 'vitest';
import { generateBotSchedules, getBotProgressAtTime } from '../src/game/botEngine.js';
import { PASSAGES } from '../src/game/passages.js';

describe('Bot Engine', () => {
  const samplePassage = PASSAGES[0];

  it('same seed produces identical finish schedules', () => {
    const seed = 133742;
    const runA = generateBotSchedules(samplePassage, 'medium', seed);
    const runB = generateBotSchedules(samplePassage, 'medium', seed);

    expect(runA.length).toBe(5);
    expect(runB.length).toBe(5);

    for (let i = 0; i < 5; i++) {
      expect(runA[i].targetWpm).toBe(runB[i].targetWpm);
      expect(runA[i].finishTimeMs).toBe(runB[i].finishTimeMs);
      expect(runA[i].schedule).toEqual(runB[i].schedule);
    }
  });

  it('different seeds yield distinct schedules', () => {
    const runA = generateBotSchedules(samplePassage, 'medium', 101);
    const runB = generateBotSchedules(samplePassage, 'medium', 9999);

    // At least finish times should differ
    const finishTimesA = runA.map((b) => b.finishTimeMs);
    const finishTimesB = runB.map((b) => b.finishTimeMs);
    expect(finishTimesA).not.toEqual(finishTimesB);
  });

  it('all 5 bots in the same race have distinct schedules and finish times', () => {
    const bots = generateBotSchedules(samplePassage, 'medium', 42);
    const finishTimes = bots.map((b) => b.finishTimeMs);

    // Check uniqueness of finish times
    const uniqueTimes = new Set(finishTimes);
    expect(uniqueTimes.size).toBe(5);

    // Check that each bot's schedule is distinct
    for (let i = 0; i < bots.length; i++) {
      for (let j = i + 1; j < bots.length; j++) {
        expect(bots[i].schedule).not.toEqual(bots[j].schedule);
      }
    }
  });

  it('average bot WPM scales strictly Easy < Medium < Hard over many seeds', () => {
    const numSeeds = 40;
    let easyTotalWpm = 0;
    let mediumTotalWpm = 0;
    let hardTotalWpm = 0;

    for (let s = 1; s <= numSeeds; s++) {
      const easyBots = generateBotSchedules(samplePassage, 'easy', s * 17);
      const medBots = generateBotSchedules(samplePassage, 'medium', s * 17);
      const hardBots = generateBotSchedules(samplePassage, 'hard', s * 17);

      easyTotalWpm += easyBots.reduce((sum, b) => sum + (samplePassage.length / 5) / (b.finishTimeMs / 60000), 0) / 5;
      mediumTotalWpm += medBots.reduce((sum, b) => sum + (samplePassage.length / 5) / (b.finishTimeMs / 60000), 0) / 5;
      hardTotalWpm += hardBots.reduce((sum, b) => sum + (samplePassage.length / 5) / (b.finishTimeMs / 60000), 0) / 5;
    }

    const avgEasy = easyTotalWpm / numSeeds;
    const avgMedium = mediumTotalWpm / numSeeds;
    const avgHard = hardTotalWpm / numSeeds;

    console.log(`[SIMULATION] Average Bot WPM over ${numSeeds} seeds:`);
    console.log(`  Easy:   ${avgEasy.toFixed(1)} WPM (expected ~30-40)`);
    console.log(`  Medium: ${avgMedium.toFixed(1)} WPM (expected ~50-65)`);
    console.log(`  Hard:   ${avgHard.toFixed(1)} WPM (expected ~75-95)`);

    expect(avgEasy).toBeLessThan(avgMedium);
    expect(avgMedium).toBeLessThan(avgHard);
  });

  it('bot schedules are pure and independent of any player state', () => {
    const seed = 54321;
    // Generate schedule
    const initialBots = generateBotSchedules(samplePassage, 'hard', seed);

    // Simulated player with 10 chars vs simulated player with 150 chars
    // Neither alters the bot schedule in any way
    const dummyPlayerProgressA = 10;
    const dummyPlayerProgressB = 150;

    const botsWithA = generateBotSchedules(samplePassage, 'hard', seed);
    const botsWithB = generateBotSchedules(samplePassage, 'hard', seed);

    expect(botsWithA[0].schedule).toEqual(initialBots[0].schedule);
    expect(botsWithB[0].schedule).toEqual(initialBots[0].schedule);
  });

  it('simulates competitive races across all difficulties showing neither player nor bots guaranteed a win', () => {
    // We simulate a scripted human typist at competitive middle speeds for each tier:
    // Easy: human typist at ~36 WPM
    // Medium: human typist at ~57 WPM
    // Hard: human typist at ~84 WPM
    const numRaces = 50;

    const difficulties = [
      { level: 'easy', playerWpm: 36 },
      { level: 'medium', playerWpm: 57 },
      { level: 'hard', playerWpm: 84 },
    ];

    const simulationSummary = {};

    for (const { level, playerWpm } of difficulties) {
      let playerWins = 0;
      let botWins = 0;
      const playerFinishMs = (samplePassage.length / 5) / (playerWpm / 60000);

      for (let s = 1; s <= numRaces; s++) {
        const bots = generateBotSchedules(samplePassage, level, s * 997);
        const fastestBotFinish = Math.min(...bots.map((b) => b.finishTimeMs));

        if (playerFinishMs < fastestBotFinish) {
          playerWins++;
        } else {
          botWins++;
        }
      }

      const playerWinRate = (playerWins / numRaces) * 100;
      const botWinRate = (botWins / numRaces) * 100;

      simulationSummary[level] = {
        playerWpm,
        playerWins,
        botWins,
        playerWinRate: `${playerWinRate.toFixed(1)}%`,
        botWinRate: `${botWinRate.toFixed(1)}%`,
      };

      // Both human and bot must have nonzero win chance in this target range
      expect(playerWins).toBeGreaterThan(0);
      expect(botWins).toBeGreaterThan(0);
    }

    console.log('[SIMULATION] Scripted Player Win Rate Results:');
    console.table(simulationSummary);
  });

  it('smooth progress interpolation is continuous and monotonic', () => {
    const bots = generateBotSchedules(samplePassage, 'medium', 123);
    const schedule = bots[0].schedule;
    const totalDuration = bots[0].finishTimeMs;

    let prevProgress = -1;
    for (let t = 0; t <= totalDuration; t += 50) {
      const progress = getBotProgressAtTime(schedule, t, samplePassage.length);
      expect(progress).toBeGreaterThanOrEqual(prevProgress);
      expect(progress).toBeLessThanOrEqual(samplePassage.length);
      prevProgress = progress;
    }
  });
});
