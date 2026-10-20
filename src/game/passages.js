/**
 * Original Cyberpunk Racing Passages.
 * Constraints (Section 7):
 * - 160-220 characters
 * - Printable ASCII only (codes 32-126)
 * - Straight quotes only
 * - No newlines
 * - No double spaces
 * - Light punctuation (commas, periods)
 * - Cyberpunk / racing themed
 */

export const PASSAGES = [
  "Neon beams slice through midnight rain as hovercraft engines roar. We weave between chrome spires, chasing the electric pulse of the lower grid before dawn breaks.",
  "Turbines whine as liquid coolant sprays across the manifold. The telemetry stream blinks green, locked onto the high-speed orbital bypass above Neo Shinjuku tonight.",
  "Synthetic asphalt reflects purple neon signs while five rivals draft behind. Push the thruster past safety margins and feel the chassis vibrate with raw kinetic power.",
  "Warning lights flash crimson along the bulkhead, but the overdrive capacitor is holding steady. Hit the apex hard, engage vector thrusters, and surge past the leader.",
  "Data packets fly through optical relays at light speed. Every keypress sparks ignition in the combustion chamber, launching your sleek racer through the data tunnel.",
  "Rain slashes against the cockpit visor as we hit maximum velocity. The skyline blurs into streaks of amber and cyan, leaving rival racers choking on our plasma trail.",
  "Engage magnetic dampeners before the hairpin turn on sector seven. The AI drones are closing the gap, but flawless cadence on the controls will preserve our lead.",
  "A digital pulse surges through the steering column. Cybernetic reflexes take over as the tachometer redlines, cutting cleanly through the smog of the industrial sector.",
  "Holographic billboards flicker overhead as the sprint reaches its final stretch. Grip the wheel, maintain clean rhythm, and let the twin turbines scream down the track.",
  "The neural interface synchronizes with the engine core. Every keystroke commands absolute precision, shaving precious milliseconds off our lap time on the dark circuit.",
  "Friction burns hot along the ceramic brake pads as we slide around the final chicane. Five machines rumble in pursuit, but our line through the apex is immaculate.",
  "Underground street leagues run on pure adrenaline and cold logic. Read the track surface, anticipate the draft, and trigger the booster gate to seize first place.",
  "Zero gravity dampeners fail for a split second as the racer leaps over the canal bridge. Land cleanly on all four skids and accelerate toward the glowing beacon.",
  "Static whispers across the comms channel while the neon finish line looms ahead. Keep your fingers moving with machine speed, trust the algorithm, and claim victory.",
  "Deep in the undercity canyons, speed is the only currency that matters. Nitro injectors purge with a sharp hiss, vaulting the cyber chassis into the winner circle.",
];

/**
 * Returns a random passage, ensuring it is not the same as the previous one.
 * @param {string|null} previousPassage 
 * @param {() => number} [rng] Optional random number generator, defaults to Math.random
 * @returns {string}
 */
export function getRandomPassage(previousPassage = null, rng = Math.random) {
  const pool = PASSAGES.filter(p => p !== previousPassage);
  if (pool.length === 0) return PASSAGES[0];
  const index = Math.floor(rng() * pool.length);
  return pool[index];
}
