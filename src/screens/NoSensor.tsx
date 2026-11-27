import React from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { useTheme, space, type } from '../theme';
import Glyph from '../ui/Glyph';
import { Outline } from '../ui/Kit';

/**
 * The plain screens when there is nothing to read:
 *  - missing: this iPhone or iPad has no pressure sensor
 *  - silent: there is a sensor but no samples arrive, which is Motion &
 *    Fitness access turned off for the app
 */
export default function NoSensor({ kind }: { kind: 'missing' | 'silent' }) {
  const theme = useTheme();
  const device = Platform.OS === 'ios' && (Platform as any).isPad ? 'iPad' : 'iPhone';
  return (
    <View style={styles.wrap}>
      <Glyph name="sensor" size={64} color={theme.inkSoft} weight={1.6} />
      {kind === 'missing' ? (
        <>
          <Text style={[type.title, styles.center, { color: theme.ink }]} accessibilityRole="header">
            This {device} has no pressure sensor.
          </Text>
          <Text style={[type.body, styles.center, { color: theme.inkSoft }]}>Barometer reads the air pressure sensor built into the phone. Without one there is nothing to show or record, so the app stops here.</Text>
        </>
      ) : (
        <>
          <Text style={[type.title, styles.center, { color: theme.ink }]} accessibilityRole="header">
            No reading from the sensor.
          </Text>
          <Text style={[type.body, styles.center, { color: theme.inkSoft }]}>iOS lets Barometer read the pressure sensor through Motion & Fitness. Turn it on for Barometer in Settings, then come back.</Text>
          <Outline theme={theme} label="Open Settings" onPress={() => Linking.openSettings()} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.l },
  center: { textAlign: 'center' },
});
