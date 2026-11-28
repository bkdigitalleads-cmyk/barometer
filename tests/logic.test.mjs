// Unit checks for Barometer's pure logic: units, sea level, the trend
// rule, gaps in the chart data, the alert rule, notes, CSV, settings, the
// free versus Pro gates and the rating rules. Every module here is what
// the app runs (pure .ts, imported directly by Node).
import { test } from 'node:test';
import assert from 'node:assert/strict';

const U = await import('../src/units.ts');
const A = await import('../src/atmosphere.ts');
const R = await import('../src/readings.ts');
const C = await import('../src/chart.ts');
const AL = await import('../src/alerts.ts');
const N = await import('../src/notes.ts');
const CSV = await import('../src/csv.ts');
const G = await import('../src/gates.ts');
const P = await import('../src/prefs.ts');
const RU = await import('../src/rules.ts');

const MIN = 60_000;
const H = 60 * MIN;
const D = 24 * H;
const T0 = new Date(2026, 10, 27, 9, 0).getTime();
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg ?? ''} ${a} is not within ${eps} of ${b}`);
const series = (start, stepMs, values, source = 'open') => values.map((hpa, i) => ({ t: start + i * stepMs, hpa, source }));

// ---------- units ----------

test('units: standard air (1013.25 hPa) in every unit', () => {
  near(U.fromHpa(1013.25, 'hPa'), 1013.25, 1e-9);
  near(U.fromHpa(1013.25, 'mbar'), 1013.25, 1e-9);
  near(U.fromHpa(1013.25, 'inHg'), 29.9213, 1e-4);
  near(U.fromHpa(1013.25, 'mmHg'), 760.0, 1e-3);
  near(U.fromHpa(1013.25, 'kPa'), 101.325, 1e-9);
  near(U.fromHpa(1013.25, 'psi'), 14.6959, 1e-4);
  assert.equal(U.formatPressure(1013.25, 'hPa'), '1,013.3');
  assert.equal(U.formatPressure(1013.25, 'mbar'), '1,013.3');
  assert.equal(U.formatPressure(1013.25, 'inHg'), '29.92');
  assert.equal(U.formatPressure(1013.25, 'mmHg'), '760.0');
  assert.equal(U.formatPressure(1013.25, 'kPa'), '101.33');
  assert.equal(U.formatPressure(1013.25, 'psi'), '14.70');
  assert.equal(U.formatPressure(1013.25, 'hPa', 'de-DE'), '1.013,3');
});

test('units: every unit converts there and back exactly; feet and meters', () => {
  for (const u of U.PRESSURE_UNITS) {
    for (const hpa of [300, 870.4, 1013.25, 1084.8]) near(U.toHpa(U.fromHpa(hpa, u), u), hpa, 1e-9, u);
  }
  near(U.metersTo(1000, 'ft'), 3280.84, 0.01);
  near(U.toMeters(3280.84, 'ft'), 1000, 0.001);
  assert.equal(U.metersTo(12, 'm'), 12);
  assert.equal(U.formatElevation(1000, 'ft'), '3,281');
  assert.equal(U.formatElevation(-12.4, 'm'), '-12');
  assert.equal(U.formatClimb(3.4, 'm'), '+3');
  assert.equal(U.formatClimb(-3.6, 'ft'), '-12');
  assert.equal(U.formatClimb(0.2, 'm'), '0');
});

test('units: a change reads naturally ("4 hPa", "3.1 hPa"), always positive', () => {
  assert.equal(U.formatChange(-4, 'hPa'), '4');
  assert.equal(U.formatChange(-3.14, 'hPa'), '3.1');
  assert.equal(U.formatChange(3.1, 'inHg'), '0.09');
  assert.equal(U.formatChange(4, 'mmHg'), '3');
  assert.equal(U.formatChange(4, 'psi'), '0.058');
  assert.equal(U.formatChange(4, 'kPa'), '0.4');
});

test('units: defaults by region, rounding, typed numbers in either decimal style', () => {
  assert.deepEqual(U.defaultUnits('US'), { pressure: 'inHg', elevation: 'ft' });
  assert.deepEqual(U.defaultUnits('DE'), { pressure: 'hPa', elevation: 'm' });
  assert.deepEqual(U.defaultUnits(null), { pressure: 'hPa', elevation: 'm' });
  assert.equal(U.roundTo(1.005, 2), 1.01);
  assert.equal(U.roundTo(-2.5, 0), -3);
  assert.equal(U.parseNumber('1,250'), 1250);
  assert.equal(U.parseNumber('1.5'), 1.5);
  assert.equal(U.parseNumber('1,5'), 1.5);
  assert.equal(U.parseNumber('1.250,75'), 1250.75);
  assert.equal(U.parseNumber('-30'), -30);
  assert.equal(U.parseNumber('abc'), null);
  assert.equal(U.parseNumber(''), null);
});

// ---------- the atmosphere ----------

test('elevation from pressure: the standard atmosphere table', () => {
  near(A.altitudeFromPressure(1013.25), 0, 1e-6);
  near(A.altitudeFromPressure(898.75), 1000, 1);
  near(A.altitudeFromPressure(795.01), 2000, 1);
  near(A.altitudeFromPressure(500), 5574, 3);
  near(A.pressureAtAltitude(1000), 898.75, 0.05);
  near(A.altitudeFromPressure(A.pressureAtAltitude(1234)), 1234, 1e-6);
  assert.ok(Number.isNaN(A.altitudeFromPressure(0)));
});

test('sea level pressure: at 0 m it is the reading; at 1000 m standard air adjusts back to 1013.25', () => {
  near(A.seaLevelPressure(1002.3, 0), 1002.3, 1e-9);
  near(A.seaLevelPressure(898.75, 1000), 1013.25, 0.05);
  near(A.seaLevelPressure(A.pressureAtAltitude(350, 1021.4), 350), 1021.4, 1e-6);
  // A typed elevation (or one from location) is held fixed, so weather moves sea level pressure.
  const typed = { source: 'typed', meters: 120, atHpa: null, at: null };
  const a = A.seaLevelFor(typed, 1000);
  const b = A.seaLevelFor(typed, 997);
  near(a - b, 3 * Math.pow(1 - 120 / 44330.77, -5.25588), 0.01);
  assert.equal(A.seaLevelFor(A.NO_FIX, 1000), null);
});

test('altimeter: climb since a reset from pressure alone; a fix from location carries the climb', () => {
  // About 8.4 m per hPa near sea level.
  near(A.climbBetween(1013.25, 1012.25), 8.4, 0.2);
  near(A.climbBetween(1012.25, 1013.25), -8.4, 0.2);
  const fix = { source: 'location', meters: 200, atHpa: 989.5, at: T0 };
  const now = A.currentElevation(fix, 988.5);
  assert.equal(now.estimated, false);
  near(now.meters, 200 + A.climbBetween(989.5, 988.5), 1e-9);
  const est = A.currentElevation(A.NO_FIX, 1001.3);
  assert.equal(est.estimated, true);
  near(est.meters, A.altitudeFromPressure(1001.3), 1e-9);
  assert.ok(A.isElevationInRange(8848) && !A.isElevationInRange(9500) && !A.isElevationInRange(-500));
  assert.ok(A.isPlausiblePressure(1013) && !A.isPlausiblePressure(0) && !A.isPlausiblePressure(2000));
});

// ---------- storing readings ----------

test('readings: one stored every five minutes, the median of the samples, bad samples dropped', () => {
  assert.equal(R.shouldStore(null, T0), true);
  assert.equal(R.shouldStore(T0, T0 + 4 * MIN), false);
  assert.equal(R.shouldStore(T0, T0 + 5 * MIN), true);
  assert.equal(R.shouldStore(T0, T0 - MIN), true, 'a clock set back stores again');
  assert.equal(R.median([1013.1, 1013.3, 1090, 1013.2]), (1013.2 + 1013.3) / 2);
  assert.equal(R.median([5, 1, 3]), 3);
  assert.equal(R.median([]), null);
  const clean = R.cleanReadings([
    { t: 3, hpa: 1000, source: 'open' },
    { t: 1, hpa: 1001, source: 'open' },
    { t: 3, hpa: 1002, source: 'background' },
    { t: 2, hpa: 5000, source: 'open' },
  ]);
  assert.deepEqual(clean.map((r) => [r.t, r.hpa]), [[1, 1001], [3, 1002]]);
});

// ---------- the three-hour trend ----------

test('trend: compares with the reading nearest three hours before; Falling, 3.1 hPa in 3 hours', () => {
  const rs = series(T0, 5 * MIN, Array.from({ length: 37 }, (_, i) => 1015 - (3.1 * i) / 36));
  const at = rs[rs.length - 1];
  const tr = R.trendAt(rs, at);
  assert.equal(tr.kind, 'trend');
  assert.equal(tr.direction, 'falling');
  near(tr.changeHpa, -3.1, 1e-9);
  assert.equal(tr.spanMs, 3 * H);
  assert.equal(R.trendText(tr, 'hPa'), 'Falling, 3.1 hPa in 3 hours');
  assert.equal(R.trendText(tr, 'inHg'), 'Falling, 0.09 inHg in 3 hours');
});

test('trend: thresholds. Under 1 hPa is Steady; 1 hPa or more is Rising or Falling', () => {
  assert.equal(R.STEADY_BAND_HPA, 1.0);
  assert.equal(R.directionOf(0.99), 'steady');
  assert.equal(R.directionOf(-0.99), 'steady');
  assert.equal(R.directionOf(1.0), 'rising');
  assert.equal(R.directionOf(-1.0), 'falling');
  const base = [{ t: T0, hpa: 1010, source: 'open' }];
  assert.equal(R.trendAt(base, { t: T0 + 3 * H, hpa: 1010.6 }).direction, 'steady');
  assert.equal(R.trendText(R.trendAt(base, { t: T0 + 3 * H, hpa: 1010.6 }), 'hPa'), 'Steady, 0.6 hPa in 3 hours');
  assert.equal(R.trendText(R.trendAt(base, { t: T0 + 3 * H, hpa: 1012 }), 'hPa'), 'Rising, 2 hPa in 3 hours');
});

test('trend: needs a reading 1 to 3.5 hours back; says so when there is none; a shorter span is said', () => {
  const r = [{ t: T0, hpa: 1010, source: 'open' }];
  assert.equal(R.trendAt(r, { t: T0 + 50 * MIN, hpa: 1008 }).kind, 'none', 'under an hour');
  assert.equal(R.trendAt(r, { t: T0 + 3.6 * H, hpa: 1008 }).kind, 'none', 'over 3.5 hours');
  assert.equal(R.trendText({ kind: 'none' }, 'hPa'), 'Trend shows after an hour of readings');
  const two = R.trendAt(r, { t: T0 + 2 * H, hpa: 1008 });
  assert.equal(R.trendText(two, 'hPa'), 'Falling, 2 hPa in 2 hours');
  const one = R.trendAt(r, { t: T0 + 70 * MIN, hpa: 1008.5 });
  assert.equal(R.trendText(one, 'hPa'), 'Falling, 1.5 hPa in 70 minutes');
  // Closest to three hours wins over an older or newer one.
  const pick = R.trendAt(
    [
      { t: T0, hpa: 1000, source: 'open' },
      { t: T0 + 30 * MIN, hpa: 1005, source: 'open' },
      { t: T0 + 2 * H, hpa: 1009, source: 'open' },
    ],
    { t: T0 + 3.5 * H, hpa: 1006 }
  );
  assert.equal(pick.fromT, T0 + 30 * MIN);
  assert.equal(R.spanWords(3 * H + 10 * MIN), '3 hours');
  assert.equal(R.spanWords(H + 31 * MIN), '2 hours');
});

// ---------- the chart: gaps ----------

test('chart gaps: readings five minutes apart join; an hour apart is a gap; before the first and after the last too', () => {
  const morning = series(T0, 5 * MIN, [1012, 1012.1, 1012.2, 1012.1]);
  const later = series(T0 + 3 * H, 5 * MIN, [1011, 1010.9]);
  const d = C.chartData([...morning, ...later], T0 - 2 * H, T0 + 6 * H);
  assert.equal(d.segments.length, 2);
  assert.equal(d.segments[0].length, 4);
  assert.equal(d.segments[1].length, 2);
  assert.deepEqual(d.gaps, [
    { from: T0 - 2 * H, to: T0 },
    { from: morning[3].t, to: later[0].t },
    { from: later[1].t, to: T0 + 6 * H },
  ]);
  assert.equal(C.hasGaps(d), true);
  assert.equal(C.GAP_TEXT, 'No readings while the app was closed.');
});

test('chart gaps: the join limit is 45 minutes, or 1/120 of the range when longer', () => {
  assert.equal(C.joinGapMs(3 * H), 45 * MIN);
  assert.equal(C.joinGapMs(D), 45 * MIN);
  assert.equal(C.joinGapMs(7 * D), 84 * MIN);
  assert.equal(C.joinGapMs(30 * D), 6 * H);
  const pair = (gap) => [{ t: T0, hpa: 1010, source: 'open' }, { t: T0 + gap, hpa: 1010, source: 'background' }];
  assert.equal(C.chartData(pair(45 * MIN), T0, T0 + 45 * MIN).segments.length, 1, 'exactly the limit joins');
  assert.equal(C.chartData(pair(46 * MIN), T0, T0 + 46 * MIN).segments.length, 2, 'just over is a gap');
  // Background readings three hours apart: dots at 24 hours, joined at 30 days.
  const bg = series(T0, 3 * H, [1010, 1011, 1012], 'background');
  assert.equal(C.chartData(bg, T0, T0 + 6 * H).segments.length, 3);
  assert.equal(C.chartData(bg, T0 + 6 * H - 30 * D, T0 + 6 * H).segments.length, 1);
});

test('chart gaps: nothing in range is one gap; the thinned line never bridges a gap', () => {
  assert.deepEqual(C.chartData([], T0, T0 + H).gaps, [{ from: T0, to: T0 + H }]);
  const a = series(T0, MIN, Array.from({ length: 120 }, (_, i) => 1000 + i / 100));
  const b = series(T0 + 5 * H, MIN, Array.from({ length: 120 }, () => 1003));
  const d = C.chartData([...a, ...b], T0, T0 + 8 * H);
  const runs = C.thin(d, 40);
  assert.equal(runs.length, 2);
  assert.ok(runs[0].every((r) => r.t <= a[a.length - 1].t) && runs[1].every((r) => r.t >= b[0].t));
  assert.ok(runs[0].length < a.length);
});

test('chart scale: at least 6 hPa tall, round ticks, in the person\'s unit', () => {
  const s = C.pressureScale([1012.1, 1012.4]);
  assert.ok(s.max - s.min >= 6);
  assert.ok(s.ticks.every((t) => Number.isInteger(t)));
  assert.ok(s.min <= 1012.1 && s.max >= 1012.4);
  const w = C.pressureScale([990, 1025]);
  assert.ok(w.min <= 990 && w.max >= 1025 && w.ticks.length >= 4 && w.ticks.length <= 8);
  const inhg = C.pressureScale([1012.1, 1013.2], 'inHg');
  assert.ok(inhg.min <= 29.89 && inhg.max >= 29.92 && inhg.decimals >= 1);
  const sm = C.summary(series(T0, H, [1010, 1007, 1012, 1009]));
  assert.equal(sm.low.hpa, 1007);
  assert.equal(sm.high.hpa, 1012);
  assert.equal(sm.change, -1);
  assert.equal(C.summary([]), null);
});

test('chart time ticks: hours for 3 and 24 hours, days for 7, weeks for 30, all inside the range', () => {
  const to = T0;
  for (const [id, ms, min, max] of [['3h', 3 * H, 3, 4], ['24h', D, 4, 5], ['7d', 7 * D, 7, 8], ['30d', 30 * D, 4, 5]]) {
    const t = C.timeTicks(to - ms, to, id);
    assert.ok(t.length >= min && t.length <= max, `${id}: ${t.length}`);
    assert.ok(t.every((x) => x >= to - ms && x <= to));
  }
});

// ---------- the alert ----------

const fall = (amount, steps = 36, start = T0, from = 1015) => series(start, 5 * MIN, Array.from({ length: steps + 1 }, (_, i) => from - (amount * i) / steps));

test('alert: fires when readings fall at least the chosen amount within three hours; the text', () => {
  const rs = fall(4);
  const hit = AL.checkAlert(rs, 4, AL.NO_ALERT_YET);
  assert.ok(hit);
  assert.equal(hit.dir, 'fall');
  near(hit.amount, 4, 1e-9);
  assert.equal(AL.alertText(hit, 'hPa'), 'Pressure fell 4 hPa in the last 3 hours.');
  assert.equal(AL.alertText(hit, 'inHg'), 'Pressure fell 0.12 inHg in the last 3 hours.');
  assert.equal(AL.checkAlert(fall(3.9), 4, AL.NO_ALERT_YET), null, 'just under');
  const up = AL.checkAlert(series(T0, 30 * MIN, [1000, 1001, 1002, 1003.5]), 3, AL.NO_ALERT_YET);
  assert.equal(up.dir, 'rise');
  assert.equal(AL.alertText(up, 'hPa'), 'Pressure rose 3.5 hPa in the last 3 hours.');
});

test('alert: only the last three hours count', () => {
  const rs = [{ t: T0, hpa: 1015, source: 'open' }, { t: T0 + 3 * H + MIN, hpa: 1010, source: 'background' }];
  assert.equal(AL.checkAlert(rs, 3, AL.NO_ALERT_YET), null);
  rs[1].t = T0 + 3 * H;
  assert.ok(AL.checkAlert(rs, 3, AL.NO_ALERT_YET));
});

test('alert: one change fires once, not again as more readings of the same fall arrive', () => {
  let state = AL.NO_ALERT_YET;
  const rs = fall(6, 36);
  let fired = 0;
  // Feed the readings one at a time, as they are stored.
  for (let i = 2; i <= rs.length; i++) {
    const hit = AL.checkAlert(rs.slice(0, i), 3, state);
    if (hit) {
      fired++;
      state = AL.afterAlert(hit);
    }
  }
  // 6 hPa over three hours at a 3 hPa threshold: once at 3 hPa, once more only after a further 3 hPa from that point.
  assert.equal(fired, 2);
  // The same readings checked again do not fire.
  assert.equal(AL.checkAlert(rs, 3, state), null);
});

test('alert: after a fall alert, a rise counts on its own; a huge change (stairs, a lift, a plane) never alerts', () => {
  const down = fall(4);
  const hit = AL.checkAlert(down, 3, AL.NO_ALERT_YET);
  const state = AL.afterAlert(hit);
  const last = down[down.length - 1];
  const back = [...down, ...series(last.t + 5 * MIN, 5 * MIN, [last.hpa + 1, last.hpa + 2, last.hpa + 3.2])];
  const rise = AL.checkAlert(back, 3, state);
  assert.equal(rise?.dir, 'rise');
  const lift = series(T0, 5 * MIN, [1013, 1013, 990]);
  assert.equal(AL.checkAlert(lift, 3, AL.NO_ALERT_YET), null);
  assert.equal(AL.ALERT_IGNORE_ABOVE_HPA, 15);
  assert.deepEqual(AL.ALERT_STEPS_HPA, [2, 3, 4, 5, 6]);
  assert.equal(AL.checkAlert([down[0]], 3, AL.NO_ALERT_YET), null, 'one reading is not a change');
});

test('alert: the setting says plainly that it depends on iOS and can be late', () => {
  assert.match(AL.ALERT_TIMING_TEXT, /iOS decides when/);
  assert.match(AL.ALERT_TIMING_TEXT, /late/);
  assert.match(AL.ALERT_TIMING_SHORT, /can be late/);
});

// ---------- notes ----------

test('notes: labels cleaned, presets in order, pressure and trend at the moment', () => {
  assert.deepEqual(N.PRESET_LABELS, ['Headache', 'Joint pain', 'Fishing', 'Hike']);
  assert.equal(N.cleanLabel('  Sore\n knee  '), 'Sore knee');
  assert.equal(N.cleanLabel('x'.repeat(60)).length, 40);
  const rs = fall(3.1);
  const at = rs[rs.length - 1];
  const snap = N.snapshotAt(rs, at.t + MIN);
  assert.equal(snap.hpa, at.hpa);
  assert.equal(snap.trend.direction, 'falling');
  const live = N.snapshotAt(rs, at.t + 10 * MIN, { t: at.t + 10 * MIN, hpa: 1009 });
  assert.equal(live.hpa, 1009);
  assert.equal(N.snapshotAt([], T0).hpa, null);
  const sorted = N.sortNotes([{ id: 'a', t: 1, createdAt: 1 }, { id: 'b', t: 3, createdAt: 1 }, { id: 'c', t: 2, createdAt: 1 }]);
  assert.deepEqual(sorted.map((n) => n.id), ['b', 'c', 'a']);
});

// ---------- CSV ----------

test('CSV: readings and notes in time order, hPa and the chosen unit, quoting, CRLF', () => {
  const rs = [
    { t: new Date(2026, 10, 27, 9, 0).getTime(), hpa: 1013.25, source: 'open' },
    { t: new Date(2026, 10, 27, 12, 5).getTime(), hpa: 1009.04, source: 'background' },
  ];
  const notes = [{ id: 'n', t: new Date(2026, 10, 27, 10, 30).getTime(), label: 'Hike, "north" trail', hpa: 1011.5, changeHpa: -1.2, createdAt: 0 }];
  const csv = CSV.readingsCsv(rs, notes, 'inHg');
  const lines = csv.split('\r\n');
  assert.equal(lines[0], 'Time,Kind,Pressure (hPa),Pressure (inHg),How,Label');
  assert.equal(lines[1], '2026-11-27 09:00,Reading,1013.25,29.921,App open,');
  assert.equal(lines[2], '2026-11-27 10:30,Note,1011.50,29.870,,"Hike, ""north"" trail"');
  assert.equal(lines[3], '2026-11-27 12:05,Reading,1009.04,29.797,Background,');
  assert.equal(lines[4], '');
  assert.ok(csv.endsWith('\r\n'));
  const hpaOnly = CSV.readingsCsv(rs, [], 'hPa').split('\r\n');
  assert.equal(hpaOnly[0], 'Time,Kind,Pressure (hPa),How,Label');
  assert.equal(CSV.csvField('=SUM(A1)'), "'=SUM(A1)");
  assert.equal(CSV.csvField('-3.2'), '-3.2');
  assert.equal(CSV.csvFileName('2026-11-27'), 'Barometer readings 2026-11-27.csv');
});

// ---------- free versus Pro ----------

test('gates: free is the live gauge, the altimeter, every unit and the last 24 hours; 7 and 30 days are Pro', () => {
  assert.equal(G.rangeAllowed(false, '3h'), true);
  assert.equal(G.rangeAllowed(false, '24h'), true);
  assert.equal(G.rangeAllowed(false, '7d'), false);
  assert.equal(G.rangeAllowed(false, '30d'), false);
  assert.equal(G.rangeAllowed(true, '30d'), true);
  assert.equal(G.historyStart(false, T0), T0 - D);
  assert.equal(G.historyStart(true, T0), -Infinity);
});

test('gates: alerts, export, a typed elevation and dial styles are Pro; the first note is free, the second asks', () => {
  assert.equal(G.canAlert(false), false);
  assert.equal(G.canAlert(true), true);
  assert.equal(G.canExport(false), false);
  assert.equal(G.canExport(true), true);
  assert.equal(G.canTypeElevation(false), false);
  assert.equal(G.canAddNote(false, 0), true);
  assert.equal(G.canAddNote(false, 1), false);
  assert.equal(G.canAddNote(true, 40), true);
  assert.equal(G.dialAllowed(false, 'classic'), true);
  assert.equal(G.dialAllowed(false, 'marine'), false);
  assert.equal(G.shownDial(false, 'marine'), 'classic', 'a Pro style falls back without losing the choice');
  assert.equal(G.shownDial(true, 'marine'), 'marine');
  assert.equal(G.alertActive(false, true), false, 'the alert pauses when Pro ends');
  assert.equal(G.alertActive(true, true), true);
  const typed = { source: 'typed' };
  const located = { source: 'location' };
  assert.equal(G.elevationInUse(false, typed, located), located);
  assert.equal(G.elevationInUse(true, typed, located), typed);
  assert.equal(G.elevationInUse(true, null, located), located);
});

// ---------- settings ----------

test('settings: defaults by region; a damaged or old value falls back field by field', () => {
  const us = P.defaultPrefs('US');
  assert.equal(us.pressureUnit, 'inHg');
  assert.equal(us.elevationUnit, 'ft');
  assert.equal(us.alertOn, false);
  assert.equal(us.alertHpa, 3);
  assert.deepEqual(P.parsePrefs('not json', 'FR'), P.defaultPrefs('FR'));
  const p = P.parsePrefs(JSON.stringify({ pressureUnit: 'mmHg', alertHpa: 9, dial: 'neon', typed: { source: 'typed', meters: 120 }, located: { source: 'location', meters: 99999 } }), 'GB');
  assert.equal(p.pressureUnit, 'mmHg');
  assert.equal(p.alertHpa, 3);
  assert.equal(p.dial, 'classic');
  assert.equal(p.typed.meters, 120);
  assert.equal(p.located.source, 'none');
});

// ---------- rating ----------

test('rating: a later-day launch once a full day of history exists, or the first export; one per launch', () => {
  const now = new Date(2026, 10, 28, 9).getTime();
  assert.equal(RU.fullDayLaunch('2026-11-27', '2026-11-28', now - D - MIN, now), true);
  assert.equal(RU.fullDayLaunch('2026-11-27', '2026-11-28', now - 20 * H, now), false, 'under a day of readings');
  assert.equal(RU.fullDayLaunch('2026-11-28', '2026-11-28', now - 3 * D, now), false, 'install day');
  assert.equal(RU.fullDayLaunch(null, '2026-11-28', now - 3 * D, now), false);
  assert.equal(RU.fullDayLaunch('2026-11-27', '2026-11-28', null, now), false);
  assert.equal(RU.shouldAsk({ askedThisLaunch: false, triggerUsed: false, storeCanAsk: true }), true);
  assert.equal(RU.shouldAsk({ askedThisLaunch: true, triggerUsed: false, storeCanAsk: true }), false);
  assert.equal(RU.shouldAsk({ askedThisLaunch: false, triggerUsed: true, storeCanAsk: true }), false);
  assert.equal(RU.shouldAsk({ askedThisLaunch: false, triggerUsed: false, storeCanAsk: false }), false);
  assert.equal(RU.afterOnboardingPaywall(false), 'claim');
  assert.equal(RU.afterOnboardingPaywall(true), 'app');
});

// ---------- the dial ----------

const DI = await import('../src/dial.ts');

test('dial: a wall barometer span in each unit; the hand at the right angle; the scale slides up a mountain', () => {
  const s = DI.dialScale('hPa', 1013.25);
  assert.deepEqual([s.min, s.max], [950, 1050]);
  assert.equal(DI.angleFor(s, 1000), 0);
  assert.equal(DI.angleFor(s, 950), -135);
  assert.equal(DI.angleFor(s, 1100), 135, 'held at the end');
  const ticks = DI.dialTicks(s);
  assert.equal(ticks.length, 51);
  assert.equal(ticks.filter((t) => t.major).length, 11);
  const inhg = DI.dialScale('inHg', 1013.25);
  assert.deepEqual([inhg.min, inhg.max], [28, 31]);
  assert.equal(DI.dialTicks(inhg).filter((t) => t.major).length, 7);
  for (const u of U.PRESSURE_UNITS) {
    const sc = DI.dialScale(u, 1013.25);
    const v = U.fromHpa(1013.25, u);
    assert.ok(v >= sc.min && v <= sc.max, u);
  }
  const high = DI.dialScale('hPa', 812);
  assert.ok(high.min <= 812 && high.max >= 812 && high.max - high.min === 100 && high.min % 10 === 0);
  const highIn = DI.dialScale('inHg', 812);
  const v = U.fromHpa(812, 'inHg');
  assert.ok(highIn.min <= v && highIn.max >= v);
});
