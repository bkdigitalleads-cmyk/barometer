import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme, TOUCH, space, type } from '../theme';
import Glyph, { GlyphName } from './Glyph';
import { Tap } from './Kit';

export type Tab = 'gauge' | 'altimeter' | 'history' | 'settings';

const TABS: { id: Tab; label: string; glyph: GlyphName }[] = [
  { id: 'gauge', label: 'Gauge', glyph: 'gauge' },
  { id: 'altimeter', label: 'Altimeter', glyph: 'altimeter' },
  { id: 'history', label: 'History', glyph: 'history' },
  { id: 'settings', label: 'Settings', glyph: 'settings' },
];

/** The four places, along the bottom. The current one in full ink over a pill, the rest faint. */
export default function TabBar({ theme, tab, onTab }: { theme: Theme; tab: Tab; onTab: (t: Tab) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { backgroundColor: theme.face, borderTopColor: theme.rule, paddingBottom: Math.max(insets.bottom - space.s, space.xs) }]} accessibilityRole="tablist">
      {TABS.map((t) => {
        const on = t.id === tab;
        const color = on ? theme.ink : theme.inkFaint;
        return (
          <Tap key={t.id} onPress={() => onTab(t.id)} style={styles.tab} pressedStyle={{ opacity: 0.6 }} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t.label}>
            <View style={[styles.pill, { backgroundColor: on ? theme.raised : 'transparent' }]}>
              <Glyph name={t.glyph} size={24} color={color} weight={on ? 2.2 : 1.8} />
            </View>
            <Text style={[type.label, styles.label, { color }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {t.label}
            </Text>
          </Tap>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: TOUCH + 8, gap: 2, paddingTop: space.s },
  pill: { width: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  label: { alignSelf: 'stretch', textAlign: 'center', letterSpacing: 0.2, textTransform: 'none', fontSize: 12 },
});
