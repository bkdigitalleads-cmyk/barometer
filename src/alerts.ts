/**
 * The pressure change alert. Pure, checked by `npm test`.
 *
 * A local notification when the stored readings show a rise or a fall of
 * at least the chosen amount within three hours. It is checked each time
 * a reading is stored: every five minutes while the app is open, and
 * whenever iOS lets the app check in the background. Between those, the
 * app is not running, so the alert can be late; the setting says so.
 *
 * modules/baro-background/ios/BaroAlert.swift is a line-for-line copy of
 * checkAlert for the background check. A test keeps the two in step: change
 * one, change the other.
 *
 * One change alerts once: after an alert, the next one in the same
 * direction only counts readings stored at or after it, so the same fall
 * cannot alert again as more readings arrive. A turn the other way counts
 * on its own.
 */
import type { Reading } from './readings.ts';
import { HOUR } from './readings.ts';
import { formatChange, type PressureUnit } from './units.ts';

/** The look-back for a change. */
export const ALERT_WINDOW_MS = 3 * HOUR;
/** Amounts the person can choose (hPa). */
export const ALERT_STEPS_HPA = [2, 3, 4, 5, 6];
export const DEFAULT_ALERT_HPA = 3;
/**
 * A change this big (hPa) within three hours is the phone going up or
 * down (a hill road, a lift, a plane), not the air around it; it does not
 * alert. About 120 meters of climb.
 */
export const ALERT_IGNORE_ABOVE_HPA = 15;

export type AlertDirection = 'rise' | 'fall';

export interface AlertState {
  /** When the last alert fired (the time of the reading that fired it), or null. */
  lastAt: number | null;
  lastDir: AlertDirection | null;
}

export const NO_ALERT_YET: AlertState = { lastAt: null, lastDir: null };

export interface AlertHit {
  dir: AlertDirection;
  /** Positive hPa. */
  amount: number;
  /** The reading the change is measured from. */
  fromT: number;
  /** The reading that fired it (the latest). */
  at: number;
}

/**
 * Whether the latest stored reading fires an alert. `readings` in time
 * order; the latest is the last one. Returns the hit (the larger of a rise
 * and a fall when both qualify) or null.
 */
export function checkAlert(readings: Reading[], thresholdHpa: number, state: AlertState): AlertHit | null {
  if (readings.length < 2 || !(thresholdHpa > 0)) return null;
  const latest = readings[readings.length - 1];
  const start = latest.t - ALERT_WINDOW_MS;
  let fallFrom: Reading | null = null; // the highest reading before: a fall is measured from it
  let riseFrom: Reading | null = null; // the lowest reading before: a rise is measured from it
  for (let i = 0; i < readings.length - 1; i++) {
    const r = readings[i];
    if (r.t < start || r.t > latest.t) continue;
    const fallOk = !(state.lastDir === 'fall' && state.lastAt != null && r.t < state.lastAt);
    const riseOk = !(state.lastDir === 'rise' && state.lastAt != null && r.t < state.lastAt);
    if (fallOk && (!fallFrom || r.hpa > fallFrom.hpa)) fallFrom = r;
    if (riseOk && (!riseFrom || r.hpa < riseFrom.hpa)) riseFrom = r;
  }
  const fall = fallFrom ? fallFrom.hpa - latest.hpa : 0;
  const rise = riseFrom ? latest.hpa - riseFrom.hpa : 0;
  const ok = (x: number) => x >= thresholdHpa - 1e-9 && x <= ALERT_IGNORE_ABOVE_HPA;
  const fallHit = ok(fall) && fallFrom ? { dir: 'fall' as const, amount: fall, fromT: fallFrom.t, at: latest.t } : null;
  const riseHit = ok(rise) && riseFrom ? { dir: 'rise' as const, amount: rise, fromT: riseFrom.t, at: latest.t } : null;
  if (fallHit && riseHit) return fallHit.amount >= riseHit.amount ? fallHit : riseHit;
  return fallHit ?? riseHit;
}

/** The state after an alert fires. */
export function afterAlert(hit: AlertHit): AlertState {
  return { lastAt: hit.at, lastDir: hit.dir };
}

/** "Pressure fell 4 hPa in the last 3 hours." */
export function alertText(hit: AlertHit, unit: PressureUnit, locale = 'en-US'): string {
  return `Pressure ${hit.dir === 'fall' ? 'fell' : 'rose'} ${formatChange(hit.amount, unit, locale)} ${unit} in the last 3 hours.`;
}

export const ALERT_TITLE = 'Pressure change';

/** The plain words on the alert setting about timing. */
export const ALERT_TIMING_TEXT =
  'The app checks each time it stores a reading: every five minutes while it is open, and when iOS lets it check in the background, often a few times a day. iOS decides when, so an alert can come late or not at all. Swiping the app away, Low Power Mode, or turning off Background App Refresh stops the background checks.';

/** The same, short, for the line under the switch. */
export const ALERT_TIMING_SHORT = 'Depends on how often iOS lets the app check, so it can be late.';
