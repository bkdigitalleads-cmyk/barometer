/**
 * Tagged moments ("notes"): a label at a time, shown on the chart and in
 * a list with the pressure and trend at that moment. Pure, checked by
 * `npm test`. The labels are the person's own words; the app draws no
 * conclusion from them.
 */
import type { Reading, Trend } from './readings.ts';
import { readingNear, trendAt } from './readings.ts';

export interface Note {
  id: string;
  t: number;
  label: string;
  /** The pressure (hPa) at that moment, when a reading was near. */
  hpa: number | null;
  /** The three-hour change (hPa) at that moment, when there was one. */
  changeHpa: number | null;
  createdAt: number;
}

/** The ready-made labels, in this order. Anything else is typed. */
export const PRESET_LABELS = ['Headache', 'Joint pain', 'Fishing', 'Hike'];

export const MAX_LABEL = 40;

/** A label as stored: trimmed, single spaces, at most 40 characters. Empty means none. */
export function cleanLabel(text: string): string {
  return String(text ?? '')
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LABEL)
    .trim();
}

/** The pressure and trend for a note at `t`: the live reading when it is now, else the nearest stored one. */
export function snapshotAt(readings: Reading[], t: number, live?: { t: number; hpa: number } | null): { hpa: number | null; trend: Trend } {
  const here = live && Math.abs(live.t - t) < 2 * 60_000 ? live : readingNear(readings, t);
  if (!here) return { hpa: null, trend: { kind: 'none' } };
  return { hpa: here.hpa, trend: trendAt(readings, { t: here.t, hpa: here.hpa }) };
}

/** Notes newest first. */
export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => b.t - a.t || b.createdAt - a.createdAt);
}

/** A short random id, good enough for one phone's notes. */
export function newId(now = Date.now()): string {
  return `${now.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
