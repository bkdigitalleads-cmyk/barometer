import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useTheme, space } from '../theme';
import { useData } from '../data';
import { useApp } from '../state';
import { canExport, historyStart } from '../gates';
import { rangeMs, type RangeId } from '../chart';
import { paperForRegion } from '../pdf/layout';
import { chartPage, chartPdf, pageKit, type PageKit } from '../pageAssets';
import { csvFileName, readingsCsv } from '../csv';
import { dayKey } from '../rules';
import { printPdf, safeFileName, shareFileAt, writeCsvFile, writePdfFile } from '../exporting';
import { maybeRequestReview } from '../reviews';
import PageView from '../ui/PageView';
import { Action, Caps, Outline, Segments, Small, TopBar } from '../ui/Kit';
import { savedHaptic } from '../ui/motion';

const LABEL: Record<'24h' | '7d' | '30d', string> = { '24h': '24 hours', '7d': '7 days', '30d': '30 days' };

/**
 * Export: a one-page PDF chart for a doctor or a trip log, and a CSV of
 * every reading and note, through the share sheet or Print. Pro.
 */
export default function Export({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const data = useData();
  const { isPro, askPro, say } = useApp();
  const [range, setRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [kit, setKit] = useState<PageKit | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<null | 'pdf' | 'print' | 'csv'>(null);
  const region = data.locale.region;
  const unit = data.prefs.pressureUnit;

  useEffect(() => {
    pageKit().then(setKit, () => setFailed(true));
  }, []);

  const now = Date.now();
  const from = now - rangeMs(range as RangeId);
  const page = useMemo(
    () => (kit ? chartPage(kit, { readings: data.readings, notes: data.notes, range, from, to: now, unit, paper: paperForRegion(region), locale: data.locale.tag }) : null),
    // Laid out again when the range, unit or data change, not every second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kit, range, unit, data.readings, data.notes, region]
  );

  const go = async (how: 'pdf' | 'print' | 'csv') => {
    if (busy) return;
    if (!canExport(isPro) && !(await askPro('export'))) return;
    setBusy(how);
    try {
      if (how === 'csv') {
        const start = historyStart(true, now);
        const uri = writeCsvFile(csvFileName(dayKey(now)), readingsCsv(data.readings.filter((r) => r.t >= start), data.notes, unit));
        await shareFileAt(uri, 'csv', 'Barometer readings');
        say('CSV ready.');
      } else {
        if (!kit || !page) return;
        const bytes = await chartPdf(kit, page);
        const uri = writePdfFile(safeFileName(['Barometer', LABEL[range], dayKey(now)], 'pdf'), bytes);
        if (how === 'print') await printPdf(uri);
        else await shareFileAt(uri, 'pdf', 'Barometer chart');
        say('Chart ready.');
      }
      savedHaptic();
      maybeRequestReview('firstExport');
    } catch (e: any) {
      Alert.alert('The export did not go out', e?.message ?? 'Try once more.');
    } finally {
      setBusy(null);
    }
  };

  const w = width - space.l * 2;
  return (
    <View style={{ flex: 1 }}>
      <TopBar theme={theme} title="Export" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Segments
          theme={theme}
          label="Chart range"
          value={range}
          onChange={setRange}
          options={[
            { id: '24h', label: '24 hours' },
            { id: '7d', label: '7 days' },
            { id: '30d', label: '30 days' },
          ]}
        />
        <View style={[styles.paper, { borderColor: theme.edge }]}>
          {page ? (
            <PageView page={page} width={w} label={`A one-page chart of the last ${LABEL[range]} with the notes`} />
          ) : failed ? (
            <Small theme={theme} style={{ padding: space.l }}>
              The chart could not be drawn. Close the app and open it again.
            </Small>
          ) : (
            <View style={{ width: w, height: w * 1.29, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.paper }}>
              <ActivityIndicator color="#4A5258" />
            </View>
          )}
        </View>
        <Small theme={theme}>{paperForRegion(region) === 'letter' ? 'US Letter' : 'A4'}, one page, in {unit}. Gaps stay empty; nothing is filled in.</Small>
        <Caps theme={theme} style={{ marginTop: space.s }}>
          Spreadsheet
        </Caps>
        <Small theme={theme} style={{ marginTop: -space.s }}>
          Every stored reading and note, with the time, the pressure in hPa{unit !== 'hPa' && unit !== 'mbar' ? ` and ${unit}` : ''}, and whether it came from the app open or the background.
        </Small>
        <Outline theme={theme} label="Share CSV" glyph="file" onPress={() => go('csv')} disabled={busy != null} />
      </ScrollView>
      <View style={[styles.foot, { borderTopColor: theme.rule, backgroundColor: theme.face }]}>
        <Action theme={theme} label="Share PDF" glyph="share" onPress={() => go('pdf')} busy={busy === 'pdf'} disabled={!page} />
        <Outline theme={theme} label="Print" glyph="print" onPress={() => go('print')} disabled={!page || busy != null} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.l, gap: space.m, paddingBottom: space.xl },
  paper: { borderWidth: 1, alignSelf: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  foot: { borderTopWidth: 1, padding: space.l, gap: space.s },
});
