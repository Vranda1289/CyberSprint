/**
 * CYBERSPRINT CONFIGURATION
 * Single source of truth for all game constants, difficulty profiles, and bot roster.
 */

export const COUNTDOWN_STEP_MS = 1000;
export const MAX_WRONG_BUFFER = 5;
export const MIN_WPM_ELAPSED_MS = 2000;
export const POST_WINNER_WINDOW_MS = 15000;
export const RACE_HARD_CAP_MS = 120000;
export const HUD_UPDATE_HZ = 10;
export const PLAYER_LANE = 2; // 0-indexed, 3rd lane
export const SMOOTHING_TAU_MS = 100; // Visual easing only

/**
 * DIFFICULTY PROFILES (STARTING ESTIMATES)
 * Note: These are initial starting estimates to be tuned after simulated tests and playtesting.
 * Adjust these values to calibrate bot challenge levels across difficulties.
 */
export const DIFFICULTY_PROFILES = {
  easy: {
    label: 'EASY',
    description: 'Casual drift. AI speeds 25–45 WPM with relaxed error recovery.',
    wpmRange: [25, 45],
    accuracyRange: [0.93, 0.97],
    errorPenaltyMs: [600, 1000],
    perRaceJitter: 0.08, // +/- 8%
    hesitationChance: 0.25, // Pauses at word boundaries
    hesitationMs: [100, 220],
    burstiness: 0.18, // Per-character interval variance
  },
  medium: {
    label: 'MEDIUM',
    description: 'Competitive circuit. AI speeds 45–70 WPM with sharp pacing.',
    wpmRange: [45, 70],
    accuracyRange: [0.95, 0.98],
    errorPenaltyMs: [450, 800],
    perRaceJitter: 0.08,
    hesitationChance: 0.20,
    hesitationMs: [60, 160],
    burstiness: 0.14,
  },
  hard: {
    label: 'HARD',
    description: 'Cyberpunk elite. AI speeds 70–100 WPM with aggressive precision.',
    wpmRange: [70, 100],
    accuracyRange: [0.97, 0.99],
    errorPenaltyMs: [300, 600],
    perRaceJitter: 0.08,
    hesitationChance: 0.12,
    hesitationMs: [40, 110],
    burstiness: 0.10,
  },
};

/**
 * 5 FIXED AI BOTS
 * 5 bots + 1 player = 6 racers total across 6 lanes.
 * skillRank: 0 to 4 distributes bot baselines across wpmRange (0 = lowest, 4 = highest).
 */
export const BOT_ROSTER = [
  { id: 'bot-nova', name: 'User1', color: '#ffeb3bff', skillRank: 0 },
  { id: 'bot-phantom', name: 'User2', color: '#ff20a9ff', skillRank: 1 },
  { id: 'bot-apex', name: 'User3', color: '#9BEA3A', skillRank: 2 },
  { id: 'bot-glitch', name: 'User4', color: '#A56BFF', skillRank: 3 },
  { id: 'bot-onyx', name: 'User5', color: '#3D7BFF', skillRank: 4 },
];

export const PLAYER_INFO = {
  id: 'player',
  name: 'YOU',
  color: '#19E6FF',
  laneIndex: PLAYER_LANE,
};
