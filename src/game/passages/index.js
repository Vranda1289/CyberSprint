import { FUNNY_RELATABLE_PASSAGES } from './funnyRelatable.js';
import { RIDDLES_PASSAGES } from './riddles.js';
import { UNIVERSAL_TRUTHS_PASSAGES } from './universalTruths.js';
import { LIFE_WISDOM_PASSAGES } from './lifeWisdom.js';
import { TECH_HUMOR_PASSAGES } from './techHumor.js';
import { GAMING_CULTURE_PASSAGES } from './gamingCulture.js';
import { WEIRD_INTERESTING_PASSAGES } from './weirdInteresting.js';
import { SHORT_STORIES_PASSAGES } from './shortStories.js';

/**
 * Original Cyberpunk Racing passages preserved as a 9th category.
 */
export const CYBERPUNK_PASSAGES = [
  {
    id: 'cb-001',
    category: 'cyberpunk_racing',
    title: 'Neon Rain',
    text: "Neon beams slice through midnight rain as hovercraft engines roar. We weave between chrome spires, chasing the electric pulse of the lower grid before dawn breaks.",
    lengthTier: 'medium',
    difficulty: 'medium',
  },
  {
    id: 'cb-002',
    category: 'cyberpunk_racing',
    title: 'Turbine Whine',
    text: "Turbines whine as liquid coolant sprays across the manifold. The telemetry stream blinks green, locked onto the high-speed orbital bypass above Neo Shinjuku tonight.",
    lengthTier: 'medium',
    difficulty: 'medium',
  },
  {
    id: 'cb-003',
    category: 'cyberpunk_racing',
    title: 'Synthetic Asphalt',
    text: "Synthetic asphalt reflects purple neon signs while five rivals draft behind. Push the thruster past safety margins and feel the chassis vibrate with raw kinetic power.",
    lengthTier: 'medium',
    difficulty: 'medium',
  },
  {
    id: 'cb-004',
    category: 'cyberpunk_racing',
    title: 'Overdrive Capacitor',
    text: "Warning lights flash crimson along the bulkhead, but the overdrive capacitor is holding steady. Hit the apex hard, engage vector thrusters, and surge past the leader.",
    lengthTier: 'medium',
    difficulty: 'medium',
  },
  {
    id: 'cb-005',
    category: 'cyberpunk_racing',
    title: 'Data Relay',
    text: "Data packets fly through optical relays at light speed. Every keypress sparks ignition in the combustion chamber, launching your sleek racer through the data tunnel.",
    lengthTier: 'medium',
    difficulty: 'medium',
  },
  {
    id: 'cb-006',
    category: 'cyberpunk_racing',
    title: 'Visor Slashing',
    text: "Rain slashes against the cockpit visor as we hit maximum velocity. The skyline blurs into streaks of amber and cyan, leaving rival racers choking on our plasma trail.",
    lengthTier: 'medium',
    difficulty: 'medium',
  },
  {
    id: 'cb-007',
    category: 'cyberpunk_racing',
    title: 'Sector Seven',
    text: "Engage magnetic dampeners before the hairpin turn on sector seven. The AI drones are closing the gap, but flawless cadence on the controls will preserve our lead.",
    lengthTier: 'medium',
    difficulty: 'medium',
  },
  {
    id: 'cb-008',
    category: 'cyberpunk_racing',
    title: 'Digital Pulse',
    text: "A digital pulse surges through the steering column. Cybernetic reflexes take over as the tachometer redlines, cutting cleanly through the smog of the industrial sector.",
    lengthTier: 'medium',
    difficulty: 'medium',
  },
  {
    id: 'cb-009',
    category: 'cyberpunk_racing',
    title: 'Twin Turbines',
    text: "Holographic billboards flicker overhead as the sprint reaches its final stretch. Grip the wheel, maintain clean rhythm, and let the twin turbines scream down the track.",
    lengthTier: 'medium',
    difficulty: 'medium',
  },
  {
    id: 'cb-010',
    category: 'cyberpunk_racing',
    title: 'Neural Link',
    text: "The neural interface synchronizes with the engine core. Every keystroke commands absolute precision, shaving precious milliseconds off our lap time on the dark circuit.",
    lengthTier: 'medium',
    difficulty: 'medium',
  },
  {
    id: 'cb-011',
    category: 'cyberpunk_racing',
    title: 'Ceramic Apex',
    text: "Friction burns hot along the ceramic brake pads as we slide around the final chicane. Five machines rumble in pursuit, but our line through the apex is immaculate.",
    lengthTier: 'medium',
    difficulty: 'medium',
  },
  {
    id: 'cb-012',
    category: 'cyberpunk_racing',
    title: 'Underground League',
    text: "Underground street leagues run on pure adrenaline and cold logic. Read the track surface, anticipate the draft, and trigger the booster gate to seize first place.",
    lengthTier: 'medium',
    difficulty: 'medium',
  },
  {
    id: 'cb-013',
    category: 'cyberpunk_racing',
    title: 'Canal Bridge Leap',
    text: "Zero gravity dampeners fail for a split second as the racer leaps over the canal bridge. Land cleanly on all four skids and accelerate toward the glowing beacon.",
    lengthTier: 'medium',
    difficulty: 'medium',
  },
  {
    id: 'cb-014',
    category: 'cyberpunk_racing',
    title: 'Static Whispers',
    text: "Static whispers across the comms channel while the neon finish line looms ahead. Keep your fingers moving with machine speed, trust the algorithm, and claim victory.",
    lengthTier: 'medium',
    difficulty: 'medium',
  },
  {
    id: 'cb-015',
    category: 'cyberpunk_racing',
    title: 'Undercity Canyon',
    text: "Deep in the undercity canyons, speed is the only currency that matters. Nitro injectors purge with a sharp hiss, vaulting the cyber chassis into the winner circle.",
    lengthTier: 'medium',
    difficulty: 'medium',
  },
];

/**
 * Curated Category Definitions
 */
export const CATEGORIES = [
  { id: 'all', label: 'Surprise Me', icon: '🎲', description: 'Random selection across all categories' },
  { id: 'funny_relatable', label: 'Funny & Relatable', icon: '😂', description: 'Everyday life, procrastination & awkward moments' },
  { id: 'riddles', label: 'Riddles & Puzzles', icon: '🧩', description: 'Brain teasers with answers revealed after the race' },
  { id: 'universal_truths', label: 'Universal Truths', icon: '💡', description: 'Humorous, undeniable observations on human nature' },
  { id: 'life_wisdom', label: 'Life Wisdom', icon: '📜', description: 'Discipline, consistency, resilience & personal growth' },
  { id: 'tech_humor', label: 'Tech & Code', icon: '💻', description: 'Debugging, Git, AI, and developer life' },
  { id: 'gaming_culture', label: 'Gaming Culture', icon: '🎮', description: 'Racing habits, speedrunning & competitive banter' },
  { id: 'weird_interesting', label: 'Weird & Wonderful', icon: '🔮', description: 'Fascinating real-world facts & quirky discoveries' },
  { id: 'short_stories', label: 'Stories & Twists', icon: '📖', description: 'Mini-stories with satisfying or comedic plot twists' },
  { id: 'cyberpunk_racing', label: 'Cyberpunk Lore', icon: '🏎️', description: 'Original high-speed futuristic racing circuits' },
];

/**
 * Master catalog of all 175 typing passages.
 */
export const PASSAGE_BANK = [
  ...FUNNY_RELATABLE_PASSAGES,
  ...RIDDLES_PASSAGES,
  ...UNIVERSAL_TRUTHS_PASSAGES,
  ...LIFE_WISDOM_PASSAGES,
  ...TECH_HUMOR_PASSAGES,
  ...GAMING_CULTURE_PASSAGES,
  ...WEIRD_INTERESTING_PASSAGES,
  ...SHORT_STORIES_PASSAGES,
  ...CYBERPUNK_PASSAGES,
];

/**
 * Array of raw passage strings for backward compatibility with existing tests and engines.
 */
export const PASSAGES = PASSAGE_BANK.map((p) => p.text);

/**
 * Retrieves all passages belonging to a specific category (or all passages if 'all').
 * 
 * @param {string} category 
 * @returns {Array<object>}
 */
export function getPassagesByCategory(category = 'all') {
  if (!category || category === 'all') {
    return PASSAGE_BANK;
  }
  const filtered = PASSAGE_BANK.filter((p) => p.category === category);
  return filtered.length > 0 ? filtered : PASSAGE_BANK;
}

/**
 * Returns a random passage object, preventing consecutive repeats when alternatives exist.
 * 
 * @param {string|null} previousId - ID or text of previously used passage
 * @param {string} [category='all'] - Category ID filter
 * @param {() => number} [rng=Math.random]
 * @returns {object} Passage object
 */
export function getRandomPassageObject(previousId = null, category = 'all', rng = Math.random) {
  const categoryPool = getPassagesByCategory(category);
  // Filter out previous by id or by text
  const pool = categoryPool.filter(
    (p) => p.id !== previousId && p.text !== previousId
  );
  const eligible = pool.length > 0 ? pool : categoryPool;
  const index = Math.floor(rng() * eligible.length);
  return eligible[index] || eligible[0];
}

/**
 * Returns a random passage text string (backward compatible with original function signature).
 * 
 * @param {string|null} previousPassage - Text of previously used passage
 * @param {() => number} [rng=Math.random]
 * @param {string} [category='all']
 * @returns {string} Passage text
 */
export function getRandomPassage(previousPassage = null, rng = Math.random, category = 'all') {
  const obj = getRandomPassageObject(previousPassage, category, rng);
  return obj.text;
}
