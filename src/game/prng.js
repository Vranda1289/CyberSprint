/**
 * Mulberry32 seeded pseudo-random number generator.
 * Produces deterministic 32-bit floating point numbers in [0, 1).
 *
 * @param {number} seed - Integer seed
 * @returns {() => number} Random generator function
 */
export function createPRNG(seed) {
  let s = (seed >>> 0) || 1;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Derives an integer sub-seed from a parent seed and an index.
 * Useful for deterministic multi-stream generators.
 *
 * @param {number} parentSeed 
 * @param {number} streamIndex 
 * @returns {number}
 */
export function deriveSeed(parentSeed, streamIndex) {
  let s = (parentSeed ^ Math.imul(streamIndex + 1, 0x9e3779b9)) >>> 0;
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  return (t ^ (t >>> 14)) >>> 0;
}
