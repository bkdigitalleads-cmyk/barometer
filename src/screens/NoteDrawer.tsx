import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTheme, space, type, radius } from '../theme';
import { useData } from '../data';
import { cleanLabel, PRESET_LABELS, snapshotAt } from '../notes';
import { HOUR, trendText } from '../readings';
import { formatPressure } from '../units';
import { Action, Drawer, Field, Segments, Small, Tap } from '../ui/Kit';
import { savedHaptic } from '../ui/motion';

type When = 'now' | '1h' | '3h';
const AGO: Record<When, number> = { now: 0, '1h': HOUR, '3h': 3 * HOUR };

/** Tag a moment: a ready label or the person's own, now or a little earlier. The gate (one free note) is checked before this opens. */
export default function NoteDrawer({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const theme = useTheme();
  const data = useData();
  const [pick, setPick] = useState<string | null>(null);
  const [own, setOwn] = useState('');
  const [when, setWhen] = useState<When>('now');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setPick(null);
      setOwn('');
      setWhen('now');
    }
  }, [visible]);

  const label = pick === 'own' ? cleanLabel(own) : pick ?? '';
  const t = Date.now() - AGO[when];
  const snap = snapshotAt(data.readings, t, when === 'now' ? data.live : null);
  const unit = data.prefs.pressureUnit;
  const loc = data.locale.tag;

  const save = async () => {
    if (!label || busy) return;
    setBusy(true);
    try {
      await data.addNote(label, t);
      savedHaptic();
      onSaved();
    } catch (e: any) {
      Alert.alert('The note was not saved', e?.message ?? 'Try once more.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer theme={theme} visible={visible} onClose={onClose} title="Add a note">
      <View style={styles.body}>
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Label">
          {[...PRESET_LABELS, 'own'].map((l) => {
            const on = pick === l;
            return (
              <Tap
                key={l}
                onPress={() => setPick(l)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={l === 'own' ? 'Your own label' : l}
                style={[styles.chip, { borderColor: on ? theme.picked : theme.rule, backgroundColor: on ? theme.picked : theme.face }]}
                pressedStyle={{ opacity: 0.7 }}
              >
                <Text style={[type.button, { color: on ? theme.onPicked : theme.ink, fontSize: 16 }]}>{l === 'own' ? 'Your own' : l}</Text>
              </Tap>
            );
          })}
        </View>
        {pick === 'own' ? <Field theme={theme} value={own} onChangeText={setOwn} placeholder="Label, like Sore knee or Boat out" maxLength={40} autoFocus returnKeyType="done" onSubmitEditing={save} accessibilityLabel="Your own label" /> : null}

        <Segments
          theme={theme}
          label="When"
          value={when}
          onChange={setWhen}
          small
          options={[
            { id: 'now', label: 'Now' },
            { id: '1h', label: '1 hour ago' },
            { id: '3h', label: '3 hours ago' },
          ]}
        />
        <View style={[styles.snap, { backgroundColor: theme.face, borderColor: theme.edge }]}>
          <Text style={[type.figure, { color: theme.ink }]}>{snap.hpa != null ? `${formatPressure(snap.hpa, unit, loc)} ${unit}` : 'No reading then'}</Text>
          <Small theme={theme}>{snap.hpa != null ? trendText(snap.trend, unit, loc) : 'The note is kept without a pressure.'}</Small>
        </View>
        <Action theme={theme} label="Save note" onPress={save} disabled={!label} busy={busy} />
      </View>
    </Drawer>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.m, paddingBottom: space.s },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  chip: { minHeight: 44, borderRadius: radius.pill, borderWidth: 1.5, paddingHorizontal: space.l, justifyContent: 'center' },
  snap: { borderRadius: radius.plate, borderWidth: 1, padding: space.l, gap: 2 },
});
