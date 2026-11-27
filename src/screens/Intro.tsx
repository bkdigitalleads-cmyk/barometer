import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, radius, space, Theme, type } from '../theme';
import { getOffering } from '../purchases';
import { getTrialEligibleIds, trialLabel } from '../trial';
import { requestReminderPermission } from '../reminder';
import { trialLength } from '../offer';
import { useData } from '../data';
import { chartData } from '../chart';
import { HOUR } from '../readings';
import { ALERT_TITLE } from '../alerts';
import { formatPressure } from '../units';
import { sampleReadings } from '../sample';
import Chart from '../ui/Chart';
import Dial from '../ui/Dial';
import Glyph from '../ui/Glyph';
import { Action, Plate, Row, Tap } from '../ui/Kit';

/**
 * First launch, in this order (App.tsx runs it):
 *   1-3. three short screens: your phone already measures air pressure;
 *        see when it rises or falls; get a heads-up on a big change
 *   4.   notifications, with the plain reason
 *   a.   TrialSteps "Try it free"             } only when RevenueCat says this
 *   b.   TrialSteps the reminder screen       } Apple ID can get the free trial
 *   then the onboarding paywall (close button after 3 seconds).
 * The first screen starts the sensor, so iOS asks for Motion & Fitness
 * access with the dial in view. Location is not asked here; only on the
 * Altimeter tab.
 */
const PAGES: { title: string; line: string; show: 'dial' | 'chart' | 'alert' }[] = [
  { title: 'Your phone already measures air pressure.', line: 'Barometer reads the sensor inside this iPhone. No internet and no account.', show: 'dial' },
  { title: 'See when it rises or falls.', line: 'Every reading is kept on this iPhone, so the chart shows the last day, week and month.', show: 'chart' },
  { title: 'Get a heads-up on a big change.', line: 'An alert when the pressure rises or falls by the amount you choose within three hours.', show: 'alert' },
];
const DOTS = PAGES.length + 1;

interface TrialOffer {
  length: string;
  then: string;
}

let offerPromise: Promise<TrialOffer | null> | null = null;

async function loadTrialOffer(): Promise<TrialOffer | null> {
  const off = await getOffering();
  const pkg = off?.weekly;
  if (!pkg) return null;
  if (!trialLabel(pkg, await getTrialEligibleIds([pkg]))) return null;
  const length = trialLength(pkg.product.introPrice);
  if (!length) return null;
  return { length, then: `${pkg.product.priceString} a week` };
}

/** Starts the eligibility check early; it is ready long before the trial screen. */
function trialOffer(): Promise<TrialOffer | null> {
  if (!offerPromise) offerPromise = loadTrialOffer().catch(() => null);
  return offerPromise;
}

export default function Intro({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const data = useData();
  const [step, setStep] = useState(0);
  useEffect(() => {
    trialOffer();
    data.startSensor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { width } = useWindowDimensions();
  const next = () => (step < PAGES.length - 1 ? setStep(step + 1) : onDone());
  const p = PAGES[step];
  const w = width - space.l * 2;
  const visual = p.show === 'dial' ? <DialShow theme={theme} size={Math.min(w, 290)} /> : p.show === 'chart' ? <ChartShow theme={theme} width={w} /> : <AlertShow theme={theme} />;
  return <Page key={step} theme={theme} title={p.title} line={p.line} visual={visual} dots={{ count: DOTS, active: step }} button="Continue" onPress={next} />;
}

/** The live dial, as on the gauge. */
function DialShow({ theme, size }: { theme: Theme; size: number }) {
  const data = useData();
  const unit = data.prefs.pressureUnit;
  const hpa = data.live?.hpa ?? null;
  return (
    <View style={{ alignItems: 'center', gap: space.s }}>
      <Dial theme={theme} size={size} style="classic" unit={unit} hpa={hpa} caption="Sensor" />
      <Text style={[type.figure, { color: theme.ink, fontSize: 30, lineHeight: 36 }]}>{hpa != null ? `${formatPressure(hpa, unit, data.locale.tag)} ${unit}` : ' '}</Text>
    </View>
  );
}

/** A made-up day on the chart, with a stretch the app was closed. */
function ChartShow({ theme, width }: { theme: Theme; width: number }) {
  const data = useData();
  const d = useMemo(() => {
    const end = Date.now();
    return chartData(sampleReadings(end, 2), end - 24 * HOUR, end);
  }, []);
  return (
    <Plate theme={theme} style={{ paddingVertical: space.m, alignSelf: 'stretch' }}>
      <Chart theme={theme} data={d} range="24h" unit={data.prefs.pressureUnit} notes={[]} width={width - 2} height={220} locale={data.locale.tag} label="A sample chart of the last 24 hours, with a gap while the app was closed" />
    </Plate>
  );
}

/** What an alert looks like. */
function AlertShow({ theme }: { theme: Theme }) {
  return (
    <View style={{ alignSelf: 'stretch', gap: space.m }} accessible accessibilityLabel="An example alert: Pressure fell 4 hPa in the last 3 hours.">
      <View style={[styles.banner, { backgroundColor: theme.face, borderColor: theme.edge }]}>
        <View style={[styles.appMark, { backgroundColor: theme.bezel }]}>
          <Glyph name="gauge" size={20} color="#FFFFFF" weight={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[type.strong, { color: theme.ink, fontSize: 15 }]}>{ALERT_TITLE}</Text>
          <Text style={[type.small, { color: theme.ink }]}>Pressure fell 4 hPa in the last 3 hours.</Text>
        </View>
      </View>
      <View style={[styles.banner, { backgroundColor: theme.face, borderColor: theme.edge, opacity: 0.6, transform: [{ scale: 0.95 }] }]}>
        <View style={[styles.appMark, { backgroundColor: theme.bezel }]}>
          <Glyph name="gauge" size={20} color="#FFFFFF" weight={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[type.strong, { color: theme.ink, fontSize: 15 }]}>{ALERT_TITLE}</Text>
          <Text style={[type.small, { color: theme.ink }]}>Pressure rose 3 hPa in the last 3 hours.</Text>
        </View>
      </View>
    </View>
  );
}

/** Notifications, with the plain reason. Asked once; either answer goes on. */
export function NotifyStep({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const [waiting, setWaiting] = useState(false);
  return (
    <Page
      theme={theme}
      title="Allow notifications for change alerts."
      line="Barometer sends one only when the pressure rises or falls by the amount you set, and once before a free trial ends. Nothing else."
      dots={{ count: DOTS, active: PAGES.length }}
      button="Allow notifications"
      waiting={waiting}
      visual={
        <View style={[styles.bell, { backgroundColor: theme.face, borderColor: theme.edge }]}>
          <Glyph name="bell" size={56} color={theme.ink} weight={1.8} />
        </View>
      }
      onPress={async () => {
        setWaiting(true);
        await requestReminderPermission();
        setWaiting(false);
        onDone();
      }}
      secondary={{ label: 'Not now', onPress: onDone }}
    />
  );
}

/** The trial and reminder screens. Calls onDone right away when no trial is on offer. */
export function TrialSteps({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const [offer, setOffer] = useState<TrialOffer | null | undefined>(undefined);
  const [step, setStep] = useState<'trial' | 'remind'>('trial');
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    let live = true;
    trialOffer().then((o) => {
      if (!live) return;
      if (o) setOffer(o);
      else onDone();
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!offer) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator color={theme.inkSoft} />
      </View>
    );
  }

  if (step === 'trial') {
    return (
      <Page
        theme={theme}
        title={`Try Pro free for ${offer.length}.`}
        line={`Then ${offer.then}. Cancel in Settings any time before it ends.`}
        button="Try it free"
        onPress={() => setStep('remind')}
        noPayment
        visual={
          <Plate theme={theme} style={{ alignSelf: 'stretch' }}>
            <Row theme={theme} first glyph="check" label="Today" sub="The week and month charts, change alerts, notes on the chart and export." />
            <Row theme={theme} glyph="calendar" label="The day before it ends" sub="One reminder, so nothing surprises you." />
            <Row theme={theme} glyph="star" label={`After ${offer.length}`} sub={`${offer.then[0].toUpperCase()}${offer.then.slice(1)}. Cancel before then and pay nothing.`} />
          </Plate>
        }
      />
    );
  }

  return (
    <Page
      theme={theme}
      title="We’ll remind you the day before it ends."
      line="One reminder. Change alerts are the only other notifications."
      button="Continue"
      waiting={waiting}
      onPress={async () => {
        setWaiting(true);
        await requestReminderPermission();
        setWaiting(false);
        onDone();
      }}
    />
  );
}

/** One idea per screen: the product, one large line, one line under it, the dots and the button. */
function Page({
  theme,
  title,
  line,
  dots,
  button,
  onPress,
  waiting = false,
  noPayment = false,
  visual,
  secondary,
}: {
  theme: Theme;
  title: string;
  line?: string;
  visual?: React.ReactNode;
  dots?: { count: number; active: number };
  button: string;
  onPress: () => void;
  waiting?: boolean;
  noPayment?: boolean;
  secondary?: { label: string; onPress: () => void };
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, space.l) }]}>
      {visual ? <View style={styles.visual}>{visual}</View> : null}
      <View style={visual ? styles.wordsUnder : styles.words}>
        <Text style={[type.title, { color: theme.ink }]} accessibilityRole="header">
          {title}
        </Text>
        {line ? <Text style={[type.body, styles.line, { color: theme.inkSoft }]}>{line}</Text> : null}
      </View>
      {dots && (
        <View style={styles.dots} accessible accessibilityLabel={`Page ${dots.active + 1} of ${dots.count}`}>
          {Array.from({ length: dots.count }, (_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === dots.active ? theme.ink : theme.rule }, i === dots.active && styles.dotOn]} />
          ))}
        </View>
      )}
      <View style={styles.footer}>
        {waiting ? <ActivityIndicator color={theme.inkSoft} style={styles.waiting} /> : <Action theme={theme} label={button} onPress={onPress} />}
        {noPayment && (
          <View style={styles.noPaymentRow}>
            <Glyph name="check" size={18} color={theme.ink} weight={2.4} />
            <Text style={[type.strong, { color: theme.ink }]}>No payment now</Text>
          </View>
        )}
        {secondary ? (
          <Tap onPress={secondary.onPress} accessibilityRole="button" style={styles.skip}>
            <Text style={[type.body, { color: theme.inkSoft, textAlign: 'center' }]}>{secondary.label}</Text>
          </Tap>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  words: { flex: 1, justifyContent: 'center', paddingHorizontal: space.xl },
  visual: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.l, paddingTop: space.l },
  wordsUnder: { paddingHorizontal: space.xl, paddingTop: space.l, paddingBottom: space.l },
  line: { marginTop: space.m },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.s, marginBottom: space.l },
  dot: { width: space.s, height: space.s, borderRadius: radius.pill },
  dotOn: { width: space.xl },
  footer: { paddingHorizontal: space.l, gap: space.s, paddingTop: space.s },
  waiting: { height: 56 },
  skip: { minHeight: 44, justifyContent: 'center' },
  noPaymentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.m, borderRadius: radius.plate + 4, borderWidth: 1, padding: space.m },
  appMark: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  bell: { width: 128, height: 128, borderRadius: 64, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
