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
    const open = (hr >= 7 && hr < 8.5) || (hr >= 18.5 && hr < 21.5) || t > end - 2.2 * HOUR;
    const background = !open && Math.round((t - start) / MINUTE) % 200 === 0 && hr > 9 && hr < 23;
    if (open || background) {
      const jitter = Math.sin(t / 7_919) * 0.06;
      out.push({ t, hpa: Math.round((samplePressure(t, end) + jitter) * 100) / 100, source: open ? 'open' : 'background' });
    }
  }
  return out;
}

export function sampleNotes(end: number): Note[] {
  const at = (hoursAgo: number) => end - hoursAgo * HOUR;
  return [
    { id: 's1', t: at(44), label: 'Headache', hpa: samplePressure(at(44), end), changeHpa: -3.1, createdAt: at(44) },
    { id: 's2', t: at(20), label: 'Fishing', hpa: samplePressure(at(20), end), changeHpa: 1.4, createdAt: at(20) },
    { id: 's3', t: at(1.5), label: 'Hike', hpa: samplePressure(at(1.5), end), changeHpa: 0.4, createdAt: at(1.5) },
  ];
}
