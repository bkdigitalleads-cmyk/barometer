/**
 * Pressure and elevation, by the International Standard Atmosphere
 * (ICAO, the same formula aircraft altimeters use). Pure, checked by
 * `npm test`.
 *
 *   h = 44330.77 * (1 - (p / p0) ^ 0.190263)        elevation from pressure
 *   p0 = p / (1 - h / 44330.77) ^ 5.25588           sea level pressure
 *
 * 0.190263 is R * L / (g * M) and 5.25588 its inverse; 44330.77 m is
 * T0 / L (288.15 K over 0.0065 K/m). Good to a few meters in the lower
 * atmosphere; real air is warmer or colder than standard, which is why the
 * altimeter takes a starting elevation and then only follows changes.
 */

export const STANDARD_SEA_LEVEL_HPA = 1013.25;
const H_SCALE = 44330.77;
const EXP = 0.190263;
const INV_EXP = 1 / EXP; // 5.25588...

/** Elevation in meters at pressure p (hPa), for a sea level pressure p0. */
export function altitudeFromPressure(p: number, p0 = STANDARD_SEA_LEVEL_HPA): number {
  if (!(p > 0) || !(p0 > 0)) return NaN;
  return H_SCALE * (1 - Math.pow(p / p0, EXP));
}

/** Pressure (hPa) at elevation h meters, for a sea level pressure p0. */
export function pressureAtAltitude(h: number, p0 = STANDARD_SEA_LEVEL_HPA): number {
  const base = 1 - h / H_SCALE;
  if (!(base > 0)) return NaN;
  return p0 * Math.pow(base, INV_EXP);
}

/** The reading p (hPa) at elevation h (m), adjusted to sea level. */
export function seaLevelPressure(p: number, h: number): number {
  const base = 1 - h / H_SCALE;
  if (!(p > 0) || !(base > 0)) return NaN;
  return p / Math.pow(base, INV_EXP);
}

/**
 * Meters climbed (positive) or dropped (negative) between two readings,
 * from pressure alone: the difference of their standard-atmosphere
 * heights. Works without signal.
 */
export function climbBetween(fromHpa: number, toHpa: number): number {
  return altitudeFromPressure(toHpa) - altitudeFromPressure(fromHpa);
}

/** Sensible bounds for a typed elevation, in meters (the Dead Sea shore to above Everest). */
export const MIN_ELEVATION_M = -450;
export const MAX_ELEVATION_M = 9000;

export function isElevationInRange(m: number): boolean {
  return Number.isFinite(m) && m >= MIN_ELEVATION_M && m <= MAX_ELEVATION_M;
}

/** A plausible station pressure from a phone sensor, hPa. Anything outside is a bad sample and is dropped. */
export function isPlausiblePressure(hpa: number): boolean {
  return Number.isFinite(hpa) && hpa >= 250 && hpa <= 1100;
}

/** Where the elevation behind sea level pressure and the altimeter came from. */
export type ElevationSource = 'location' | 'typed' | 'none';

export interface ElevationFix {
  source: ElevationSource;
  /** Meters above sea level, or null when there is none. */
  meters: number | null;
  /** The pressure (hPa) at the moment the elevation was taken, so later readings can follow the change. */
  atHpa: number | null;
  /** When it was taken (ms). */
  at: number | null;
  /** The location fix's vertical accuracy in meters, when it came from location. */
  accuracy?: number | null;
}

export const NO_FIX: ElevationFix = { source: 'none', meters: null, atHpa: null, at: null };

/**
 * The elevation now: the fix's elevation plus the climb since it was
 * taken, read from pressure. With no fix, the standard-atmosphere
 * estimate from pressure alone (honest but only within tens of meters,
 * since the day's weather moves it).
 */
export function currentElevation(fix: ElevationFix, nowHpa: number): { meters: number; estimated: boolean } {
  if (fix.meters != null && fix.atHpa != null && Number.isFinite(fix.meters)) {
    return { meters: fix.meters + climbBetween(fix.atHpa, nowHpa), estimated: false };
  }
  return { meters: altitudeFromPressure(nowHpa), estimated: true };
}

/**
 * Sea level pressure for the reading on screen, from the elevation the
 * app knows (from location, or typed). Null with no elevation: the app
 * then shows what the sensor reads and says so.
 *
 * The elevation is held fixed, as a wall or boat barometer is set once
 * for where it hangs: a change in pressure then shows as a change in
 * sea level pressure. (The altimeter does the opposite and reads every
 * change as a climb; one number cannot tell weather from stairs.)
 */
export function seaLevelFor(fix: ElevationFix, nowHpa: number): number | null {
  if (fix.source === 'none' || fix.meters == null || !Number.isFinite(fix.meters)) return null;
  const p0 = seaLevelPressure(nowHpa, fix.meters);
  return Number.isFinite(p0) ? p0 : null;
}
