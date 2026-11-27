/**
 * The one-page PDF chart, for a doctor or a trip log: the range, a
 * summary, the chart with its gaps left empty, the notes as numbered
 * marks, a table of the notes with the pressure and trend at each, and a
 * plain footer. Laid out once as drawing operations in points, top-left
 * origin. Pure: the PDF writer (pdf.ts, pdf-lib) and the on-screen
 * preview (ui/PageView.tsx, react-native-svg) draw these same operations
 * with the same font files, so the preview is the PDF. Checked by
 * `npm test`.
 *
 * The page carries only the phone's readings and the person's own note
 * labels. It draws no conclusion from them.
 */
import type { Reading } from '../readings.ts';
import { DIRECTION_WORD, directionOf } from '../readings.ts';
import type { Note } from '../notes.ts';
import type { RangeId } from '../chart.ts';
import { chartData, pressureScale, RANGES, summary, thin, timeTicks, GAP_TEXT } from '../chart.ts';
import { formatChange, formatPressure, fromHpa, type PressureUnit } from '../units.ts';
import { formatDate, formatShortDate, formatTime, tickLabel } from '../format.ts';

export type FontKey = 'regular' | 'medium' | 'bold';

export interface Measure {
  /** Width of the text in points at this size, as the PDF will set it. */
  width(text: string, font: FontKey, size: number): number;
  /** The text with anything the font cannot draw replaced. */
  clean(text: string, font: FontKey): string;
}

export type Op =
  | { k: 'text'; x: number; y: number; text: string; font: FontKey; size: number; color: string }
  | { k: 'rect'; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; lw?: number }
  | { k: 'line'; x1: number; y1: number; x2: number; y2: number; color: string; lw: number; dash?: number[] }
  | { k: 'dot'; x: number; y: number; r: number; fill: string };

export interface Page {
  width: number;
  height: number;
  ops: Op[];
}

export type Paper = 'letter' | 'a4';

export const PAPER_SIZE: Record<Paper, { width: number; height: number }> = {
  letter: { width: 612, height: 792 },
  a4: { width: 595.28, height: 841.89 },
};

/** Letter in the US, Canada, Mexico and a few others; A4 elsewhere. */
export function paperForRegion(region: string | null): Paper {
  return region != null && ['US', 'CA', 'MX', 'PH', 'CL', 'CO', 'VE', 'GT', 'PR'].includes(region.toUpperCase()) ? 'letter' : 'a4';
}

export const PAGE_INK = '#101418';
export const PAGE_SOFT = '#4A5258';
export const PAGE_FAINT = '#858D93';
export const PAGE_RULE = '#D9DDD8';
/** The empty stretches with no readings. */
export const PAGE_GAP = '#EEF0EC';
/** The line: the app's teal, dark enough to print and copy. */
export const PAGE_LINE = '#0B5E57';

export interface PageInput {
  readings: Reading[];
  notes: Note[];
  range: RangeId;
  from: number;
  to: number;
  unit: PressureUnit;
  paper: Paper;
  locale: string;
}

const M = 44;

function fit(m: Measure, text: string, font: FontKey, size: number, max: number): string {
  let t = m.clean(text, font);
  if (m.width(t, font, size) <= max) return t;
  while (t.length > 1 && m.width(`${t}...`, font, size) > max) t = t.slice(0, -1);
  return `${t.trimEnd()}...`;
}

export function layoutPage(m: Measure, input: PageInput): Page {
  const { width: W, height: H } = PAPER_SIZE[input.paper];
  const ops: Op[] = [];
  const unit = input.unit;
  const loc = input.locale;
  const text = (x: number, y: number, s: string, font: FontKey, size: number, color = PAGE_INK) => ops.push({ k: 'text', x, y, text: m.clean(s, font), font, size, color });
  const right = (x: number, y: number, s: string, font: FontKey, size: number, color = PAGE_INK) => text(x - m.width(m.clean(s, font), font, size), y, s, font, size, color);
  const center = (x: number, y: number, s: string, font: FontKey, size: number, color = PAGE_INK) => text(x - m.width(m.clean(s, font), font, size) / 2, y, s, font, size, color);

  const rangeLabel = RANGES.find((r) => r.id === input.range)!.label;
  const data = chartData(input.readings, input.from, input.to);
  const sum = summary(data.points);

  // Head
  let y = M + 20;
  text(M, y, `Air pressure, last ${rangeLabel}`, 'bold', 22);
  y += 18;
  text(M, y, `${formatDate(input.from, loc)} to ${formatDate(input.to, loc)}. In ${unit}, as read by this iPhone's pressure sensor.`, 'regular', 10, PAGE_SOFT);

  // Summary: four cells
  y += 16;
  const cells: [string, string][] = sum
    ? [
        ['Latest', `${formatPressure(sum.last.hpa, unit, loc)} ${unit}`],
        ['High', `${formatPressure(sum.high.hpa, unit, loc)} ${unit}`],
        ['Low', `${formatPressure(sum.low.hpa, unit, loc)} ${unit}`],
        ['Change', `${sum.change < 0 ? '-' : '+'}${formatChange(sum.change, unit, loc)} ${unit}`],
      ]
    : [['Readings', 'None in this range']];
  const cw = (W - 2 * M) / 4;
  ops.push({ k: 'rect', x: M, y, w: W - 2 * M, h: 48, stroke: PAGE_RULE, lw: 0.8 });
  cells.forEach(([label, value], i) => {
    const x = M + i * cw;
    if (i > 0) ops.push({ k: 'line', x1: x, y1: y, x2: x, y2: y + 48, color: PAGE_RULE, lw: 0.8 });
    text(x + 10, y + 17, label.toUpperCase(), 'bold', 7.5, PAGE_SOFT);
    text(x + 10, y + 36, fit(m, value, 'medium', 13, cw - 16), 'medium', 13);
  });
  y += 48 + 26;

  // Chart
  const scale = pressureScale(data.points.map((p) => p.hpa), unit);
  const cx = M + 44;
  const cwid = W - M - cx;
  const ctop = y;
  const ch = Math.round(H * 0.36);
  const X = (t: number) => cx + ((t - input.from) / Math.max(1, input.to - input.from)) * cwid;
  const Y = (hpa: number) => ctop + ch - ((fromHpa(hpa, unit) - scale.min) / Math.max(1e-9, scale.max - scale.min)) * ch;
  for (const g of data.gaps) ops.push({ k: 'rect', x: X(g.from), y: ctop, w: Math.max(0.5, X(g.to) - X(g.from)), h: ch, fill: PAGE_GAP });
  for (const t of scale.ticks) {
    const ty = ctop + ch - ((t - scale.min) / Math.max(1e-9, scale.max - scale.min)) * ch;
    ops.push({ k: 'line', x1: cx, y1: ty, x2: cx + cwid, y2: ty, color: PAGE_RULE, lw: 0.6 });
    right(cx - 6, ty + 3, t.toFixed(scale.decimals), 'regular', 8, PAGE_SOFT);
  }
  ops.push({ k: 'rect', x: cx, y: ctop, w: cwid, h: ch, stroke: PAGE_FAINT, lw: 0.8 });
  for (const t of timeTicks(input.from, input.to, input.range)) {
    const tx = X(t);
    ops.push({ k: 'line', x1: tx, y1: ctop + ch, x2: tx, y2: ctop + ch + 4, color: PAGE_FAINT, lw: 0.8 });
    center(tx, ctop + ch + 14, tickLabel(t, input.range, loc), 'regular', 8, PAGE_SOFT);
  }
  for (const run of thin(data, 300)) {
    if (run.length === 1) ops.push({ k: 'dot', x: X(run[0].t), y: Y(run[0].hpa), r: 1.8, fill: PAGE_LINE });
    for (let i = 1; i < run.length; i++) ops.push({ k: 'line', x1: X(run[i - 1].t), y1: Y(run[i - 1].hpa), x2: X(run[i].t), y2: Y(run[i].hpa), color: PAGE_LINE, lw: 1.6 });
  }
  const shown = [...input.notes].filter((n) => n.t >= input.from && n.t <= input.to).sort((a, b) => a.t - b.t);
  shown.forEach((n, i) => {
    const nx = X(n.t);
    ops.push({ k: 'line', x1: nx, y1: ctop + 12, x2: nx, y2: ctop + ch, color: PAGE_SOFT, lw: 0.7, dash: [2, 2] });
    ops.push({ k: 'dot', x: nx, y: ctop + 8, r: 6.5, fill: PAGE_INK });
    center(nx, ctop + 10.8, String(i + 1), 'bold', 7.5, '#FFFFFF');
  });
  y = ctop + ch + 30;
  if (data.gaps.length > 0 && data.points.length > 0) {
    ops.push({ k: 'rect', x: M, y: y - 8, w: 10, h: 10, fill: PAGE_GAP, stroke: PAGE_RULE, lw: 0.5 });
    text(M + 16, y, GAP_TEXT, 'regular', 9, PAGE_SOFT);
    y += 16;
  }

  // Notes table
  y += 14;
  text(M, y, 'NOTES', 'bold', 8, PAGE_SOFT);
  y += 8;
  ops.push({ k: 'line', x1: M, y1: y, x2: W - M, y2: y, color: PAGE_INK, lw: 1 });
  const cols = { n: M, when: M + 24, label: M + 150, p: W - M - 150, trend: W - M };
  const footTop = H - M - 26;
  if (shown.length === 0) {
    y += 18;
    text(M, y, 'No notes in this range.', 'regular', 10, PAGE_SOFT);
  }
  let i = 0;
  for (; i < shown.length; i++) {
    if (y + 18 > footTop - 14) break;
    const n = shown[i];
    y += 18;
    text(cols.n, y, String(i + 1), 'bold', 10);
    text(cols.when, y, `${formatShortDate(n.t, loc)}, ${formatTime(n.t, loc)}`, 'regular', 10, PAGE_SOFT);
    text(cols.label, y, fit(m, n.label, 'medium', 10, cols.p - cols.label - 70), 'medium', 10);
    right(cols.p + 40, y, n.hpa != null ? `${formatPressure(n.hpa, unit, loc)} ${unit}` : 'No reading', 'regular', 10);
    const tr = n.changeHpa == null ? '' : `${DIRECTION_WORD[directionOf(n.changeHpa)]}, ${formatChange(n.changeHpa, unit, loc)} in 3 h`;
    right(cols.trend, y, tr, 'regular', 10, PAGE_SOFT);
    ops.push({ k: 'line', x1: M, y1: y + 6, x2: W - M, y2: y + 6, color: PAGE_RULE, lw: 0.5 });
  }
  if (i < shown.length) {
    y += 16;
    text(M, y, `${shown.length - i} more ${shown.length - i === 1 ? 'note is' : 'notes are'} in the CSV export.`, 'regular', 9, PAGE_SOFT);
  }

  // Footer
  ops.push({ k: 'line', x1: M, y1: footTop, x2: W - M, y2: footTop, color: PAGE_RULE, lw: 0.6 });
  text(M, footTop + 14, "Recorded with Barometer on this iPhone. Station pressure from the phone's own sensor, not adjusted to sea level.", 'regular', 8, PAGE_FAINT);
  text(M, footTop + 25, 'Empty stretches are times with no reading; nothing is filled in. Note labels are the person’s own.', 'regular', 8, PAGE_FAINT);
  return { width: W, height: H, ops };
}
