import React, { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { useTheme, space, type, tabular } from '../theme';
import { useData } from '../data';
import { useApp } from '../state';
import { elevationInUse } from '../gates';
import { climbBetween, currentElevation, isElevationInRange, NO_FIX } from '../atmosphere';
import { formatClimb, formatElevation } from '../units';
import { formatTime } from '../format';
import Tape from '../ui/Tape';
import { Outline, Plate, Row, Small, Title } from '../ui/Kit';
import { setHaptic } from '../ui/motion';

/**
 * Elevation, and the climb or drop since a reset point, from the pressure
 * sensor, so it works without signal. Location is asked for only here,
 * only when the person taps Use my location, only while the app is in use,
 * and only to get a starting elevation; it stays on the phone. With
 * location off, the elevation is the standard-atmosphere estimate and the
 * climb still works.
 */
export default function Altimeter() {
  const theme = useTheme();
  const data = useData();
  const { isPro } = useApp();
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);
  const p = data.prefs;
  const u = p.elevationUnit;
  const loc = data.locale.tag;
  const live = data.live;
  const fix = elevationInUse(isPro, p.typed, p.located.source === 'location' ? p.located : null) ?? NO_FIX;
  // The typed elevation is where the phone usually sits; the altimeter follows changes from the moment it was set.
  const anchored = fix.source === 'typed' && fix.atHpa == null && live ? { ...fix, atHpa: live.hpa } : fix;
  const elev = live ? currentElevation(anchored, live.hpa) : null;
  const climb = live && data.resetPoint ? climbBetween(data.resetPoint.hpa, live.hpa) : null;

  const useLocation = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setDenied(true);
        return;
      }
      setDenied(false);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const alt = pos.coords.altitude;
      if (alt == null || !isElevationInRange(alt) || !live) {
        Alert.alert('No elevation from location', 'Your iPhone gave a position without an elevation. Try again outdoors with a clear view of the sky.');
        return;
      }
      data.setLocated({ source: 'location', meters: alt, atHpa: live.hpa, at: Date.now(), accuracy: pos.coords.altitudeAccuracy ?? null });
      setHaptic();
    } catch {
      Alert.alert('Location did not answer', 'Try again in a moment, outdoors if you can.');
    } finally {
      setLocating(false);
    }
  };

  const sourceLine =
    fix.source === 'location'
      ? `From location at ${formatTime(fix.at ?? Date.now(), loc)}${fix.accuracy ? `, within ${formatElevation(fix.accuracy, u, loc)} ${u}` : ''}, then followed by pressure`
      : fix.source === 'typed'
        ? 'From the elevation you typed, then followed by pressure'
        : 'Estimated from pressure alone. The weather moves it by tens of meters; use your location for a better start.';

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Title theme={theme}>Altimeter</Title>

      <View style={styles.top}>
        <View style={{ flex: 1, gap: space.xs }}>
          <Text style={[type.label, { color: theme.inkSoft }]}>Elevation{elev?.estimated ? ', estimated' : ''}</Text>
          <View style={styles.numberRow} accessible accessibilityLabel={elev ? `${formatElevation(elev.meters, u, loc)} ${u === 'ft' ? 'feet' : 'meters'}` : 'Waiting for the sensor'}>
            <Text style={[type.reading, { color: theme.ink }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.15}>
              {elev ? formatElevation(elev.meters, u, loc) : '- - -'}
            </Text>
            <Text style={[type.figure, { color: theme.inkSoft, ...tabular }]}>{u}</Text>
          </View>
          <Small theme={theme}>{sourceLine}</Small>
        </View>
        <Tape theme={theme} meters={elev?.meters ?? null} unit={u} height={188} width={88} />
      </View>

      <Plate theme={theme} style={styles.climb}>
        <Text style={[type.label, { color: theme.inkSoft }]}>Climb since reset</Text>
        <View style={styles.numberRow}>
          <Text style={[type.reading, { color: theme.ink, fontSize: 48, lineHeight: 54 }]}>{climb != null ? formatClimb(climb, u, loc) : '0'}</Text>
          <Text style={[type.figure, { color: theme.inkSoft, ...tabular }]}>{u}</Text>
        </View>
        <Small theme={theme}>{data.resetPoint ? `Since ${formatTime(data.resetPoint.t, loc)}. Up is plus, down is minus.` : 'Tap Reset here at the bottom of the stairs or the start of a trail.'}</Small>
        <Outline theme={theme} label="Reset here" glyph="reset" onPress={() => {
          data.resetClimb();
          setHaptic();
        }} disabled={!live} />
      </Plate>

      <Plate theme={theme}>
        <Row
          theme={theme}
          first
          glyph="location"
          label={locating ? 'Finding your elevation' : fix.source === 'location' ? 'Update from my location' : 'Use my location'}
          sub={denied ? 'Location is off for Barometer. The altimeter still follows climbs and drops from pressure.' : 'Once, to set a starting elevation. Only while the app is open; it stays on this iPhone.'}
          onPress={useLocation}
        />
        {denied ? <Row theme={theme} label="Open Settings" sub="To turn location on for Barometer" onPress={() => Linking.openSettings()} /> : null}
      </Plate>

      <Small theme={theme} style={{ paddingHorizontal: space.xs }}>
        Works without signal: the climb comes from the pressure sensor. Weather moves pressure too, about 8 meters for each hPa, so reset just before a climb.
      </Small>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.l, paddingTop: space.s, gap: space.l, paddingBottom: space.xxl },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.l, marginTop: space.s },
  numberRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.s },
  climb: { padding: space.l, gap: space.s },
});
