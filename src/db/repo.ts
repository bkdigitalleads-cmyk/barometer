/**
 * Reading and writing the database through the Db interface. No native
 * imports: the app passes expo-sqlite, the tests pass node:sqlite, and the
 * same SQL runs on both.
 */
import type { Db } from './schema.ts';
import type { Reading, ReadingSource } from '../readings.ts';
import type { Note } from '../notes.ts';
import { cleanLabel } from '../notes.ts';
import { isPlausiblePressure } from '../atmosphere.ts';

// ---------- key/value ----------

export async function kvGet(db: Db, key: string): Promise<string | null> {
  const r = await db.get<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key]);
  return r ? r.value : null;
}

export async function kvSet(db: Db, key: string, value: string): Promise<void> {
  await db.run('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
}

export async function kvDelete(db: Db, key: string): Promise<void> {
  await db.run('DELETE FROM kv WHERE key = ?', [key]);
}

// ---------- readings ----------

function source(s: unknown): ReadingSource {
  return s === 'background' ? 'background' : 'open';
}

/** Stores readings; one per millisecond, so a reading delivered twice is stored once. Bad samples are dropped. Returns how many were new. */
export async function addReadings(db: Db, list: Reading[]): Promise<number> {
  let added = 0;
  const good = list.filter((r) => Number.isFinite(r.t) && isPlausiblePressure(r.hpa));
  if (good.length === 0) return 0;
  await db.tx(async () => {
    for (const r of good) {
      const before = await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM readings WHERE t = ?', [Math.round(r.t)]);
      if (Number(before?.n ?? 0) > 0) continue;
      await db.run('INSERT INTO readings (t, hpa, source) VALUES (?, ?, ?)', [Math.round(r.t), r.hpa, source(r.source)]);
      added++;
    }
  });
  return added;
}

/** Readings from `from` on (ms), in time order. */
export async function readingsSince(db: Db, from: number): Promise<Reading[]> {
  const lo = Number.isFinite(from) ? Math.floor(from) : -1;
  const rows = await db.all<{ t: number; hpa: number; source: string }>('SELECT t, hpa, source FROM readings WHERE t >= ? ORDER BY t', [lo]);
  return rows.map((r) => ({ t: Number(r.t), hpa: Number(r.hpa), source: source(r.source) }));
}

export async function oldestReadingT(db: Db): Promise<number | null> {
  const r = await db.get<{ t: number | null }>('SELECT MIN(t) AS t FROM readings');
  return r?.t == null ? null : Number(r.t);
}

export async function latestReading(db: Db): Promise<Reading | null> {
  const r = await db.get<{ t: number; hpa: number; source: string }>('SELECT t, hpa, source FROM readings ORDER BY t DESC LIMIT 1');
  return r ? { t: Number(r.t), hpa: Number(r.hpa), source: source(r.source) } : null;
}

export async function countReadings(db: Db): Promise<number> {
  const r = await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM readings');
  return Number(r?.n ?? 0);
}

/** Test builds only: removes every reading (the sample history is added again on demand). */
export async function clearReadings(db: Db): Promise<void> {
  await db.run('DELETE FROM readings');
}

// ---------- notes ----------

interface NoteRow {
  id: string;
  t: number;
  label: string;
  hpa: number | null;
  change_hpa: number | null;
  created_at: number;
}

function toNote(r: NoteRow): Note {
  return {
    id: r.id,
    t: Number(r.t),
    label: r.label,
    hpa: r.hpa == null ? null : Number(r.hpa),
    changeHpa: r.change_hpa == null ? null : Number(r.change_hpa),
    createdAt: Number(r.created_at),
  };
}

export async function listNotes(db: Db): Promise<Note[]> {
  const rows = await db.all<NoteRow>('SELECT * FROM notes ORDER BY t DESC, created_at DESC');
  return rows.map(toNote);
}

export async function saveNote(db: Db, n: Note): Promise<Note> {
  const label = cleanLabel(n.label);
  if (!label) throw new Error('A note needs a label.');
  const row = { ...n, label };
  await db.run(
    `INSERT INTO notes (id, t, label, hpa, change_hpa, created_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET t = excluded.t, label = excluded.label, hpa = excluded.hpa, change_hpa = excluded.change_hpa`,
    [row.id, Math.round(row.t), row.label, row.hpa, row.changeHpa, row.createdAt]
  );
  return row;
}

export async function removeNote(db: Db, id: string): Promise<void> {
  await db.run('DELETE FROM notes WHERE id = ?', [id]);
}
