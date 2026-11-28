/**
 * A made-up history: a week of readings with a low passing through, the
 * app open in the mornings and evenings (a reading every five minutes)
 * and a few background readings in between, with the gaps those leave.
 * Used on the onboarding chart, by the test menu (test builds only) and
 * for the design renders. Never mixed into a person's own readings unless
 * they add it from the test menu. Pure and deterministic.
 */
import type { Reading } from './readings.ts';
import { HOUR, MINUTE } from './readings.ts';
import type { Note } from './notes.ts';

/** The made-up pressure at time t (hPa): a slow swing with a low about two days before `end`. */
export function samplePressure(t: number, end: number): number {
  const h = (end - t) / HOUR;
  const low = -11 * Math.exp(-Math.pow((h - 40) / 16, 2));
  const swing = 2.2 * Math.sin(h / 23);
  const tide = 0.5 * Math.sin((h * 2 * Math.PI) / 12.4);
  return 1015.5 + low + swing + tide;
}

export function sampleReadings(end: number, days = 8): Reading[] {
  const out: Reading[] = [];
  const start = end - days * 24 * HOUR;
  for (let t = start; t <= end; t += 5 * MINUTE) {
    const local = new Date(t);
    const hr = local.getHours() + local.getMinutes() / 60;
    const open = (hr >= 7 && hr < 8.5) || (hr >= 18.5 && hr < 21.5) || t > end - 3.3 * HOUR;
    // iOS lets the app check every couple of hours or so while closed, less in the small hours.
    const background = !open && Math.round((t - start) / MINUTE) % 150 === 0 && (hr < 1 || hr > 6);
    if (open || background) {
      const jitter = Math.sin(t / 7_919) * 0.06;
      out.push({ t, hpa: Math.round((samplePressure(t, end) + jitter) * 100) / 100, source: open ? 'open' : 'background' });
    }
  }
  return out;
}

/**
 * A full day for the onboarding chart: a reading every five minutes,
 * except a stretch overnight when the app was closed.
 */
export function sampleDay(end: number): Reading[] {
  const out: Reading[] = [];
  for (let t = end - 24 * HOUR; t <= end; t += 5 * MINUTE) {
    const ago = (end - t) / HOUR;
    if (ago > 9 && ago < 14) continue;
    out.push({ t, hpa: Math.round(samplePressure(t + 30 * HOUR, end) * 100) / 100, source: 'open' });
  }
  return out;
}

export function sampleNotes(end: number): Note[] {
  const note = (id: string, hoursAgo: number, label: string): Note => {
    const t = end - hoursAgo * HOUR;
    const hpa = samplePressure(t, end);
    return { id, t, label, hpa, changeHpa: hpa - samplePressure(t - 3 * HOUR, end), createdAt: t };
  };
  return [note('s1', 46, 'Headache'), note('s2', 20, 'Fishing'), note('s3', 1.5, 'Hike')];
}
