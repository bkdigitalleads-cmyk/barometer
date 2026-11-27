/**
 * Stored readings and the three-hour trend. Pure, checked by `npm test`.
 *
 * A reading is one pressure (hPa) at one moment, from the phone's own
 * sensor. They are stored while the app is open (one every five minutes,
 * the median of the samples just before) and whenever iOS lets the app
 * check in the background (modules/baro-background). Nothing else makes a
 * reading: no server, no forecast, no other phone.
 */
import { formatChange, type PressureUnit } from './units.ts';

export type ReadingSource = 'open' | 'background';

export interface Reading {
  /** ms since 1970. */
  t: number;
  hpa: number;
  source: ReadingSource;
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** While the app is open, one reading is stored this often. */
export const STORE_EVERY_MS = 5 * MINUTE;
/** The stored reading is the median of the samples from this long before it. */
export const SAMPLE_WINDOW_MS = 30_000;

/** True when the app should store a reading now (none yet, or the last is five minutes old). */
export function shouldStore(lastStoredT: number | null, now: number): boolean {
  return lastStoredT == null || now - lastStoredT >= STORE_EVERY_MS || now < lastStoredT;
}

/** The median of the samples (hPa), or null with none. One odd sample cannot move it. */
export function median(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** Sorted by time, one per moment (a later duplicate wins), bad samples dropped. */
export function cleanReadings(list: Reading[]): Reading[] {
  const byT = new Map<number, Reading>();
  for (const r of list) {
    if (!Number.isFinite(r.t) || !Number.isFinite(r.hpa) || r.hpa < 250 || r.hpa > 1100) continue;
    byT.set(r.t, r);
  }
  return [...byT.values()].sort((a, b) => a.t - b.t);
}

// ---------- the three-hour trend ----------

/** The trend compares now with a reading about this long ago. */
export const TREND_SPAN_MS = 3 * HOUR;
/** The reading compared against may be up to this much older than three hours... */
export const TREND_OLDEST_MS = 3.5 * HOUR;
/** ...and must be at least this old, or there is no trend yet. */
export const TREND_NEWEST_MS = 1 * HOUR;
/**
 * A change smaller than this (hPa) is Steady. Phone sensors are good to
 * about 0.1 hPa, but carrying the phone up one floor moves the reading by
 * about 0.4 hPa, so a smaller band would call stairs a trend.
 */
export const STEADY_BAND_HPA = 1.0;

export type TrendDirection = 'rising' | 'steady' | 'falling';

export type Trend =
  | { kind: 'none' }
  | { kind: 'trend'; direction: TrendDirection; changeHpa: number; spanMs: number; fromT: number };

/**
 * The trend at `at` (usually the live reading): the change from the
 * stored reading closest to three hours before, looking between 3.5 and
 * 1 hour back. None when there is no such reading (the app was closed
 * then, or it is new).
 */
export function trendAt(readings: Reading[], at: { t: number; hpa: number }): Trend {
  const target = at.t - TREND_SPAN_MS;
  let best: Reading | null = null;
  for (const r of readings) {
    const age = at.t - r.t;
    if (age < TREND_NEWEST_MS || age > TREND_OLDEST_MS) continue;
    if (!best || Math.abs(r.t - target) < Math.abs(best.t - target)) best = r;
  }
  if (!best) return { kind: 'none' };
  const changeHpa = at.hpa - best.hpa;
  return { kind: 'trend', direction: directionOf(changeHpa), changeHpa, spanMs: at.t - best.t, fromT: best.t };
}

export function directionOf(changeHpa: number): TrendDirection {
  if (Math.abs(changeHpa) < STEADY_BAND_HPA) return 'steady';
  return changeHpa > 0 ? 'rising' : 'falling';
}

export const DIRECTION_WORD: Record<TrendDirection, string> = { rising: 'Rising', steady: 'Steady', falling: 'Falling' };

/** "3 hours", "2 hours", "1 hour", "75 minutes": the span a trend covers, as said aloud. */
export function spanWords(ms: number): string {
  const minutes = Math.round(ms / MINUTE);
  if (minutes < 90) {
    const m = Math.max(5, Math.round(minutes / 5) * 5);
    return `${m} minutes`;
  }
  const h = Math.round(minutes / 60);
  return h === 1 ? '1 hour' : `${h} hours`;
}

/** "Falling, 3.1 hPa in 3 hours". With no trend yet, says when there will be one. */
export function trendText(trend: Trend, unit: PressureUnit, locale = 'en-US'): string {
  if (trend.kind === 'none') return 'Trend shows after an hour of readings';
  return `${DIRECTION_WORD[trend.direction]}, ${formatChange(trend.changeHpa, unit, locale)} ${unit} in ${spanWords(trend.spanMs)}`;
}

/** The reading closest to `t`, within `maxMs`, or null. */
export function readingNear(readings: Reading[], t: number, maxMs = 30 * MINUTE): Reading | null {
  let best: Reading | null = null;
  for (const r of readings) {
    const d = Math.abs(r.t - t);
    if (d <= maxMs && (!best || d < Math.abs(best.t - t))) best = r;
  }
  return best;
}
