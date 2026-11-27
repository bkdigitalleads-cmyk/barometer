/**
 * What is free and what is Pro, as pure functions checked by `npm test`.
 *
 * Free forever: the live barometer, the altimeter, every unit, sea level
 * pressure from the phone's own elevation (location), and the last 24
 * hours of history (the 3 hour and 24 hour charts). One note, to try it.
 *
 * Pro: the 7 and 30 day charts, the pressure change alert, notes on the
 * chart (any number), CSV and PDF export, sea level calibration by a typed
 * elevation, and the dial styles.
 *
 * Nobody loses anything: every reading is stored on both plans and older
 * ones show again with Pro; notes made with Pro stay in the list.
 */
import type { RangeId } from './chart.ts';
import { DAY } from './readings.ts';

/** Why the in-app paywall opened. */
export type PaywallReason = 'range' | 'alert' | 'note' | 'export' | 'calibrate' | 'dial' | 'pro';

export const FREE_RANGES: RangeId[] = ['3h', '24h'];
/** Notes on the free plan (the second opens the paywall). */
export const FREE_NOTES = 1;
/** How far back the free plan shows history. */
export const FREE_HISTORY_MS = DAY;

export function rangeAllowed(isPro: boolean, r: RangeId): boolean {
  return isPro || FREE_RANGES.includes(r);
}

/** The earliest moment History shows (readings, notes in the list, export). */
export function historyStart(isPro: boolean, now: number): number {
  return isPro ? -Infinity : now - FREE_HISTORY_MS;
}

/** Adding a note: free for the first, then Pro. */
export function canAddNote(isPro: boolean, noteCount: number): boolean {
  return isPro || noteCount < FREE_NOTES;
}

export function canAlert(isPro: boolean): boolean {
  return isPro;
}

export function canExport(isPro: boolean): boolean {
  return isPro;
}

export function canTypeElevation(isPro: boolean): boolean {
  return isPro;
}

export type DialStyle = 'classic' | 'marine' | 'plain';
export const DIAL_STYLES: { id: DialStyle; label: string; line: string }[] = [
  { id: 'classic', label: 'Classic', line: 'Light face, fine scale' },
  { id: 'marine', label: 'Marine', line: 'Dark face, bold scale, for a boat or a wall' },
  { id: 'plain', label: 'Plain', line: 'The ring and the needle only' },
];
export const FREE_DIAL: DialStyle = 'classic';

export function dialAllowed(isPro: boolean, d: DialStyle): boolean {
  return isPro || d === FREE_DIAL;
}

/** The dial shown: a Pro style falls back to Classic when Pro ends, and comes back with it. */
export function shownDial(isPro: boolean, chosen: DialStyle): DialStyle {
  return dialAllowed(isPro, chosen) ? chosen : FREE_DIAL;
}

/** Whether the alert actually runs: on, and Pro. Turning Pro off pauses it without losing the setting. */
export function alertActive(isPro: boolean, enabled: boolean): boolean {
  return isPro && enabled;
}

/** A typed elevation counts only with Pro; without it, the location fix (if any) is used. */
export function elevationInUse<T extends { source: string }>(isPro: boolean, typed: T | null, located: T | null): T | null {
  if (typed && canTypeElevation(isPro)) return typed;
  return located;
}
