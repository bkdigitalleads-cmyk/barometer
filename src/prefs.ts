/**
 * The person's settings, kept as one JSON value in the kv table, with a
 * forgiving reader: anything missing or unreadable falls back to the
 * default, so an old or damaged value never stops the app. Pure, checked
 * by `npm test`.
 */
import type { ElevationFix } from './atmosphere.ts';
import { isElevationInRange, NO_FIX } from './atmosphere.ts';
import { ALERT_STEPS_HPA, DEFAULT_ALERT_HPA } from './alerts.ts';
import type { DialStyle } from './gates.ts';
import type { RangeId } from './chart.ts';
import type { ElevationUnit, PressureUnit } from './units.ts';
import { defaultUnits, isElevationUnit, isPressureUnit } from './units.ts';

export type GaugeMode = 'sensor' | 'sea';

export interface Prefs {
  pressureUnit: PressureUnit;
  elevationUnit: ElevationUnit;
  /** What the big number on the gauge shows. Sea level needs an elevation. */
  gaugeMode: GaugeMode;
  dial: DialStyle;
  /** The elevation from location, taken on the Altimeter tab. */
  located: ElevationFix;
  /** An elevation the person typed (Pro), or null. */
  typed: ElevationFix | null;
  alertOn: boolean;
  alertHpa: number;
  range: RangeId;
}

export const PREFS_KEY = 'prefs';

export function defaultPrefs(region: string | null): Prefs {
  const u = defaultUnits(region);
  return {
    pressureUnit: u.pressure,
    elevationUnit: u.elevation,
    gaugeMode: 'sensor',
    dial: 'classic',
    located: NO_FIX,
    typed: null,
    alertOn: false,
    alertHpa: DEFAULT_ALERT_HPA,
    range: '24h',
  };
}

function fix(v: any, source: 'location' | 'typed'): ElevationFix | null {
  if (!v || typeof v !== 'object' || v.source !== source) return null;
  const meters = Number(v.meters);
  if (!isElevationInRange(meters)) return null;
  const atHpa = v.atHpa == null ? null : Number(v.atHpa);
  const at = v.at == null ? null : Number(v.at);
  return {
    source,
    meters,
    atHpa: atHpa != null && Number.isFinite(atHpa) ? atHpa : null,
    at: at != null && Number.isFinite(at) ? at : null,
    accuracy: v.accuracy == null || !Number.isFinite(Number(v.accuracy)) ? null : Number(v.accuracy),
  };
}

export function parsePrefs(json: string | null, region: string | null): Prefs {
  const d = defaultPrefs(region);
  if (!json) return d;
  let v: any;
  try {
    v = JSON.parse(json);
  } catch {
    return d;
  }
  if (!v || typeof v !== 'object') return d;
  return {
    pressureUnit: isPressureUnit(v.pressureUnit) ? v.pressureUnit : d.pressureUnit,
    elevationUnit: isElevationUnit(v.elevationUnit) ? v.elevationUnit : d.elevationUnit,
    gaugeMode: v.gaugeMode === 'sea' ? 'sea' : 'sensor',
    dial: v.dial === 'marine' || v.dial === 'plain' ? v.dial : 'classic',
    located: fix(v.located, 'location') ?? NO_FIX,
    typed: fix(v.typed, 'typed'),
    alertOn: v.alertOn === true,
    alertHpa: ALERT_STEPS_HPA.includes(Number(v.alertHpa)) ? Number(v.alertHpa) : d.alertHpa,
    range: ['3h', '24h', '7d', '30d'].includes(v.range) ? v.range : d.range,
  };
}
