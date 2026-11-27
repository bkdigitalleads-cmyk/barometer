/**
 * Chart data: which readings fall in a range, where the line breaks, and
 * the scale. Pure, checked by `npm test`. The screen (src/ui/Chart.tsx)
 * and the PDF (src/pdf/layout.ts) both draw from this.
 *
 * Gaps are shown as gaps, never drawn over. Two readings are joined by a
 * line only when they are close in time (joinGapMs); otherwise the line
 * stops, the stretch between is left empty and marked, and a reading on
 * its own is a dot.
 */
import type { Reading } from './readings.ts';
import { DAY, HOUR, MINUTE } from './readings.ts';
import { fromHpa, type PressureUnit } from './units.ts';

export type RangeId = '3h' | '24h' | '7d' | '30d';

export const RANGES: { id: RangeId; label: string; ms: number }[] = [
  { id: '3h', label: '3 hours', ms: 3 * HOUR },
  { id: '24h', label: '24 hours', ms: 24 * HOUR },
  { id: '7d', label: '7 days', ms: 7 * DAY },
  { id: '30d', label: '30 days', ms: 30 * DAY },
];

export function rangeMs(id: RangeId): number {
  return RANGES.find((r) => r.id === id)!.ms;
}

export const RANGE_SHORT: Record<RangeId, string> = { '3h': '3H', '24h': '24H', '7d': '7D', '30d': '30D' };

/** The shortest stretch that counts as a gap, at any range. */
export const MIN_JOIN_MS = 45 * MINUTE;

/**
 * The longest time between two readings that are still joined by a line:
 * 45 minutes, or 1/120 of the range when that is longer (84 minutes at 7
 * days, 6 hours at 30 days), so a gap is never thinner than about 1% of
 * the chart's width and stays visible.
 */
export function joinGapMs(range: number): number {
  return Math.max(MIN_JOIN_MS, range / 120);
}

export interface Gap {
  from: number;
  to: number;
}

export interface ChartData {
  from: number;
  to: number;
  /** Runs of readings joined by a line; a run of one is drawn as a dot. */
  segments: Reading[][];
  /** Stretches with no readings, including before the first and after the last. */
  gaps: Gap[];
  /** Every reading in range, in time order. */
  points: Reading[];
}

/** Splits the readings in [from, to] into joined runs and gaps. `readings` must be in time order. */
export function chartData(readings: Reading[], from: number, to: number): ChartData {
  const join = joinGapMs(to - from);
  const points = readings.filter((r) => r.t >= from && r.t <= to);
  const segments: Reading[][] = [];
  const gaps: Gap[] = [];
  if (points.length === 0) return { from, to, segments, gaps: [{ from, to }], points };
  if (points[0].t - from > join) gaps.push({ from, to: points[0].t });
  let run: Reading[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    if (cur.t - prev.t > join) {
      segments.push(run);
      gaps.push({ from: prev.t, to: cur.t });
      run = [cur];
    } else run.push(cur);
  }
  segments.push(run);
  const last = points[points.length - 1];
  if (to - last.t > join) gaps.push({ from: last.t, to });
  return { from, to, segments, gaps, points };
}

/** True when part of the range has no readings (the chart then says why). */
export function hasGaps(d: ChartData): boolean {
  return d.gaps.length > 0;
}

/**
 * Fewer points for drawing: each run is cut into time buckets and each
 * bucket becomes its mean. Runs never merge, so a gap stays a gap.
 */
export function thin(d: ChartData, buckets: number): Reading[][] {
  const span = Math.max(1, d.to - d.from);
  const size = span / Math.max(1, buckets);
  return d.segments.map((run) => {
    if (run.length <= 2) return run;
    const out: Reading[] = [];
    let key = Math.floor((run[0].t - d.from) / size);
    let sumT = 0;
    let sumP = 0;
    let n = 0;
    const flush = () => {
      if (n) out.push({ t: sumT / n, hpa: sumP / n, source: 'open' });
      sumT = sumP = n = 0;
    };
    for (const r of run) {
      const k = Math.floor((r.t - d.from) / size);
      if (k !== key) {
        flush();
        key = k;
      }
      sumT += r.t;
      sumP += r.hpa;
      n++;
    }
    flush();
    return out;
  });
}

export interface Scale {
  /** In the person's unit. */
  min: number;
  max: number;
  ticks: number[];
  /** Decimals for the tick labels. */
  decimals: number;
}

/** At least this many hPa top to bottom, so a steady day does not look wild. */
export const MIN_SPAN_HPA = 6;

const STEPS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];

/**
 * The vertical scale, in the person's unit: the readings' low and high
 * with some room, never less than MIN_SPAN_HPA, with round ticks (1, 2 or
 * 5 times a power of ten), about four to six of them.
 */
export function pressureScale(valuesHpa: number[], unit: PressureUnit = 'hPa'): Scale {
  const v = valuesHpa.filter((x) => Number.isFinite(x)).map((x) => fromHpa(x, unit));
  const minSpan = fromHpa(MIN_SPAN_HPA, unit);
  let lo = v.length ? Math.min(...v) : fromHpa(1008, unit);
  let hi = v.length ? Math.max(...v) : fromHpa(1018, unit);
  const mid = (lo + hi) / 2;
  if (hi - lo < minSpan) {
    lo = mid - minSpan / 2;
    hi = mid + minSpan / 2;
  } else {
    const pad = (hi - lo) * 0.12;
    lo -= pad;
    hi += pad;
  }
  const raw = (hi - lo) / 4;
  const step = STEPS.find((s) => s >= raw - 1e-12) ?? 100;
  const min = Math.floor(lo / step + 1e-9) * step;
  const max = Math.ceil(hi / step - 1e-9) * step;
  const ticks: number[] = [];
  const n = Math.round((max - min) / step);
  for (let i = 0; i <= n; i++) ticks.push(Math.round((min + i * step) * 1000) / 1000);
  const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
  return { min: ticks[0], max: ticks[ticks.length - 1], ticks, decimals };
}

/** Time ticks for the bottom axis: hours for 3h and 24h, days for 7d and 30d. */
export function timeTicks(from: number, to: number, range: RangeId): number[] {
  const step = range === '3h' ? HOUR : range === '24h' ? 6 * HOUR : range === '7d' ? DAY : 7 * DAY;
  const out: number[] = [];
  const d = new Date(from);
  if (range === '3h' || range === '24h') {
    d.setMinutes(0, 0, 0);
    if (range === '24h') d.setHours(Math.ceil(d.getHours() / 6) * 6);
  } else d.setHours(0, 0, 0, 0);
  let t = d.getTime();
  while (t < from) t += step;
  for (; t <= to; t += step) {
    out.push(t);
    if (range === '7d' || range === '30d') {
      // Keep ticks on local midnight across a clock change.
      const n = new Date(t + step);
      n.setHours(0, 0, 0, 0);
      t = n.getTime() - step;
    }
  }
  return out;
}

/** Low, high, first and last in range, and the change across it. */
export function summary(points: Reading[]): { low: Reading; high: Reading; first: Reading; last: Reading; change: number } | null {
  if (points.length === 0) return null;
  let low = points[0];
  let high = points[0];
  for (const p of points) {
    if (p.hpa < low.hpa) low = p;
    if (p.hpa > high.hpa) high = p;
  }
  const first = points[0];
  const last = points[points.length - 1];
  return { low, high, first, last, change: last.hpa - first.hpa };
}

/** The words under a chart with a gap. */
export const GAP_TEXT = 'No readings while the app was closed.';
