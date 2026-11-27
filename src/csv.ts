/**
 * The CSV export: every reading and note in one file, in time order, for
 * a spreadsheet. Pure, checked by `npm test`. UTF-8, comma separated,
 * fields quoted when they hold a comma, a quote or a line break (RFC 4180),
 * lines ending CRLF.
 */
import type { Reading } from './readings.ts';
import type { Note } from './notes.ts';
import { DECIMALS, fromHpa, roundTo, type PressureUnit } from './units.ts';

export function csvField(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v);
  // A leading = + - @ would be read as a formula by a spreadsheet; a quote mark keeps it text.
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** "2026-11-27 09:05", local time. */
export function localStamp(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function num(hpa: number | null, unit: PressureUnit): string {
  if (hpa == null || !Number.isFinite(hpa)) return '';
  const d = DECIMALS[unit] + 1;
  return roundTo(fromHpa(hpa, unit), d).toFixed(d);
}

const SOURCE: Record<string, string> = { open: 'App open', background: 'Background' };

/**
 * Columns: Time (local), Kind (Reading or Note), Pressure (hPa), the
 * person's unit when it is not hPa, How (App open or Background, for a
 * reading), Label (for a note). One more decimal than the screen shows.
 */
export function readingsCsv(readings: Reading[], notes: Note[], unit: PressureUnit): string {
  const extra = unit !== 'hPa' && unit !== 'mbar';
  const head = ['Time', 'Kind', 'Pressure (hPa)', ...(extra ? [`Pressure (${unit})`] : []), 'How', 'Label'];
  type Row = { t: number; order: number; cells: (string | number)[] };
  const rows: Row[] = [];
  for (const r of readings) rows.push({ t: r.t, order: 0, cells: [localStamp(r.t), 'Reading', num(r.hpa, 'hPa'), ...(extra ? [num(r.hpa, unit)] : []), SOURCE[r.source] ?? r.source, ''] });
  for (const n of notes) rows.push({ t: n.t, order: 1, cells: [localStamp(n.t), 'Note', num(n.hpa, 'hPa'), ...(extra ? [num(n.hpa, unit)] : []), '', n.label] });
  rows.sort((a, b) => a.t - b.t || a.order - b.order);
  return [head, ...rows.map((r) => r.cells)].map((line) => line.map(csvField).join(',')).join('\r\n') + '\r\n';
}

/** "Barometer readings 2026-11-27.csv" */
export function csvFileName(day: string): string {
  return `Barometer readings ${day}.csv`;
}
