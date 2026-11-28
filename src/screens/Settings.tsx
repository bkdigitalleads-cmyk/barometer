import React, { useRef, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useTheme, space, type } from '../theme';
import { useData } from '../data';
import { useApp, ONBOARDED_KEY } from '../state';
import { alertActive, canTypeElevation, DIAL_STYLES, dialAllowed, elevationInUse, type DialStyle } from '../gates';
import { isElevationInRange } from '../atmosphere';
import { ELEVATION_UNITS, formatElevation, PRESSURE_UNITS, parseNumber, toMeters } from '../units';
import { formatMoment } from '../format';
import { restorePurchases } from '../purchases';
import { cancelTrialReminder } from '../reminder';
import { kvSet } from '../store';
import { getDb } from '../db/native';
import { importPending } from '../background';
import { lastBackgroundRun, recordNow } from '../background';
import { PRIVACY_URL, SUPPORT_EMAIL, SUPPORT_MAIL_URL, SUPPORT_URL, TERMS_URL } from '../links';
import Glyph from '../ui/Glyph';
import { Action, Caps, Drawer, Field, Plate, Row, Segments, Small, Title } from '../ui/Kit';

/** Units, sea level, the dial, the alert, export, Pro, restore, help and About. Test tools behind seven taps on the version line, in test builds only. */
export default function Settings({ onAlert, onExport, onReplayOnboarding }: { onAlert: () => void; onExport: () => void; onReplayOnboarding: () => void }) {
  const theme = useTheme();
  const data = useData();
  const { isPro, setIsPro, askPro, testBuild, actFree, setActFree, say } = useApp();
  const [restoring, setRestoring] = useState(false);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const [taps, setTaps] = useState(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const version = `${Constants.expoConfig?.version ?? '1.0.0'} (${Constants.expoConfig?.ios?.buildNumber ?? '1'})`;
  const p = data.prefs;
  const u = p.elevationUnit;
  const loc = data.locale.tag;
  const fix = elevationInUse(isPro, p.typed, p.located.source === 'location' ? p.located : null);

  const restore = async () => {
    if (restoring) return;
    setRestoring(true);
    const res = await restorePurchases();
    setRestoring(false);
    if (res.ok) cancelTrialReminder();
    if (res.ok && res.isPro) {
      setIsPro(true);
      Alert.alert('Pro is back on', 'The week and month charts, alerts, notes and export are open again.');
    } else if (res.ok) Alert.alert('Nothing to restore', 'This Apple ID has no Barometer Pro purchase.');
    else Alert.alert('Restore did not work', res.error ?? 'Try once more.');
  };

  const versionTap = () => {
    if (!testBuild) return;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setTaps(0), 2000);
    setTaps((t) => t + 1);
  };

  const openTyping = async () => {
    if (!canTypeElevation(isPro) && !(await askPro('calibrate'))) return;
    setTyped(p.typed?.meters != null ? String(Math.round(u === 'ft' ? p.typed.meters / 0.3048 : p.typed.meters)) : '');
    setTyping(true);
  };

  const saveTyped = () => {
    const n = parseNumber(typed);
    const m = n == null ? NaN : toMeters(n, u);
    if (!isElevationInRange(m)) {
      Alert.alert('That elevation is out of range', `Type a number between ${formatElevation(-450, u, loc)} and ${formatElevation(9000, u, loc)} ${u}.`);
      return;
    }
    data.setTyped({ source: 'typed', meters: m, atHpa: data.live?.hpa ?? null, at: Date.now() });
    setTyping(false);
    say('Elevation set.');
  };

  const pickDial = async (d: DialStyle) => {
    if (dialAllowed(isPro, d) || (await askPro('dial'))) data.setPrefs({ dial: d });
  };

  const elevationLine = fix
    ? `${formatElevation(fix.meters!, u, loc)} ${u}, ${fix.source === 'typed' ? 'typed' : `from location${fix.at ? `, ${formatMoment(fix.at, Date.now(), loc)}` : ''}`}`
    : 'None yet. Use your location on the Altimeter tab, or type it.';

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={{ minHeight: 48, justifyContent: 'center' }}>
        <Title theme={theme}>Settings</Title>
      </View>

      <View style={{ gap: space.m }}>
        <Caps theme={theme}>Pressure unit</Caps>
        <Segments theme={theme} small label="Pressure unit" value={p.pressureUnit} onChange={(v) => data.setPrefs({ pressureUnit: v })} options={PRESSURE_UNITS.map((x) => ({ id: x, label: x }))} />
        <Caps theme={theme} style={{ marginTop: space.s }}>
          Elevation unit
        </Caps>
        <Segments theme={theme} small label="Elevation unit" value={u} onChange={(v) => data.setPrefs({ elevationUnit: v })} options={ELEVATION_UNITS.map((x) => ({ id: x, label: x === 'ft' ? 'Feet' : 'Meters' }))} />
      </View>

      <View>
        <Caps theme={theme}>Sea level pressure</Caps>
        <Plate theme={theme}>
          <Row theme={theme} first glyph="altimeter" label="Elevation in use" sub={elevationLine} />
          <Row theme={theme} glyph="calendar" label={p.typed ? 'Change my typed elevation' : 'Type my elevation'} sub={isPro ? 'For sea level pressure without location' : 'Pro. For sea level pressure without location'} onPress={openTyping} right={!isPro ? <Glyph name="lock" size={18} color={theme.inkSoft} /> : undefined} />
          {p.typed ? <Row theme={theme} label="Clear my typed elevation" onPress={() => data.setTyped(null)} right={<View />} /> : null}
        </Plate>
      </View>

      <View>
        <Caps theme={theme}>Dial</Caps>
        <Plate theme={theme}>
          {DIAL_STYLES.map((d, i) => (
            <Row
              key={d.id}
              theme={theme}
              first={i === 0}
              glyph="dial"
              label={d.label}
              sub={dialAllowed(isPro, d.id) ? d.line : `Pro. ${d.line}`}
              onPress={() => pickDial(d.id)}
              right={p.dial === d.id && dialAllowed(isPro, d.id) ? <Glyph name="check" size={22} color={theme.ink} weight={2.4} /> : !dialAllowed(isPro, d.id) ? <Glyph name="lock" size={18} color={theme.inkSoft} /> : <View />}
            />
          ))}
        </Plate>
      </View>

      <View>
        <Caps theme={theme}>Alert and export</Caps>
        <Plate theme={theme}>
          <Row theme={theme} first glyph="bell" label="Change alert" sub={alertActive(isPro, p.alertOn) ? 'On' : 'Off'} onPress={onAlert} />
          <Row theme={theme} glyph="share" label="Export" sub="PDF chart and CSV of readings and notes" onPress={onExport} />
        </Plate>
      </View>

      <View>
        <Caps theme={theme}>Pro</Caps>
        <Plate theme={theme}>
          {isPro ? (
            <Row theme={theme} first glyph="check" label="Barometer Pro is on" sub="Week and month charts, alerts, notes, export, your elevation and the dials" />
          ) : (
            <Row theme={theme} first glyph="star" label="Barometer Pro" sub="The gauge, the altimeter and the last 24 hours are free. Pro adds the week and month, alerts, notes, export and more." onPress={() => askPro('pro')} />
          )}
          <Row theme={theme} glyph="undo" label={restoring ? 'Restoring' : 'Restore purchases'} onPress={restore} right={<View />} />
        </Plate>
      </View>

      <View>
        <Caps theme={theme}>Help</Caps>
        <Plate theme={theme}>
          <Row theme={theme} first label="Questions and answers" sub="Readings, background checks, alerts and units" onPress={() => Linking.openURL(SUPPORT_URL)} />
          <Row theme={theme} label="Email support" sub={SUPPORT_EMAIL} hint="Opens Mail with the subject Barometer support" onPress={() => Linking.openURL(SUPPORT_MAIL_URL).catch(() => Alert.alert('Mail did not open', `Write to ${SUPPORT_EMAIL}.`))} />
          <Row theme={theme} label="Privacy Policy" onPress={() => Linking.openURL(PRIVACY_URL)} />
          <Row theme={theme} label="Terms of Use (EULA)" onPress={() => Linking.openURL(TERMS_URL)} />
        </Plate>
      </View>

      <View>
        <Caps theme={theme}>About</Caps>
        <Plate theme={theme} style={styles.about}>
          <Text style={[type.body, { color: theme.ink }]}>A barometer and altimeter that reads the pressure sensor in this iPhone and keeps a record of it. It shows what the sensor reads.</Text>
          <Small theme={theme}>No account. Readings and notes stay on this iPhone and it works offline.</Small>
          <Text style={[type.small, { color: theme.inkFaint, paddingVertical: space.xs }]} onPress={versionTap} accessibilityRole="text">
            Version {version}
          </Text>
        </Plate>
      </View>

      {testBuild && taps >= 7 ? (
        <View>
          <Caps theme={theme}>Testing (test builds only)</Caps>
          <Plate theme={theme}>
            <Row theme={theme} first label="Act as a free user" right={<Switch value={actFree} onValueChange={(v) => setActFree(v)} />} />
            <Row
              theme={theme}
              label="Take a background reading now"
              sub={(() => {
                const t = lastBackgroundRun();
                return t ? `Last background reading ${formatMoment(t, Date.now(), loc)}` : 'No background reading yet';
              })()}
              onPress={async () => {
                const ok = await recordNow();
                const db = await getDb();
                await importPending(db).catch(() => 0);
                await data.refresh();
                say(ok ? 'Background reading stored.' : 'No reading: the module or motion access is missing.');
              }}
              right={<View />}
            />
            <Row theme={theme} label="Add a made-up week of readings" onPress={() => data.addSample().then(() => say('Made-up week added.'))} right={<View />} />
            <Row theme={theme} label="Clear readings and notes" tone="danger" onPress={() => Alert.alert('Clear every reading and note?', 'Test builds only.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: () => data.clearAll() }])} right={<View />} />
            <Row
              theme={theme}
              label="Show onboarding again"
              onPress={() => {
                kvSet(ONBOARDED_KEY, '0').catch(() => {});
                onReplayOnboarding();
              }}
              right={<View />}
            />
          </Plate>
        </View>
      ) : null}

      <Drawer theme={theme} visible={typing} onClose={() => setTyping(false)} title="Your elevation">
        <View style={{ gap: space.m, paddingBottom: space.s }}>
          <Small theme={theme}>Where the phone usually is, like your home or a boat's cabin. Sea level pressure uses it as typed; the altimeter follows climbs from there.</Small>
          <Field theme={theme} value={typed} onChangeText={setTyped} keyboardType="numbers-and-punctuation" placeholder={u === 'ft' ? 'Feet, like 650' : 'Meters, like 200'} autoFocus returnKeyType="done" onSubmitEditing={saveTyped} accessibilityLabel={`Elevation in ${u === 'ft' ? 'feet' : 'meters'}`} />
          <Action theme={theme} label="Set elevation" onPress={saveTyped} disabled={!typed.trim()} />
        </View>
      </Drawer>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.l, paddingTop: space.s, gap: space.xl, paddingBottom: space.xxl },
  about: { padding: space.l, gap: space.s },
});
