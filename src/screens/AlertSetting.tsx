import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useTheme, space, type, radius } from '../theme';
import { useData } from '../data';
import { useApp } from '../state';
import { alertActive, canAlert } from '../gates';
import { ALERT_STEPS_HPA, ALERT_TIMING_TEXT, ALERT_TITLE, alertText } from '../alerts';
import { refreshStatus } from '../background';
import { requestReminderPermission } from '../reminder';
import { formatChange } from '../units';
import Glyph from '../ui/Glyph';
import { Caps, Plate, Row, Segments, Small, Toggle, TopBar } from '../ui/Kit';

/**
 * The pressure change alert: on or off, and the amount. It says plainly
 * that it depends on how often iOS lets the app check, so it can be late.
 */
export default function AlertSetting({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const data = useData();
  const { isPro, askPro } = useApp();
  const p = data.prefs;
  const unit = p.pressureUnit;
  const loc = data.locale.tag;
  const [notify, setNotify] = useState<'on' | 'off' | 'unknown'>('unknown');
  const [refresh, setRefresh] = useState<'available' | 'denied' | 'restricted' | 'unknown'>('unknown');
  const on = alertActive(isPro, p.alertOn);

  const check = useCallback(async () => {
    try {
      const perm = await Notifications.getPermissionsAsync();
      setNotify(perm.granted ? 'on' : 'off');
    } catch {
      setNotify('unknown');
    }
    setRefresh(await refreshStatus());
  }, []);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, [check]);

  const toggle = async (v: boolean) => {
    if (!v) return data.setPrefs({ alertOn: false });
    if (!canAlert(isPro) && !(await askPro('alert'))) return;
    data.setPrefs({ alertOn: true });
    await requestReminderPermission();
    check();
  };

  const sample = alertText({ dir: 'fall', amount: p.alertHpa, fromT: 0, at: 0 }, unit, loc);

  return (
    <View style={{ flex: 1 }}>
      <TopBar theme={theme} title="Change alert" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Plate theme={theme}>
          <Toggle theme={theme} first glyph="bell" label="Alert on a big change" sub={isPro ? 'A rise or fall within three hours' : 'Pro. A rise or fall within three hours'} value={on} onChange={toggle} />
        </Plate>

        <View>
          <Caps theme={theme}>Amount, in {unit}</Caps>
          <Segments
            theme={theme}
            label={`Alert when the pressure changes by at least this much, in ${unit}`}
            value={String(p.alertHpa)}
            onChange={(v) => data.setPrefs({ alertHpa: Number(v) })}
            options={ALERT_STEPS_HPA.map((h) => ({ id: String(h), label: formatChange(h, unit, loc), a11y: `${formatChange(h, unit, loc)} ${unit}` }))}
          />
          <Small theme={theme} style={{ marginTop: space.s, paddingHorizontal: space.xs }}>
            {ALERT_STEPS_HPA.map((h) => `${h} hPa`).join(', ')} in hPa. Changes over 15 hPa in three hours come from going up or down (a lift, a hill road, a plane) and do not alert.
          </Small>
        </View>

        <View>
          <Caps theme={theme}>It looks like this</Caps>
          <View style={[styles.banner, { backgroundColor: theme.face, borderColor: theme.edge }]} accessible accessibilityLabel={`Example: ${ALERT_TITLE}. ${sample}`}>
            <View style={[styles.appMark, { backgroundColor: theme.bezel }]}>
              <Glyph name="gauge" size={18} color="#FFFFFF" weight={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[type.strong, { color: theme.ink, fontSize: 15 }]}>{ALERT_TITLE}</Text>
              <Text style={[type.small, { color: theme.ink }]}>{sample}</Text>
            </View>
          </View>
        </View>

        <View>
          <Caps theme={theme}>When it can arrive</Caps>
          <Plate theme={theme} style={{ padding: space.l }}>
            <Text style={[type.body, { color: theme.ink }]}>{ALERT_TIMING_TEXT}</Text>
          </Plate>
        </View>

        <Plate theme={theme}>
          <Row
            theme={theme}
            first
            label="Notifications"
            sub={notify === 'on' ? 'Allowed' : notify === 'off' ? 'Off for Barometer. Turn them on in Settings.' : 'Not checked yet'}
            onPress={notify === 'off' ? () => Linking.openSettings() : undefined}
          />
          <Row
            theme={theme}
            label="Background App Refresh"
            sub={refresh === 'available' ? 'On' : refresh === 'denied' ? 'Off for Barometer. Without it, readings and alerts only happen while the app is open.' : refresh === 'restricted' ? 'Turned off on this iPhone (Low Power Mode or a restriction)' : 'Checked on iPhone'}
            onPress={refresh === 'denied' ? () => Linking.openSettings() : undefined}
          />
        </Plate>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.l, gap: space.xl, paddingBottom: space.xxl },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.m, borderRadius: radius.plate + 4, borderWidth: 1, padding: space.m },
  appMark: { width: 38, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});
