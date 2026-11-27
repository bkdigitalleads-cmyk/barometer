import * as StoreReview from 'expo-store-review';
import { kvGet, kvSet } from './store';
import { ReviewTrigger, shouldAsk } from './rules';

export type { ReviewTrigger } from './rules';

/**
 * The App Store rating ask, at a moment the person just got something: a
 * launch on a later day once a full day of history exists, or the first
 * export (rules.ts). At most one prompt per launch, each trigger once
 * ever, and StoreKit still decides whether the prompt is shown (it caps it
 * at 3 a year). The decisions are pure functions in rules.ts, checked by
 * `npm test`. Same engine as Cash Counter, Estimate Maker and Odo 1.0.6.
 */
const triggerKey = (t: ReviewTrigger) => `review.${t}`;

let launchState: 'idle' | 'checking' | 'asked' = 'idle';

export async function maybeRequestReview(trigger: ReviewTrigger): Promise<void> {
  if (launchState !== 'idle') return;
  launchState = 'checking';
  try {
    const used = (await kvGet(triggerKey(trigger))) != null;
    const storeCanAsk = await StoreReview.hasAction();
    if (!shouldAsk({ askedThisLaunch: false, triggerUsed: used, storeCanAsk })) return;
    await kvSet(triggerKey(trigger), '1');
    launchState = 'asked';
    setTimeout(() => {
      StoreReview.requestReview().catch(() => {});
    }, 1200);
  } catch {
    // never let review plumbing get in the way
  } finally {
    if (launchState === 'checking') launchState = 'idle';
  }
}
