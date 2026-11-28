// The database on Node's SQLite (the same migrations and SQL the app runs
// on expo-sqlite) and the one-page PDF chart, written by pdf-lib and read
// back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { PDFDocument } from 'pdf-lib';

const S = await import('../src/db/schema.ts');
const repo = await import('../src/db/repo.ts');
const L = await import('../src/pdf/layout.ts');
const F = await import('../src/pdf/fonts.ts');
const W = await import('../src/pdf/pdf.ts');

const ROOT = new URL('..', import.meta.url).pathname;
const H = 3_600_000;
const T0 = new Date(2026, 10, 27, 9, 0).getTime();

function nodeDb(file = ':memory:') {
  const sq = new DatabaseSync(file);
  return {
    sq,
    exec: async (sql) => sq.exec(sql),
    run: async (sql, params = []) => {
      sq.prepare(sql).run(...params);
    },
    all: async (sql, params = []) => sq.prepare(sql).all(...params),
    get: async (sql, params = []) => sq.prepare(sql).get(...params) ?? null,
    tx: async (fn) => {
      sq.exec('BEGIN');
      try {
        await fn();
        sq.exec('COMMIT');
      } catch (e) {
        sq.exec('ROLLBACK');
        throw e;
      }
    },
  };
}

test('database: one migration, readings stored once per moment, bad samples dropped, read back in order', async () => {
  const db = nodeDb();
  assert.equal(await S.migrate(db), 1);
  assert.equal(S.MIGRATIONS.length, 1);
  const added = await repo.addReadings(db, [
    { t: T0 + H, hpa: 1012.5, source: 'background' },
    { t: T0, hpa: 1013.1, source: 'open' },
    { t: T0, hpa: 1013.9, source: 'open' },
    { t: T0 + 2 * H, hpa: 0, source: 'open' },
  ]);
  assert.equal(added, 2);
  assert.equal(await repo.addReadings(db, [{ t: T0 + H, hpa: 1012.5, source: 'background' }]), 0, 'a background reading handed over twice is stored once');
  const rs = await repo.readingsSince(db, -Infinity);
  assert.deepEqual(rs, [
    { t: T0, hpa: 1013.1, source: 'open' },
    { t: T0 + H, hpa: 1012.5, source: 'background' },
  ]);
  assert.equal((await repo.readingsSince(db, T0 + 1)).length, 1);
  assert.equal(await repo.oldestReadingT(db), T0);
  assert.equal((await repo.latestReading(db)).t, T0 + H);
  assert.equal(await repo.countReadings(db), 2);
});

test('database: notes saved, updated and removed; a note without a label is refused; settings in kv survive a reopen', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'baro-'));
  const file = join(dir, 'b.db');
  const db = nodeDb(file);
  await S.migrate(db);
  await repo.saveNote(db, { id: 'a', t: T0, label: '  Joint   pain ', hpa: 1009.2, changeHpa: -2.4, createdAt: T0 });
  await repo.saveNote(db, { id: 'b', t: T0 + H, label: 'Fishing', hpa: null, changeHpa: null, createdAt: T0 + H });
  await repo.saveNote(db, { id: 'a', t: T0, label: 'Joint pain, left knee', hpa: 1009.2, changeHpa: -2.4, createdAt: T0 });
  await assert.rejects(repo.saveNote(db, { id: 'c', t: T0, label: '   ', hpa: null, changeHpa: null, createdAt: T0 }));
  await repo.kvSet(db, 'prefs', '{"pressureUnit":"mmHg"}');
  db.sq.close();
  const again = nodeDb(file);
  assert.equal(await S.migrate(again), 1, 'no migration runs twice');
  const notes = await repo.listNotes(again);
  assert.deepEqual(notes.map((n) => [n.id, n.label, n.changeHpa]), [['b', 'Fishing', null], ['a', 'Joint pain, left knee', -2.4]]);
  await repo.removeNote(again, 'b');
  assert.equal((await repo.listNotes(again)).length, 1);
  assert.equal(await repo.kvGet(again, 'prefs'), '{"pressureUnit":"mmHg"}');
});

function fontBytes() {
  const out = {};
  for (const [k, f] of Object.entries(F.FONT_FILES)) out[k] = new Uint8Array(readFileSync(`${ROOT}assets/fonts/${f}`));
  return out;
}

test('PDF chart: one page, Letter or A4, gaps left empty, notes numbered, a real PDF that reads back', async () => {
  const bytes = fontBytes();
  const m = F.makeMeasure(bytes);
  const to = T0 + 24 * H;
  const readings = [];
  for (let t = T0; t < T0 + 8 * H; t += 5 * 60_000) readings.push({ t, hpa: 1016 - ((t - T0) / H) * 0.6, source: 'open' });
  for (let t = T0 + 14 * H; t <= to; t += 3 * H) readings.push({ t, hpa: 1009 + Math.sin(t) * 0.3, source: 'background' });
  const notes = [
    { id: 'n1', t: T0 + 2 * H, label: 'Headache', hpa: 1014.8, changeHpa: -1.2, createdAt: 0 },
    { id: 'n2', t: T0 + 15 * H, label: 'Fishing at the north pier with a very long label that will not fit', hpa: 1009.1, changeHpa: null, createdAt: 0 },
  ];
  for (const paper of ['letter', 'a4']) {
    const page = L.layoutPage(m, { readings, notes, range: '24h', from: T0, to, unit: 'inHg', paper, locale: 'en-US' });
    assert.equal(page.width, L.PAPER_SIZE[paper].width);
    const texts = page.ops.filter((o) => o.k === 'text').map((o) => o.text);
    assert.ok(texts.includes('Air pressure, last 24 hours'));
    assert.ok(texts.includes('No readings while the app was closed.'));
    assert.ok(texts.some((t) => t.startsWith('Headache')));
    assert.ok(texts.some((t) => t.endsWith('...')), 'a long label is cut to fit');
    assert.ok(page.ops.filter((o) => o.k === 'rect' && o.fill === L.PAGE_GAP).length >= 2, 'the gap is marked');
    for (const o of page.ops) {
      if (o.k === 'text') assert.ok(o.x >= 0 && o.x + m.width(o.text, o.font, o.size) <= page.width + 0.5, `text inside the page: ${o.text}`);
    }
    // No line crosses the gap between the morning readings and the first background one.
    const X = (t) => 88 + ((t - T0) / (to - T0)) * (page.width - 44 - 88);
    const lastMorning = readings.filter((r) => r.t < T0 + 8 * H).at(-1).t;
    const lines = page.ops.filter((o) => o.k === 'line' && o.color === L.PAGE_LINE);
    assert.ok(lines.length > 10);
    assert.ok(!lines.some((l) => Math.min(l.x1, l.x2) < X(lastMorning) + 1 && Math.max(l.x1, l.x2) > X(T0 + 14 * H) - 1), 'no line drawn over the gap');
    const pdf = await W.writePdf([page], bytes, { title: 'Air pressure', subject: 'Barometer readings' });
    const back = await PDFDocument.load(pdf);
    assert.equal(back.getPageCount(), 1);
    assert.equal(back.getTitle(), 'Air pressure');
  }
  assert.equal(L.paperForRegion('US'), 'letter');
  assert.equal(L.paperForRegion('DE'), 'a4');
});

test('PDF chart: says nothing a forecast or a doctor would; an empty range still makes a page', () => {
  const m = F.makeMeasure(fontBytes());
  const page = L.layoutPage(m, { readings: [], notes: [], range: '7d', from: T0 - 7 * 24 * H, to: T0, unit: 'hPa', paper: 'letter', locale: 'en-US' });
  const all = page.ops.filter((o) => o.k === 'text').map((o) => o.text).join(' ');
  assert.match(all, /None in this range/);
  assert.match(all, /No notes in this range/);
  assert.doesNotMatch(all, /forecast|predict|storm|warning|migraine|treat|prevent|diagnos/i);
});
