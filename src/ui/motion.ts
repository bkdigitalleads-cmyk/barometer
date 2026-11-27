import * as Haptics from 'expo-haptics';

/**
 * Quiet motion: sheets and modals fade (no slides or bounces), and
 * feedback comes by touch.
 */
export const MODAL_ANIMATION = 'fade' as const;

/** A note saved, a file out: a soft confirmation. */
export const savedHaptic = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
/** Picking an option. */
export const tick = () => Haptics.selectionAsync().catch(() => {});
/** The altimeter's reset point set. */
export const setHaptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
