/**
 * Small behavior rules as pure functions checked by `npm test`: when a
 * rating prompt may ask, and what follows the onboarding paywall.
 */
import { DAY } from './readings.ts';

/**
 * When the app asks for an App Store rating (SKStoreReviewController,
 * through expo-store-review), at a moment the person just got something:
 *  - fullDay: a launch on a later day than install, once a full day of
 *    readings is stored (so the chart has something to show)
 *  - firstExport: right after the first CSV or PDF goes out
 * At most one prompt per launch, each trigger once ever, and StoreKit
 * still decides whether the prompt is shown (it caps it at 3 a year).
 */
export type ReviewTrigger = 'fullDay' | 'firstExport';

/** The guard for one ask: at most one per launch, each trigger once ever. */
export function reviewAllowed(opts: { askedThisLaunch: boolean; triggerUsed: boolean }): boolean {
  return !opts.askedThisLaunch && !opts.triggerUsed;
}

/** The whole decision for one ask: the guard above, and StoreKit able to show one at all. */
export function shouldAsk(opts: { askedThisLaunch: boolean; triggerUsed: boolean; storeCanAsk: boolean }): boolean {
  return reviewAllowed(opts) && opts.storeCanAsk;
}

/** A launch that earns the fullDay ask: a later calendar day than install, with the oldest reading a day old. Days are "YYYY-MM-DD". */
export function fullDayLaunch(installDay: string | null, today: string, oldestReadingT: number | null, now: number): boolean {
  if (installDay == null || !/^\d{4}-\d{2}-\d{2}$/.test(installDay)) return false;
  if (!(today > installDay)) return false;
  return oldestReadingT != null && now - oldestReadingT >= DAY;
}

/**
 * When the onboarding paywall closes: with Pro, straight into the app;
 * with the X, the small "The barometer is free" sheet first.
 */
export function afterOnboardingPaywall(isPro: boolean): 'app' | 'claim' {
  return isPro ? 'app' : 'claim';
}

/** The local calendar day, "2026-11-27". */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
