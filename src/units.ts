/**
 * Pressure and elevation units. Pure, checked by `npm test`.
 *
 * Every pressure is kept in hPa (the sensor's own unit after expo-sensors
 * converts it) and every elevation in meters. Units only change how a
 * number is shown or typed. The factors are exact or standard:
 *  - 1 hPa = 1 mbar = 0.1 kPa (exact)
 *  - 1 inHg = 33.8638866667 hPa (at 0 degrees C, the aviation standard)
 *  - 1 mmHg = 1.33322387415 hPa (133.322387415 Pa, the conventional
 *    millimeter of mercury; a torr is a hair smaller)
 *  - 1 psi = 68.9475729318 hPa (6894.75729318 Pa)
 *  - 1 ft = 0.3048 m (exact)
 */

export type PressureUnit = 'hPa' | 'mbar' | 'inHg' | 'mmHg' | 'kPa' | 'psi';
export type ElevationUnit = 'ft' | 'm';

export const PRESSURE_UNITS: PressureUnit[] = ['hPa', 'mbar', 'inHg', 'mmHg', 'kPa', 'psi'];
export const ELEVATION_UNITS: ElevationUnit[] = ['ft', 'm'];

/** hPa in one of each unit. */
export const HPA_PER: Record<PressureUnit, number> = {
  hPa: 1,
  mbar: 1,
  inHg: 33.8638866667,
  mmHg: 1.33322387415,
  kPa: 10,
  psi: 68.9475729318,
};

/** Decimals shown for a reading in each unit: about 0.1 hPa of resolution. */
export const DECIMALS: Record<PressureUnit, number> = {
  hPa: 1,
  mbar: 1,
  inHg: 2,
  mmHg: 1,
  kPa: 2,
  psi: 2,
};

/** Decimals for a change (a trend or an alert amount), one finer where a change is small in that unit. */
export const CHANGE_DECIMALS: Record<PressureUnit, number> = {
  hPa: 1,
  mbar: 1,
  inHg: 2,
  mmHg: 1,
  kPa: 2,
  psi: 3,
};

export const FT_PER_M = 1 / 0.3048;

export function isPressureUnit(u: unknown): u is PressureUnit {
  return typeof u === 'string' && (PRESSURE_UNITS as string[]).includes(u);
}

export function isElevationUnit(u: unknown): u is ElevationUnit {
  return u === 'ft' || u === 'm';
}

export function fromHpa(hpa: number, unit: PressureUnit): number {
  return hpa / HPA_PER[unit];
}

export function toHpa(value: number, unit: PressureUnit): number {
  return value * HPA_PER[unit];
}

export function metersTo(m: number, unit: ElevationUnit): number {
  return unit === 'ft' ? m * FT_PER_M : m;
}

export function toMeters(value: number, unit: ElevationUnit): number {
  return unit === 'ft' ? value / FT_PER_M : value;
}

/** Rounds half away from zero to `d` decimals, without float drift (1.005 -> 1.01). */
export function roundTo(n: number, d: number): number {
  if (!Number.isFinite(n)) return n;
  const f = 10 ** d;
  const r = Math.round(Math.abs(n) * f + 1e-9) / f;
  return n < 0 ? -r : r;
}

function fixed(n: number, d: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
  } catch {
    return n.toFixed(d);
  }
}

/** A reading as shown: 1013.25 hPa -> "1,013.3" in en-US, "29.92" in inHg. No unit. */
export function formatPressure(hpa: number, unit: PressureUnit, locale = 'en-US'): string {
  const d = DECIMALS[unit];
  return fixed(roundTo(fromHpa(hpa, unit), d), d, locale);
}

/**
 * A change as words use it: always positive (the word says the direction),
 * trailing zeros trimmed so "4 hPa" and "3.1 hPa" read naturally.
 */
export function formatChange(deltaHpa: number, unit: PressureUnit, locale = 'en-US'): string {
  const d = CHANGE_DECIMALS[unit];
  const v = roundTo(Math.abs(fromHpa(deltaHpa, unit)), d);
  try {
    return new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: d }).format(v);
  } catch {
    return String(v);
  }
}

/** An elevation in whole feet or meters: "1,250". */
export function formatElevation(m: number, unit: ElevationUnit, locale = 'en-US'): string {
  return fixed(Math.round(metersTo(m, unit)), 0, locale);
}

/** A climb or drop with its sign: "+12", "-3", "0". */
export function formatClimb(m: number, unit: ElevationUnit, locale = 'en-US'): string {
  const v = Math.round(metersTo(m, unit));
  const s = fixed(Math.abs(v), 0, locale);
  return v > 0 ? `+${s}` : v < 0 ? `-${s}` : s;
}

/** Units from the phone's region: inHg and feet in the US (and its territories), hPa and meters elsewhere. */
export function defaultUnits(region: string | null): { pressure: PressureUnit; elevation: ElevationUnit } {
  const us = region != null && ['US', 'PR', 'GU', 'VI', 'AS', 'MP', 'UM', 'LR', 'MM'].includes(region.toUpperCase());
  return us ? { pressure: 'inHg', elevation: 'ft' } : { pressure: 'hPa', elevation: 'm' };
}

/** Reads a typed number in either decimal style ("1.5", "1,5", "1,250"). Null when it is not a number. */
export function parseNumber(text: string): number | null {
  let s = String(text ?? '').trim().replace(/\s/g, '');
  if (!s) return null;
  const neg = s.startsWith('-');
  if (neg) s = s.slice(1);
  if (!/^[0-9.,]+$/.test(s)) return null;
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  let normal: string;
  if (lastDot >= 0 && lastComma >= 0) {
    // Both: the later one is the decimal mark.
    normal = lastDot > lastComma ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.');
  } else if (lastComma >= 0) {
    // Only commas: "1,250" (three digits after, one comma) is thousands; otherwise a decimal comma.
    const parts = s.split(',');
    normal = parts.length === 2 && parts[1].length === 3 ? parts.join('') : parts.length === 2 ? `${parts[0]}.${parts[1]}` : parts.join('');
  } else {
    const parts = s.split('.');
    normal = parts.length <= 2 ? s : parts.join('');
  }
  const n = Number(normal);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}
