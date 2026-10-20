/**
 * Utility functions for math, formatting, and parameters.
 */

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Formats milliseconds into SS.ss format (e.g., "14.28s" or "01:23.45").
 * @param {number} ms 
 * @returns {string}
 */
export function formatTime(ms) {
  if (ms == null || isNaN(ms) || ms < 0) return '0.00s';
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(2)}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(2);
  const paddedSec = seconds.padStart(5, '0');
  return `${minutes}:${paddedSec}`;
}

/**
 * Parses optional ?seed= URL parameter for deterministic debugging.
 * Returns null if not provided or invalid.
 */
export function parseSeedFromUrl() {
  if (typeof window === 'undefined' || !window.location) return null;
  const params = new URLSearchParams(window.location.search);
  const rawSeed = params.get('seed');
  if (rawSeed !== null && rawSeed.trim() !== '') {
    const parsed = parseInt(rawSeed, 10);
    if (!isNaN(parsed)) {
      return (parsed >>> 0);
    }
  }
  return null;
}
