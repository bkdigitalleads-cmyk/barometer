import React from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTheme, space, type, tabular, Theme } from '../theme';
import { useData } from '../data';
import { useApp } from '../state';
import { elevationInUse, shownDial } from '../gates';
import { readingNear, trendAt, trendText, type Trend } from '../readings';
import { seaLevelFor, seaLevelPressure } from '../atmosphere';
import { formatElevation, formatPressure } from '../units';
import { formatAgo, formatTime } from '../format';
import Dial from '../ui/Dial';
import Glyph from '../ui/Glyph';
import { Knob, Plate, Row, Segments, Small } from '../ui/Kit';

/** The arrow for a trend: up, down, or level. */
export function TrendMark({ theme, trend, size = 30 }: { theme: Theme; trend: Trend; size?: number }) {
  const name = trend.kind === 'none' ? 'steady' : trend.direction === 'rising' ? 'up' : trend.direction === 'falling' ? 'down' : 'steady';
  return (
    <View style={[styles.mark, { width: size, height: size, borderColor: theme.ink, opacity: trend.kind === 'none' ? 0.35 : 1 }]}>
      <Glyph name={name} size={size * 0.6} color={theme.ink} weight={2.4} />
    </View>
  );
}

/**
 * The home screen: the live reading from the phone's own sensor. One
 * large number, the dial, and the three-hour trend. The number is what
 * the sensor reads, or that reading adjusted to sea level when the app
 * knows the elevation; the screen always says which.
 */
export default function Gauge({ onNote, onAltimeter }: { onNote: () => void; onAltimeter: () => void }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const data = useData();
  const { isPro } = useApp();
  const p = data.prefs;
  const unit = p.pressureUnit;
  const loc = data.locale.tag;
  const live = data.live;
  const fix = elevationInUse(isPro, p.typed, p.located.source === 'location' ? p.located : null);
  const seaHpa = live && fix ? seaLevelFor(fix, live.hpa) : null;
  const seaMode = p.gaugeMode === 'sea';
  const showSea = seaMode && seaHpa != null;
  const shown = live ? (showSea ? seaHpa : live.hpa) : null;
  const trend = live ? trendAt(data.readings, live) : ({ kind: 'none' } as Trend);
  const refRaw = trend.kind === 'trend' ? readingNear(data.readings, trend.fromT, 1)?.hpa ?? null : null;
  const ref = refRaw != null && showSea && fix?.meters != null ? seaLevelPressure(refRaw, fix.meters) : refRaw;
  const dialSize = Math.min(width - space.xl * 2, 318);
  const now = Date.now();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const bgToday = data.readings.filter((r) => r.source === 'background' && r.t >= today.getTime()).length;
  const lastStored = data.readings[data.readings.length - 1];

  const source = showSea
    ? `Sea level, using ${formatElevation(fix!.meters!, p.elevationUnit, loc)} ${p.elevationUnit} ${fix!.source === 'typed' ? 'you typed' : 'from location'}`
    : seaMode
      ? 'Sea level needs your elevation. Use your location on the Altimeter tab, or type it in Settings.'
      : 'What the sensor in this iPhone reads where you are';

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.head}>
        <Text style={[type.title, { color: theme.ink, flex: 1 }]} accessibilityRole="header">
          Air pressure
        </Text>
        <Knob theme={theme} glyph="tag" label="Add a note" onPress={onNote} filled />
      </View>

      <View style={styles.dialWrap}>
        <Dial theme={theme} size={dialSize} style={shownDial(isPro, p.dial)} unit={unit} hpa={shown} refHpa={ref} caption={showSea ? 'Sea level' : 'Sensor'} />
      </View>

      <View style={styles.reading} accessible accessibilityLabel={shown != null ? `${formatPressure(shown, unit, loc)} ${unit}. ${trendText(trend, unit, loc)}` : 'Waiting for the sensor'}>
        <View style={styles.numberRow}>
          <Text style={[type.reading, { color: theme.ink }]} maxFontSizeMultiplier={1.15} numberOfLines={1} adjustsFontSizeToFit>
            {shown != null ? formatPressure(shown, unit, loc) : '- - - -'}
          </Text>
          <Text style={[type.figure, styles.unit, { color: theme.inkSoft }]}>{unit}</Text>
        </View>
        <View style={styles.trendRow}>
          <TrendMark theme={theme} trend={trend} size={28} />
          <Text style={[type.strong, { color: theme.ink, flexShrink: 1 }]}>{trendText(trend, unit, loc)}</Text>
        </View>
      </View>

      <Segments
        theme={theme}
        label="What the number shows"
        value={p.gaugeMode}
        onChange={(v) => data.setPrefs({ gaugeMode: v })}
        options={[
          { id: 'sensor', label: 'Sensor' },
          { id: 'sea', label: 'Sea level' },
        ]}
      />
      <Small theme={theme} style={styles.source}>
        {source}
      </Small>

      <Plate theme={theme}>
        <Row
          theme={theme}
          first
          glyph="sensor"
          label={lastStored ? `Stored ${formatAgo(lastStored.t, now, loc).toLowerCase()}` : 'No readings stored yet'}
          sub={lastStored ? `One every five minutes while open. ${bgToday === 0 ? 'No background readings yet today.' : `${bgToday} from the background today.`}` : 'The first one is stored a few seconds after the sensor starts.'}
        />
        {seaMode && !fix ? <Row theme={theme} glyph="altimeter" label="Get your elevation" sub="On the Altimeter tab, from location, once" onPress={onAltimeter} /> : null}
      </Plate>
      {live ? (
        <Small theme={theme} style={{ textAlign: 'center' }}>
          Live, {formatTime(live.t, loc)}
        </Small>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.l, paddingTop: space.s, gap: space.l, paddingBottom: space.xxl },
  head: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  dialWrap: { alignItems: 'center' },
  reading: { alignItems: 'center', gap: space.s, marginTop: -space.s },
  numberRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.s },
  unit: { ...tabular },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: space.s, paddingHorizontal: space.l },
  mark: { borderRadius: 999, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  source: { textAlign: 'center', marginTop: -space.s, paddingHorizontal: space.l },
});
