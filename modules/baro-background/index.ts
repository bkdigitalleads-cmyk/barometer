// Barometer's background readings: a small Swift module (ios/) plus this
// thin wrapper. Optional, so the JS still loads where the native side is
// missing (the web renders, a build without the module); every call then
// does nothing and says so with its return value.
import { requireOptionalNativeModule } from 'expo';

interface NativeBaro {
  takePending(): number[][];
  pushRecent(list: number[][]): void;
  configureAlert(on: boolean, thresholdHpa: number, unit: string, hpaPerUnit: number, decimals: number): void;
  alertState(): { lastAt: number | null; lastDir: string | null };
  setAlertState(lastAt: number | null, lastDir: string | null): void;
  schedule(): void;
  refreshStatus(): Promise<string>;
  lastRun(): number | null;
  recordNow(): Promise<boolean>;
  isTestBuild(): boolean;
}

const Native = requireOptionalNativeModule<NativeBaro>('BaroBackground');

export function isAvailable(): boolean {
  return Native != null;
}

/** Readings taken in the background since the app last asked, as [ms, hPa]. Each is handed over once. */
export function takePending(): number[][] {
  try {
    return Native?.takePending() ?? [];
  } catch {
    return [];
  }
}

/** The app's own readings from the last hours, so the background alert check sees them. */
export function pushRecent(list: number[][]): void {
  try {
    Native?.pushRecent(list);
  } catch {
    // harmless: the next push carries them
  }
}

export function configureAlert(on: boolean, thresholdHpa: number, unit: string, hpaPerUnit: number, decimals: number): void {
  try {
    Native?.configureAlert(on, thresholdHpa, unit, hpaPerUnit, decimals);
  } catch {
    // the background check then keeps its last settings
  }
}

export function alertState(): { lastAt: number | null; lastDir: string | null } | null {
  try {
    return Native ? Native.alertState() : null;
  } catch {
    return null;
  }
}

export function setAlertState(lastAt: number | null, lastDir: string | null): void {
  try {
    Native?.setAlertState(lastAt, lastDir);
  } catch {
    // harmless
  }
}

export function schedule(): void {
  try {
    Native?.schedule();
  } catch {
    // iOS refused or the module is missing; the next launch asks again
  }
}

/** The Background App Refresh switch for this app: 'available', 'denied', 'restricted', or 'unknown'. */
export async function refreshStatus(): Promise<'available' | 'denied' | 'restricted' | 'unknown'> {
  try {
    const s = Native ? await Native.refreshStatus() : 'unknown';
    return s === 'available' || s === 'denied' || s === 'restricted' ? s : 'unknown';
  } catch {
    return 'unknown';
  }
}

/** When the last background reading was taken (ms), or null. */
export function lastRun(): number | null {
  try {
    return Native?.lastRun() ?? null;
  } catch {
    return null;
  }
}

/** Test menu: one reading through the background path, by hand. */
export async function recordNow(): Promise<boolean> {
  try {
    return Native ? await Native.recordNow() : false;
  } catch {
    return false;
  }
}

/** True in a TestFlight or development build (a sandbox receipt); false in the App Store build and wherever it cannot tell. */
export function isTestBuild(): boolean {
  try {
    return Native?.isTestBuild() === true;
  } catch {
    return false;
  }
}
