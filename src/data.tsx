/**
 * Everything the screens read and write: the live reading from the
 * pressure sensor, the stored readings, the notes and the settings, over
 * the SQLite database. Screens call these actions; nothing else touches
 * the database.
 *
 * While the app is open and the sensor is on, one reading is stored every
 * five minutes (the median of the last half minute of samples) and
 * checked for the change alert. Readings the Swift module took in the
 * background are moved in at launch and on every return to the app.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Barometer } from 'expo-sensors';
import { getDb } from './db/native';
import * as repo from './db/repo';
import type { Reading } from './readings';
import { DAY, median, SAMPLE_WINDOW_MS, shouldStore } from './readings';
import type { Note } from './notes';
import { cleanLabel, newId, snapshotAt } from './notes';
import type { ElevationFix } from './atmosphere';
import { isPlausiblePressure } from './atmosphere';
import { defaultPrefs, parsePrefs, PREFS_KEY, type Prefs } from './prefs';
import { alertActive } from './gates';
import { checkAfterStore, configureAlert, handOver, importPending } from './background';
import { phoneLocale, type PhoneLocale } from './locale';
import { dayKey } from './rules';
import { sampleNotes, sampleReadings } from './sample';

const K = {
  installDay: 'install.day',
  resetPoint: 'alt.reset',
};

/** How much history is kept in memory for the charts (the database keeps everything). */
const LOADED_MS = 31 * DAY;

export type SensorState = 'checking' | 'on' | 'missing' | 'silent';

export interface ResetPoint {
  hpa: number;
  t: number;
}

interface Data {
  loaded: boolean;
  failed: string | null;
  locale: PhoneLocale;
  installDay: string | null;
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  /** The sensor: checking, on, missing (no sensor in this phone) or silent (no samples: motion access off). */
  sensor: SensorState;
  /** Starts the sensor (after the first onboarding screen, or at launch for a returning person). */
  startSensor: () => void;
  live: { t: number; hpa: number } | null;
  readings: Reading[];
  oldestT: number | null;
  notes: Note[];
  addNote: (label: string, t: number) => Promise<Note>;
  removeNote: (id: string) => Promise<void>;
  resetPoint: ResetPoint | null;
  resetClimb: () => void;
  setLocated: (fix: ElevationFix) => void;
  setTyped: (fix: ElevationFix | null) => void;
  /** Test builds: a made-up week, or clear the readings. */
  addSample: () => Promise<void>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<Data | null>(null);

export function DataProvider({ children, isPro, onAlert }: { children: React.ReactNode; isPro: boolean; onAlert: (text: string) => void }) {
  const locale = useMemo(phoneLocale, []);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [installDay, setInstallDay] = useState<string | null>(null);
  const [prefs, setPrefsState] = useState<Prefs>(() => defaultPrefs(locale.region));
  const [readings, setReadings] = useState<Reading[]>([]);
  const [oldestT, setOldestT] = useState<number | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [resetPoint, setResetPoint] = useState<ResetPoint | null>(null);
  const [sensor, setSensor] = useState<SensorState>('checking');
  const [started, setStarted] = useState(false);
  const [live, setLive] = useState<{ t: number; hpa: number } | null>(null);
  const [active, setActive] = useState(AppState.currentState !== 'background');

  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const proRef = useRef(isPro);
  proRef.current = isPro;
  const onAlertRef = useRef(onAlert);
  onAlertRef.current = onAlert;
  const samples = useRef<{ t: number; hpa: number }[]>([]);
  const lastStored = useRef<number | null>(null);
  const storing = useRef(false);

  const reload = useCallback(async () => {
    const db = await getDb();
    const now = Date.now();
    const [rs, ns, oldest] = await Promise.all([repo.readingsSince(db, now - LOADED_MS), repo.listNotes(db), repo.oldestReadingT(db)]);
    setReadings(rs);
    setNotes(ns);
    setOldestT(oldest);
    const last = rs[rs.length - 1];
    if (last && (lastStored.current == null || last.t > lastStored.current) && last.source === 'open') lastStored.current = last.t;
  }, []);

  // Open the database, read the settings, bring in background readings.
  useEffect(() => {
    (async () => {
      try {
        const db = await getDb();
        let day = await repo.kvGet(db, K.installDay);
        if (!day) {
          day = dayKey(Date.now());
          await repo.kvSet(db, K.installDay, day);
        }
        setInstallDay(day);
        setPrefsState(parsePrefs(await repo.kvGet(db, PREFS_KEY), locale.region));
        try {
          const rp = JSON.parse((await repo.kvGet(db, K.resetPoint)) ?? 'null');
          if (rp && isPlausiblePressure(Number(rp.hpa)) && Number.isFinite(Number(rp.t))) setResetPoint({ hpa: Number(rp.hpa), t: Number(rp.t) });
        } catch {
          // no reset point
        }
        await importPending(db).catch(() => 0);
        await reload();
        setLoaded(true);
      } catch (e: any) {
        setFailed(e?.message ?? 'The database did not open.');
        setLoaded(true);
      }
    })();
  }, [locale.region, reload]);

  // Coming back: bring in background readings. Leaving: hand the last hours to the background check.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      setActive(s === 'active');
      getDb()
        .then(async (db) => {
          if (s === 'active') {
            const n = await importPending(db).catch(() => 0);
            if (n > 0) await reload();
          } else if (s === 'background') {
            await handOver(db, Date.now());
          }
        })
        .catch(() => {});
    });
    return () => sub.remove();
  }, [reload]);

  // The alert settings for the background check.
  useEffect(() => {
    if (!loaded) return;
    configureAlert(alertActive(isPro, prefs.alertOn), prefs.alertHpa, prefs.pressureUnit);
  }, [loaded, isPro, prefs.alertOn, prefs.alertHpa, prefs.pressureUnit]);

  // Is there a sensor at all?
  useEffect(() => {
    let live = true;
    Barometer.isAvailableAsync()
      .then((ok) => live && setSensor((s) => (ok ? (s === 'checking' ? 'checking' : s) : 'missing')))
      .catch(() => live && setSensor('missing'));
    return () => {
      live = false;
    };
  }, []);

  const store = useCallback(
    async (now: number) => {
      if (storing.current) return;
      const recent = samples.current.filter((s) => now - s.t <= SAMPLE_WINDOW_MS).map((s) => s.hpa);
      const hpa = median(recent);
      if (hpa == null || !isPlausiblePressure(hpa)) return;
      storing.current = true;
      lastStored.current = now;
      try {
        const db = await getDb();
        await repo.addReadings(db, [{ t: now, hpa, source: 'open' }]);
        setReadings((rs) => [...rs.filter((r) => r.t >= now - LOADED_MS), { t: now, hpa, source: 'open' }]);
        setOldestT((o) => (o == null ? now : o));
        const p = prefsRef.current;
        const text = await checkAfterStore(db, { active: alertActive(proRef.current, p.alertOn), thresholdHpa: p.alertHpa, unit: p.pressureUnit, locale: locale.tag, now });
        if (text) onAlertRef.current(text);
      } catch {
        // the next reading tries again
      } finally {
        storing.current = false;
      }
    },
    [locale.tag]
  );

  // The live sensor, while the app is in front.
  useEffect(() => {
    if (!started || !active || sensor === 'missing') return;
    let gotOne = false;
    const firstAt = Date.now();
    const silentTimer = setTimeout(() => {
      if (!gotOne) setSensor('silent');
    }, 6000);
    const sub = Barometer.addListener((m) => {
      const hpa = Number(m.pressure);
      if (!isPlausiblePressure(hpa)) return;
      const now = Date.now();
      gotOne = true;
      setSensor('on');
      samples.current = [...samples.current.filter((s) => now - s.t <= SAMPLE_WINDOW_MS), { t: now, hpa }];
      setLive({ t: now, hpa });
      // Store once there are a few seconds of samples, then every five minutes.
      if (now - firstAt >= 4000 && shouldStore(lastStored.current, now)) store(now);
    });
    return () => {
      clearTimeout(silentTimer);
      sub.remove();
    };
  }, [started, active, sensor === 'missing', store]);

  const setPrefs = useCallback((p: Partial<Prefs>) => {
    setPrefsState((cur) => {
      const next = { ...cur, ...p };
      getDb()
        .then((db) => repo.kvSet(db, PREFS_KEY, JSON.stringify(next)))
        .catch(() => {});
      return next;
    });
  }, []);

  const addNote = useCallback(
    async (label: string, t: number) => {
      const clean = cleanLabel(label);
      const snap = snapshotAt(readings, t, live);
      const note: Note = {
        id: newId(),
        t,
        label: clean,
        hpa: snap.hpa,
        changeHpa: snap.trend.kind === 'trend' ? snap.trend.changeHpa : null,
        createdAt: Date.now(),
      };
      const db = await getDb();
      const saved = await repo.saveNote(db, note);
      setNotes((ns) => [saved, ...ns.filter((n) => n.id !== saved.id)].sort((a, b) => b.t - a.t));
      return saved;
    },
    [readings, live]
  );

  const removeNote = useCallback(async (id: string) => {
    const db = await getDb();
    await repo.removeNote(db, id);
    setNotes((ns) => ns.filter((n) => n.id !== id));
  }, []);

  const resetClimb = useCallback(() => {
    if (!live) return;
    const rp = { hpa: live.hpa, t: live.t };
    setResetPoint(rp);
    getDb()
      .then((db) => repo.kvSet(db, K.resetPoint, JSON.stringify(rp)))
      .catch(() => {});
  }, [live]);

  const setLocated = useCallback((fix: ElevationFix) => setPrefs({ located: fix }), [setPrefs]);
  const setTyped = useCallback((fix: ElevationFix | null) => setPrefs({ typed: fix }), [setPrefs]);

  const addSample = useCallback(async () => {
    const db = await getDb();
    const end = Date.now();
    await repo.addReadings(db, sampleReadings(end));
    for (const n of sampleNotes(end)) await repo.saveNote(db, { ...n, id: newId() });
    await reload();
  }, [reload]);

  const clearAll = useCallback(async () => {
    const db = await getDb();
    await repo.clearReadings(db);
    for (const n of await repo.listNotes(db)) await repo.removeNote(db, n.id);
    lastStored.current = null;
    await reload();
  }, [reload]);

  const value = useMemo<Data>(
    () => ({
      loaded,
      failed,
      locale,
      installDay,
      prefs,
      setPrefs,
      sensor,
      startSensor: () => setStarted(true),
      live,
      readings,
      oldestT,
      notes,
      addNote,
      removeNote,
      resetPoint,
      resetClimb,
      setLocated,
      setTyped,
      addSample,
      clearAll,
      refresh: reload,
    }),
    [loaded, failed, locale, installDay, prefs, setPrefs, sensor, live, readings, oldestT, notes, addNote, removeNote, resetPoint, resetClimb, setLocated, setTyped, addSample, clearAll, reload]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): Data {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
