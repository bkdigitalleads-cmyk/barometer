/**
 * The app's side of background readings and the change alert:
 *  - at launch and on every return to the app, readings the Swift module
 *    took in the background are moved into the database
 *  - when the app goes to the background, its own recent readings go to
 *    the module, so the background alert check sees the same three hours
 *  - the alert settings go to the module whenever they change
 *  - while the app is open, each stored reading is checked here, with the
 *    same rule (src/alerts.ts) and the same shared state, so one change
 *    alerts once whichever side sees it first
 */
import * as Notifications from 'expo-notifications';
import * as Baro from '../modules/baro-background';
import type { Db } from './db/schema';
import * as repo from './db/repo';
import { afterAlert, ALERT_TITLE, ALERT_WINDOW_MS, alertText, checkAlert, type AlertDirection, type AlertState } from './alerts';
import { HOUR } from './readings';
import { CHANGE_DECIMALS, HPA_PER, type PressureUnit } from './units';

const STATE_KEY = 'alert.state';

const RETRY_KEY = 'background.retry';

/**
 * Moves readings taken in the background into the database. The module
 * hands each over once, so they are parked in the kv table first and
 * cleared only after they are stored. Returns how many were new.
 */
export async function importPending(db: Db): Promise<number> {
  let parked: number[][] = [];
  try {
    parked = JSON.parse((await repo.kvGet(db, RETRY_KEY)) ?? '[]');
  } catch {
    parked = [];
  }
  const fresh = Baro.takePending();
  const all = [...(Array.isArray(parked) ? parked : []), ...fresh].filter((p) => Array.isArray(p) && p.length === 2);
  if (all.length === 0) return 0;
  if (fresh.length > 0) await repo.kvSet(db, RETRY_KEY, JSON.stringify(all));
  const added = await repo.addReadings(db, all.map(([t, hpa]) => ({ t, hpa, source: 'background' as const })));
  await repo.kvDelete(db, RETRY_KEY);
  return added;
}

/** Sends the last four hours of readings to the module and asks iOS for the next background run. */
export async function handOver(db: Db, now: number): Promise<void> {
  const recent = await repo.readingsSince(db, now - 4 * HOUR);
  Baro.pushRecent(recent.map((r) => [r.t, r.hpa]));
  Baro.schedule();
}

export function configureAlert(active: boolean, thresholdHpa: number, unit: PressureUnit): void {
  Baro.configureAlert(active, thresholdHpa, unit, HPA_PER[unit], CHANGE_DECIMALS[unit]);
}

async function readState(db: Db): Promise<AlertState> {
  const native = Baro.alertState();
  if (native) return { lastAt: native.lastAt ?? null, lastDir: native.lastDir === 'rise' || native.lastDir === 'fall' ? native.lastDir : null };
  try {
    const v = JSON.parse((await repo.kvGet(db, STATE_KEY)) ?? 'null');
    return { lastAt: typeof v?.lastAt === 'number' ? v.lastAt : null, lastDir: v?.lastDir === 'rise' || v?.lastDir === 'fall' ? (v.lastDir as AlertDirection) : null };
  } catch {
    return { lastAt: null, lastDir: null };
  }
}

async function writeState(db: Db, s: AlertState): Promise<void> {
  if (Baro.isAvailable()) Baro.setAlertState(s.lastAt, s.lastDir);
  await repo.kvSet(db, STATE_KEY, JSON.stringify(s));
}

/**
 * After a reading is stored while the app is open: the alert check. When
 * it fires, a local notification (shown as a banner while the app is
 * open); returns the text only when notifications are off, so the app can
 * show it on screen instead.
 */
export async function checkAfterStore(db: Db, opts: { active: boolean; thresholdHpa: number; unit: PressureUnit; locale: string; now: number }): Promise<string | null> {
  if (!opts.active) return null;
  const readings = await repo.readingsSince(db, opts.now - ALERT_WINDOW_MS - HOUR);
  const hit = checkAlert(readings, opts.thresholdHpa, await readState(db));
  if (!hit) return null;
  await writeState(db, afterAlert(hit));
  const body = alertText(hit, opts.unit, opts.locale);
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return body;
    await Notifications.scheduleNotificationAsync({ identifier: `barometer.alert.${Math.round(hit.at)}`, content: { title: ALERT_TITLE, body }, trigger: null });
    return null;
  } catch {
    return body;
  }
}

export const refreshStatus = Baro.refreshStatus;
export const lastBackgroundRun = Baro.lastRun;
export const recordNow = Baro.recordNow;
export const isTestBuildNative = Baro.isTestBuild;
