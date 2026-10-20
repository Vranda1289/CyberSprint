import { describe, it, expect } from 'vitest';
import {
  detectFinishers,
  determineWinner,
  computeRankings,
  checkRaceConclusion,
  createRacerLaneList,
} from '../src/game/raceEngine.js';
import { generateBotSchedules } from '../src/game/botEngine.js';
import { PLAYER_INFO, POST_WINNER_WINDOW_MS, RACE_HARD_CAP_MS, BOT_ROSTER } from '../src/game/config.js';

describe('Race Engine', () => {
  const passageLength = 100;

  it('earliest finish time is the winner', () => {
    const racers = [
      { id: '1', laneIndex: 0, progress: 100, finishedAtMs: 25000 },
      { id: '2', laneIndex: 1, progress: 100, finishedAtMs: 21500 }, // Fastest
      { id: '3', laneIndex: 2, progress: 100, finishedAtMs: 24000 },
    ];

    const winner = determineWinner(racers);
    expect(winner).not.toBeNull();
    expect(winner.id).toBe('2');
    expect(winner.finishedAtMs).toBe(21500);
  });

  it('tie-break is deterministic and favors lower lane index', () => {
    const racers = [
      { id: 'lane-4', laneIndex: 4, progress: 100, finishedAtMs: 30000 },
      { id: 'lane-1', laneIndex: 1, progress: 100, finishedAtMs: 30000 }, // Lower lane
      { id: 'lane-3', laneIndex: 3, progress: 100, finishedAtMs: 30000 },
    ];

    const winner = determineWinner(racers);
    expect(winner.id).toBe('lane-1');
  });

  it('finish events never fire twice: finishedAtMs is immutable once set', () => {
    const initialRacers = [
      { id: 'r1', laneIndex: 0, progress: 99, finishedAtMs: null },
      { id: 'r2', laneIndex: 1, progress: 100, finishedAtMs: 15000 }, // Already finished
    ];

    // First frame: r1 crosses line at 16000ms
    const step1 = detectFinishers(
      [
        { ...initialRacers[0], progress: 100 },
        initialRacers[1],
      ],
      passageLength,
      16000
    );

    expect(step1[0].finishedAtMs).toBe(16000);
    expect(step1[1].finishedAtMs).toBe(15000); // Unchanged

    // Second frame: subsequent time tick at 18000ms
    const step2 = detectFinishers(step1, passageLength, 18000);
    expect(step2[0].finishedAtMs).toBe(16000); // Does NOT update to 18000
    expect(step2[1].finishedAtMs).toBe(15000);
  });

  it('computes correct ranking order: finishers first by time, then unfinished by progress', () => {
    const racers = [
      { id: 'unfin-low', laneIndex: 0, progress: 40, finishedAtMs: null },
      { id: 'fin-fast', laneIndex: 1, progress: 100, finishedAtMs: 20000 },
      { id: 'unfin-high', laneIndex: 2, progress: 85, finishedAtMs: null },
      { id: 'fin-slow', laneIndex: 3, progress: 100, finishedAtMs: 22000 },
    ];

    const ranked = computeRankings(racers, passageLength);
    expect(ranked[0].id).toBe('fin-fast'); // Rank 1 (20s)
    expect(ranked[1].id).toBe('fin-slow'); // Rank 2 (22s)
    expect(ranked[2].id).toBe('unfin-high'); // Rank 3 (85 progress)
    expect(ranked[3].id).toBe('unfin-low'); // Rank 4 (40 progress)

    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });

  it('evaluates race conclusion rules: player finish', () => {
    const conclusion = checkRaceConclusion({
      playerFinished: true,
      firstFinishTimeMs: 18000,
      elapsedMs: 20000,
    });
    expect(conclusion.shouldConclude).toBe(true);
    expect(conclusion.reason).toBe('PLAYER_FINISHED');
  });

  it('evaluates race conclusion rules: post-winner window', () => {
    const firstFinish = 10000;
    // Exactly at window boundary (10000 + 15000 = 25000)
    const conclusionBefore = checkRaceConclusion({
      playerFinished: false,
      firstFinishTimeMs: firstFinish,
      elapsedMs: firstFinish + POST_WINNER_WINDOW_MS - 1,
    });
    expect(conclusionBefore.shouldConclude).toBe(false);

    const conclusionAfter = checkRaceConclusion({
      playerFinished: false,
      firstFinishTimeMs: firstFinish,
      elapsedMs: firstFinish + POST_WINNER_WINDOW_MS,
    });
    expect(conclusionAfter.shouldConclude).toBe(true);
    expect(conclusionAfter.reason).toBe('POST_WINNER_WINDOW_EXPIRED');
  });

  it('evaluates race conclusion rules: hard cap at 120s', () => {
    const conclusionBefore = checkRaceConclusion({
      playerFinished: false,
      firstFinishTimeMs: null,
      elapsedMs: RACE_HARD_CAP_MS - 1,
    });
    expect(conclusionBefore.shouldConclude).toBe(false);

    const conclusionAfter = checkRaceConclusion({
      playerFinished: false,
      firstFinishTimeMs: null,
      elapsedMs: RACE_HARD_CAP_MS,
    });
    expect(conclusionAfter.shouldConclude).toBe(true);
    expect(conclusionAfter.reason).toBe('HARD_CAP_EXPIRED');
  });

  it('starting a new race cleanly resets all racer states', () => {
    const botEntries = generateBotSchedules('Test passage here.', 'medium', 777);
    const lanes = createRacerLaneList(botEntries, PLAYER_INFO);

    expect(lanes.length).toBe(6);
    expect(lanes[PLAYER_INFO.laneIndex].isPlayer).toBe(true);

    lanes.forEach((racer) => {
      expect(racer.progress).toBe(0);
      expect(racer.finishedAtMs).toBeNull();
      expect(racer.wpm).toBe(0);
    });
  });

  it('roster contains the 5 requested bot names and YOU for player', () => {
    const botEntries = generateBotSchedules('Test passage here.', 'medium', 1234);
    const lanes = createRacerLaneList(botEntries, PLAYER_INFO);

    const botNames = lanes.filter((r) => !r.isPlayer).map((b) => b.name);
    expect(botNames).toEqual(BOT_ROSTER.map((b) => b.name));

    const playerRacer = lanes.find((r) => r.isPlayer);
    expect(playerRacer.name).toBe('YOU');

    // Each bot has distinct color
    const botColors = lanes.filter((r) => !r.isPlayer).map((b) => b.color);
    expect(new Set(botColors).size).toBe(5);
  });

  it('race concludes immediately when player completes the passage regardless of unfinished bots', () => {
    // Player finishes at 18000ms while all 5 bots are unfinished
    const conclusion = checkRaceConclusion({
      playerFinished: true,
      firstFinishTimeMs: 18000,
      elapsedMs: 18000,
    });

    expect(conclusion.shouldConclude).toBe(true);
    expect(conclusion.reason).toBe('PLAYER_FINISHED');
  });

  it('winner is player when player finishes first, and bot when bot finishes first', () => {
    // Scenario A: Player finishes at 16000ms, fastest bot finishes at 20000ms
    const racersA = [
      { id: 'bot-1', isPlayer: false, laneIndex: 0, finishedAtMs: 20000, progress: 100 },
      { id: 'player', isPlayer: true, laneIndex: 2, finishedAtMs: 16000, progress: 100 },
      { id: 'bot-2', isPlayer: false, laneIndex: 1, finishedAtMs: null, progress: 75 },
    ];
    const winnerA = determineWinner(racersA);
    expect(winnerA.id).toBe('player');
    expect(winnerA.isPlayer).toBe(true);

    // Scenario B: Bot finishes at 14000ms, player finishes at 17000ms
    const racersB = [
      { id: 'bot-1', isPlayer: false, laneIndex: 0, finishedAtMs: 14000, progress: 100 },
      { id: 'player', isPlayer: true, laneIndex: 2, finishedAtMs: 17000, progress: 100 },
      { id: 'bot-2', isPlayer: false, laneIndex: 1, finishedAtMs: null, progress: 80 },
    ];
    const winnerB = determineWinner(racersB);
    expect(winnerB.id).toBe('bot-1');
    expect(winnerB.isPlayer).toBe(false);
  });
});
