/**
 * The component kit ("the bulkhead instrument"). Everything tappable goes
 * through Tap, so it shows a pressed state; every control is at least 48
 * points. The accent (sea-glass teal) is on Action only, among controls.
 *
 *   Tap        a pressable with a pressed state
 *   Action     the one main button on a screen: a teal pill
 *   Outline    a secondary pill outlined in ink
 *   Knob       a round glyph-only button, always labeled for VoiceOver
 *   Segments   a pill track of options; the picked one is solid ink
 *   Plate      an enamel plate: a card with a 1 px edge
 *   Row        a line inside a Plate
 *   Toggle     a Row with a switch
 *   Title      a screen title
 *   Small      small secondary text
 *   Caps       spaced capitals over a group
 *   Field      a text field
 *   TopBar     the bar of a screen pushed over the tabs
 *   Notice     a short line near the top for a few seconds
 *   Drawer     a sheet from the bottom over a dimmed screen
 */
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, KeyboardAvoidingView, Modal, Pressable, PressableProps, ScrollView, StyleProp, StyleSheet, Switch, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACTION, TOUCH, Theme, radius, space, type } from '../theme';
import Glyph, { GlyphName } from './Glyph';
import { MODAL_ANIMATION, tick } from './motion';

export function Tap({
  style,
  pressedStyle,
  children,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & { style?: StyleProp<ViewStyle>; pressedStyle?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return (
    <Pressable {...rest} style={({ pressed }) => [style, pressed && (pressedStyle ?? { opacity: 0.55 })]}>
      {children}
    </Pressable>
  );
}

/** The main action: a full-width teal pill. One per screen. */
export function Action({ theme, label, onPress, disabled = false, busy = false, hint, glyph }: { theme: Theme; label: string; onPress: () => void; disabled?: boolean; busy?: boolean; hint?: string; glyph?: GlyphName }) {
  const off = disabled || busy;
  return (
    <Tap
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: off, busy }}
      style={[styles.action, { backgroundColor: theme.accent, opacity: disabled ? 0.4 : 1 }]}
      pressedStyle={{ opacity: 0.85 }}
    >
      {busy ? (
        <ActivityIndicator color={theme.onAccent} />
      ) : (
        <View style={styles.row}>
          {glyph ? <Glyph name={glyph} size={20} color={theme.onAccent} weight={2.2} /> : null}
          <Text style={[type.button, { color: theme.onAccent }]} maxFontSizeMultiplier={1.3} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Tap>
  );
}

/** A secondary pill outlined in ink. */
export function Outline({ theme, label, onPress, glyph, disabled = false, grow = false, hint, tone = 'ink' }: { theme: Theme; label: string; onPress: () => void; glyph?: GlyphName; disabled?: boolean; grow?: boolean; hint?: string; tone?: 'ink' | 'danger' }) {
  const color = tone === 'danger' ? theme.danger : theme.ink;
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      style={[styles.outline, grow && { flex: 1 }, { borderColor: color, opacity: disabled ? 0.4 : 1 }]}
      pressedStyle={{ backgroundColor: theme.raised }}
    >
      {glyph ? <Glyph name={glyph} size={18} color={color} weight={2} /> : null}
      <Text style={[type.button, { color, fontSize: 16 }]} maxFontSizeMultiplier={1.4} numberOfLines={1}>
        {label}
      </Text>
    </Tap>
  );
}

/** A round glyph-only button. Always has a label for VoiceOver. */
export function Knob({ theme, glyph, label, onPress, disabled = false, color, size = 44, filled = false }: { theme: Theme; glyph: GlyphName; label: string; onPress: () => void; disabled?: boolean; color?: string; size?: number; filled?: boolean }) {
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={size < 44 ? (44 - size) / 2 : 0}
      style={[styles.knob, { width: size, height: size, opacity: disabled ? 0.3 : 1 }, filled && { backgroundColor: theme.face, borderColor: theme.edge, borderWidth: 1 }]}
      pressedStyle={{ backgroundColor: theme.raised }}
    >
      <Glyph name={glyph} size={Math.round(Math.min(size, 48) * 0.5)} color={color ?? theme.ink} weight={2} />
    </Tap>
  );
}

/** A pill track of options; the picked one is solid ink. A locked option shows a lock. */
export function Segments<T extends string>({ theme, options, value, onChange, label, small = false }: { theme: Theme; options: { id: T; label: string; locked?: boolean; a11y?: string }[]; value: T; onChange: (v: T) => void; label?: string; small?: boolean }) {
  return (
    <View style={[styles.segments, { backgroundColor: theme.raised }]} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.id === value;
        const color = on ? theme.onPicked : theme.ink;
        return (
          <Tap
            key={o.id}
            onPress={() => {
              tick();
              onChange(o.id);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.a11y ?? (o.locked ? `${o.label}, Pro` : o.label)}
            style={[styles.segment, small && { minHeight: 36 }, { backgroundColor: on ? theme.picked : 'transparent' }]}
            pressedStyle={{ opacity: 0.7 }}
          >
            {o.locked ? <Glyph name="lock" size={13} color={on ? theme.onPicked : theme.inkSoft} weight={2.2} /> : null}
            <Text style={[type.button, { color, fontSize: small ? 14 : 15 }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {o.label}
            </Text>
          </Tap>
        );
      })}
    </View>
  );
}

/** An enamel plate: a card with a 1 px edge. */
export function Plate({ theme, children, style }: { theme: Theme; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.plate, { backgroundColor: theme.face, borderColor: theme.edge }, style]}>{children}</View>;
}

/** A line inside a Plate. */
export function Row({ theme, label, sub, onPress, glyph, right, first = false, tone = 'ink', hint }: { theme: Theme; label: string; sub?: string; onPress?: () => void; glyph?: GlyphName; right?: React.ReactNode; first?: boolean; tone?: 'ink' | 'danger'; hint?: string }) {
  const color = tone === 'danger' ? theme.danger : theme.ink;
  const body = (
    <>
      {glyph ? <Glyph name={glyph} size={22} color={color} weight={1.8} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={[type.body, { color }]}>{label}</Text>
        {sub ? <Text style={[type.small, { color: theme.inkSoft, marginTop: 2 }]}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <Glyph name="chevron" size={16} color={theme.inkFaint} weight={2.2} /> : null)}
    </>
  );
  const st = [styles.line, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule }];
  if (!onPress)
    return (
      <View style={st} accessible={!right} accessibilityLabel={sub ? `${label}. ${sub}` : label}>
        {body}
      </View>
    );
  return (
    <Tap onPress={onPress} style={st} pressedStyle={{ backgroundColor: theme.raised }} accessibilityRole="button" accessibilityLabel={sub ? `${label}. ${sub}` : label} accessibilityHint={hint}>
      {body}
    </Tap>
  );
}

/** A Row with a switch. */
export function Toggle({ theme, label, sub, value, onChange, first = false, glyph }: { theme: Theme; label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; first?: boolean; glyph?: GlyphName }) {
  return (
    <Row
      theme={theme}
      first={first}
      glyph={glyph}
      label={label}
      sub={sub}
      right={<Switch value={value} onValueChange={onChange} trackColor={{ true: theme.accent, false: theme.raised }} ios_backgroundColor={theme.raised} accessibilityLabel={label} accessibilityHint={sub} />}
    />
  );
}

export function Title({ theme, children, style }: { theme: Theme; children: React.ReactNode; style?: any }) {
  return (
    <Text style={[type.title, { color: theme.ink }, style]} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
      {children}
    </Text>
  );
}

export function Small({ theme, children, style }: { theme: Theme; children: React.ReactNode; style?: any }) {
  return <Text style={[type.small, { color: theme.inkSoft }, style]}>{children}</Text>;
}

/** Spaced capitals over a group of controls. */
export function Caps({ theme, children, right, style }: { theme: Theme; children: React.ReactNode; right?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.caps, style]}>
      <Text style={[type.label, { color: theme.inkSoft, flex: 1 }]} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
        {children}
      </Text>
      {right}
    </View>
  );
}

/** A text field. */
export function Field({ theme, style, ...rest }: TextInputProps & { theme: Theme }) {
  return <TextInput placeholderTextColor={theme.inkFaint} selectionColor={theme.accent} {...rest} style={[type.body, styles.field, { color: theme.ink, backgroundColor: theme.well, borderColor: theme.rule }, style]} />;
}

/** The top bar of a screen pushed over the tabs: back on the left, a title, an optional action. */
export function TopBar({ theme, title, onBack, right }: { theme: Theme; title?: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <View style={styles.bar}>
      <View style={styles.barSide}>{onBack ? <Knob theme={theme} glyph="back" label="Back" onPress={onBack} size={48} /> : null}</View>
      <Text style={[type.button, styles.barTitle, { color: theme.ink }]} numberOfLines={1} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
        {title ?? ''}
      </Text>
      <View style={[styles.barSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

/** A short line near the top for a few seconds ("Note saved."). */
export function Notice({ theme, text, top }: { theme: Theme; text: string | null; top: number }) {
  const fade = useRef(new Animated.Value(0)).current;
  const last = useRef(text);
  if (text) last.current = text;
  useEffect(() => {
    Animated.timing(fade, { toValue: text ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [text, fade]);
  return (
    <Animated.View pointerEvents="none" style={[styles.notice, { top: top + space.s, opacity: fade, backgroundColor: theme.ink }]} accessibilityLiveRegion="polite">
      <Text style={[type.strong, { color: theme.bg, textAlign: 'center', fontSize: 15 }]}>{last.current}</Text>
    </Animated.View>
  );
}

/** A sheet from the bottom over a dimmed screen. Fades in. Shrinks above the keyboard and scrolls. */
export function Drawer({ theme, visible, onClose, children, title }: { theme: Theme; visible: boolean; onClose: () => void; children: React.ReactNode; title?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType={MODAL_ANIMATION} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }]} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        <View style={[styles.drawer, { backgroundColor: theme.bg, borderColor: theme.edge, paddingBottom: Math.max(insets.bottom, space.l) }]}>
          <View style={[styles.grip, { backgroundColor: theme.rule }]} />
          <View style={styles.drawerHead}>
            <Text style={[type.title, { color: theme.ink, flex: 1, fontSize: 22, lineHeight: 27 }]} accessibilityRole="header">
              {title ?? ''}
            </Text>
            <Knob theme={theme} glyph="close" label="Close" onPress={onClose} size={44} filled />
          </View>
          <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  action: { minHeight: ACTION, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  outline: { minHeight: TOUCH, borderRadius: radius.pill, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s, paddingHorizontal: space.l },
  knob: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segments: { flexDirection: 'row', borderRadius: radius.pill, padding: 3, gap: 2 },
  segment: { flex: 1, minHeight: 40, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: space.xs },
  plate: { borderRadius: radius.plate, borderWidth: 1, overflow: 'hidden' },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 56, paddingHorizontal: space.l, paddingVertical: space.m },
  caps: { flexDirection: 'row', alignItems: 'center', gap: space.s, marginBottom: space.s, minHeight: 18, paddingHorizontal: space.xs },
  field: { minHeight: TOUCH, borderRadius: radius.small, borderWidth: 1, paddingHorizontal: space.m },
  bar: { flexDirection: 'row', alignItems: 'center', minHeight: TOUCH + 4, paddingHorizontal: space.s },
  barSide: { minWidth: 88 },
  barTitle: { flex: 1, textAlign: 'center' },
  notice: { position: 'absolute', left: space.xl, right: space.xl, borderRadius: radius.pill, paddingVertical: space.m, paddingHorizontal: space.l },
  drawer: { borderTopLeftRadius: radius.plate + 6, borderTopRightRadius: radius.plate + 6, borderWidth: 1, paddingHorizontal: space.l, paddingTop: space.s, maxHeight: '92%' },
  grip: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: space.xs },
  drawerHead: { flexDirection: 'row', alignItems: 'center', minHeight: TOUCH + 4 },
});
