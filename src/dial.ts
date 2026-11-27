/**
 * The dial's scale: which stretch of pressure the 270 degree arc covers in
 * each unit, its graduations, and where the hand points. Pure, checked by
 * `npm test`.
 *
 * Each unit has the span a wall barometer has (about 950 to 1050 hPa) with
 * round graduations in that unit. Up a mountain the reading falls below
 * that span; the scale then slides, whole graduations at a time, so the
 * hand is always on the dial.
 */
import { fromHpa, type PressureUnit } from './units.ts';

export interface DialScale {
  min: number;
  max: number;
  /** A labeled tick every `major`. */
  major: number;
  /** A small tick every `minor`. */
  minor: number;
  decimals: number;
}

const BASE: Record<PressureUnit, DialScale> = {
  hPa: { min: 950, max: 1050, major: 10, minor: 2, decimals: 0 },
  mbar: { min: 950, max: 1050, major: 10, minor: 2, decimals: 0 },
  inHg: { min: 28, max: 31, major: 0.5, minor: 0.1, decimals: 1 },
  mmHg: { min: 710, max: 790, major: 10, minor: 2, decimals: 0 },
  kPa: { min: 95, max: 105, major: 1, minor: 0.2, decimals: 0 },
  psi: { min: 13.8, max: 15.2, major: 0.2, minor: 0.05, decimals: 1 },
};

/** The arc runs from -135 to +135 degrees, 0 at the top. */
export const ARC_START = -135;
export const ARC_END = 135;

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** The scale for a unit, slid so the reading is on it. */
export function dialScale(unit: PressureUnit, readingHpa: number | null): DialScale {
  const b = BASE[unit];
  if (readingHpa == null || !Number.isFinite(readingHpa)) return b;
  const v = fromHpa(readingHpa, unit);
  if (v >= b.min && v <= b.max) return b;
  const span = b.max - b.min;
  const min = r6(Math.round((v - span / 2) / b.major) * b.major);
  return { ...b, min, max: r6(min + span) };
}

/** Degrees for a value on the scale, held to the ends of the arc. */
export function angleFor(scale: DialScale, value: number): number {
  const f = (value - scale.min) / (scale.max - scale.min);
  const c = Math.min(1, Math.max(0, f));
  return ARC_START + (ARC_END - ARC_START) * c;
}

/** Every tick on the scale: its value and whether it is a labeled one. */
export function dialTicks(scale: DialScale): { value: number; major: boolean }[] {
  const out: { value: number; major: boolean }[] = [];
  const n = Math.round((scale.max - scale.min) / scale.minor);
  for (let i = 0; i <= n; i++) {
    const value = r6(scale.min + i * scale.minor);
    const k = value / scale.major;
    out.push({ value, major: Math.abs(k - Math.round(k)) < 1e-6 });
  }
  return out;
}
