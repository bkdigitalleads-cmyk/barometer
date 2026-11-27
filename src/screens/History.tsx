import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTheme, space, type, Theme } from '../theme';
import { useData } from '../data';
import { useApp } from '../state';
import { historyStart, rangeAllowed } from '../gates';
import { chartData, GAP_TEXT, hasGaps, rangeMs, RANGE_SHORT, RANGES, summary, type RangeId } from '../chart';
import { DIRECTION_WORD, directionOf } from '../readings';
import type { Note } from '../notes';
import { formatChange, formatPressure, type PressureUnit } from '../units';
import { formatMoment } from '../format';
import Chart from '../ui/Chart';
import Glyph from '../ui/Glyph';
import { Caps, Knob, Outline, Plate, Segments, Small, Tap } from '../ui/Kit';

/**
 * The chart of stored readings (3 hours and 24 hours free; 7 and 30 days
 * with Pro), with gaps left as gaps, the notes as numbered marks, and the
 * list of notes with the pressure and trend at each.
 */
export default function History({ onNote, onExport, onAlert }: { onNote: () => void; onExport: () => void; onAlert: () => void }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const data = useData();
  const { isPro, askPro } = useApp();
  const p = data.prefs;
  const unit = p.pressureUnit;
  const loc = data.locale.tag;
  const range: RangeId = rangeAllowed(isPro, p.range) ? p.range : '24h';
  const now = Date.now();
  const to = now;
  const from = Math.max(now - rangeMs(range), historyStart(isPro, now));
  const d = chartData(data.readings, from, to);
  const sum = summary(d.points);
  const visibleNotes = data.notes.filter((n) => n.t >= historyStart(isPro, now));
  const chartNotes = visibleNotes.filter((n) => n.t >= from && n.t <= to);
  const numbered = [...chartNotes].sort((a, b) => a.t - b.t);
  const hidden = !isPro && data.oldestT != null && data.oldestT < now - rangeMs('24h');

  const pick = async (r: RangeId) => {
    if (rangeAllowed(isPro, r)) return data.setPrefs({ range: r });
    if (await askPro('range')) data.setPrefs({ range: r });
  };

  const remove = (n: Note) =>
    Alert.alert('Delete this note?', `${n.label}, ${formatMoment(n.t, now, loc)}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => data.removeNote(n.id) },
    ]);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.head}>
        <Text style={[type.title, { color: theme.ink, flex: 1 }]} accessibilityRole="header">
          History
        </Text>
        <Knob theme={theme} glyph="bell" label="Change alert" onPress={onAlert} filled />
        <Knob theme={theme} glyph="share" label="Export" onPress={onExport} filled />
      </View>

      <Segments
        theme={theme}
        label="Chart range"
        value={range}
        onChange={pick}
        options={RANGES.map((r) => ({ id: r.id, label: RANGE_SHORT[r.id], locked: !rangeAllowed(isPro, r.id), a11y: `${r.label}${rangeAllowed(isPro, r.id) ? '' : ', Pro'}` }))}
      />

      <Plate theme={theme} style={styles.chartPlate}>
        <View style={styles.sumRow}>
          <Stat theme={theme} label="Now" value={sum ? formatPressure(sum.last.hpa, unit, loc) : '-'} />
          <Stat theme={theme} label="High" value={sum ? formatPressure(sum.high.hpa, unit, loc) : '-'} />
          <Stat theme={theme} label="Low" value={sum ? formatPressure(sum.low.hpa, unit, loc) : '-'} />
          <Stat theme={theme} label="Change" value={sum ? `${sum.change < 0 ? '-' : '+'}${formatChange(sum.change, unit, loc)}` : '-'} />
        </View>
        <Chart
          theme={theme}
          data={d}
          range={range}
          unit={unit}
          notes={chartNotes}
          width={width - space.l * 2 - 2}
          height={236}
          locale={loc}
          label={sum ? `Pressure over the last ${RANGES.find((r) => r.id === range)!.label}, from ${formatPressure(sum.first.hpa, unit, loc)} to ${formatPressure(sum.last.hpa, unit, loc)} ${unit}` : 'No readings in this range yet'}
        />
        {hasGaps(d) ? (
          <View style={styles.legend}>
            <View style={[styles.swatch, { backgroundColor: theme.gap, borderColor: theme.rule }]} />
            <Small theme={theme} style={{ flex: 1 }}>
              {d.points.length ? GAP_TEXT : 'No readings in this range yet. They are stored while the app is open and when iOS lets it check in the background.'}
            </Small>
          </View>
        ) : null}
      </Plate>
      {hidden ? <Small theme={theme} style={{ paddingHorizontal: space.xs }}>Older readings are kept on this iPhone and show with Pro.</Small> : null}

      <View>
        <Caps theme={theme} right={<Tap onPress={onNote} accessibilityRole="button" accessibilityLabel="Add a note" style={styles.addLink}><Glyph name="plus" size={16} color={theme.ink} weight={2.4} /><Text style={[type.button, { color: theme.ink, fontSize: 15 }]}>Add</Text></Tap>}>
          Notes
        </Caps>
        <Plate theme={theme}>
          {visibleNotes.length === 0 ? (
            <View style={styles.empty}>
              <Text style={[type.body, { color: theme.ink }]}>Tag a moment</Text>
              <Small theme={theme}>A hike, a day on the water, or how you feel. The note sits on the chart with the pressure and trend at that moment.</Small>
              <Outline theme={theme} label="Add a note" glyph="tag" onPress={onNote} />
            </View>
          ) : (
            visibleNotes.map((n, i) => <NoteLine key={n.id} theme={theme} n={n} first={i === 0} number={numbered.indexOf(n) + 1} unit={unit} locale={loc} now={now} onLongPress={() => remove(n)} />)
          )}
        </Plate>
        {visibleNotes.length > 0 ? <Small theme={theme} style={{ marginTop: space.s, paddingHorizontal: space.xs }}>Hold a note to delete it.</Small> : null}
      </View>
    </ScrollView>
  );
}

function Stat({ theme, label, value }: { theme: Theme; label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={[type.label, { color: theme.inkSoft, fontSize: 10, letterSpacing: 0.8 }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[type.figure, { color: theme.ink, fontSize: 18, lineHeight: 22 }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function NoteLine({ theme, n, first, number, unit, locale, now, onLongPress }: { theme: Theme; n: Note; first: boolean; number: number; unit: PressureUnit; locale: string; now: number; onLongPress: () => void }) {
  const trend = n.changeHpa == null ? 'No trend then' : `${DIRECTION_WORD[directionOf(n.changeHpa)]}, ${formatChange(n.changeHpa, unit, locale)} ${unit} in 3 hours`;
  return (
    <Tap onLongPress={onLongPress} delayLongPress={450} style={[styles.note, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule }]} pressedStyle={{ backgroundColor: theme.raised }} accessibilityLabel={`${n.label}, ${formatMoment(n.t, now, locale)}, ${n.hpa != null ? `${formatPressure(n.hpa, unit, locale)} ${unit}` : 'no reading'}, ${trend}`} accessibilityHint="Hold to delete">
      <View style={[styles.badge, { backgroundColor: number > 0 ? theme.ink : theme.raised }]}>
        {number > 0 ? <Text style={[type.label, { color: theme.bg, letterSpacing: 0, fontSize: 12 }]}>{String(number)}</Text> : <Glyph name="tag" size={14} color={theme.inkSoft} weight={2} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[type.strong, { color: theme.ink }]} numberOfLines={1}>
          {n.label}
        </Text>
        <Small theme={theme}>{formatMoment(n.t, now, locale)}</Small>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[type.figure, { color: theme.ink, fontSize: 17, lineHeight: 21 }]}>{n.hpa != null ? formatPressure(n.hpa, unit, locale) : '-'}</Text>
        <Small theme={theme} style={{ fontSize: 12 }}>{n.changeHpa == null ? 'No trend then' : `${DIRECTION_WORD[directionOf(n.changeHpa)]} ${formatChange(n.changeHpa, unit, locale)}`}</Small>
      </View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.l, paddingTop: space.s, gap: space.l, paddingBottom: space.xxl },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: 48 },
  chartPlate: { paddingTop: space.m, paddingBottom: space.s },
  sumRow: { flexDirection: 'row', gap: space.s, paddingHorizontal: space.l, paddingBottom: space.s },
  legend: { flexDirection: 'row', alignItems: 'center', gap: space.s, paddingHorizontal: space.l, paddingTop: space.xs },
  swatch: { width: 14, height: 14, borderRadius: 3, borderWidth: 1 },
  empty: { padding: space.l, gap: space.s },
  addLink: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, paddingHorizontal: space.xs },
  note: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 64, paddingHorizontal: space.l, paddingVertical: space.s },
  badge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
