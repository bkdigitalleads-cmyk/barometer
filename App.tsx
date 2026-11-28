import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useTheme, UI_FONT_FILES, space, type } from './src/theme';
import { AppProvider, useApp, ONBOARDED_KEY } from './src/state';
import { kvGet, kvSet, sweepCache } from './src/store';
import { afterOnboardingPaywall, dayKey, fullDayLaunch } from './src/rules';
import { canAddNote } from './src/gates';
import { maybeRequestReview } from './src/reviews';
import { PRIVACY_URL } from './src/links';
import { DataProvider, useData } from './src/data';
import Gauge from './src/screens/Gauge';
import Altimeter from './src/screens/Altimeter';
import History from './src/screens/History';
import Settings from './src/screens/Settings';
import AlertSetting from './src/screens/AlertSetting';
import Export from './src/screens/Export';
import NoteDrawer from './src/screens/NoteDrawer';
import NoSensor from './src/screens/NoSensor';
import PaywallModal from './src/screens/Paywall';
import Intro, { NotifyStep, TrialSteps } from './src/screens/Intro';
import TabBar, { Tab } from './src/ui/TabBar';
import { Action, Drawer, Notice, Small } from './src/ui/Kit';

/** A screen over the tabs. Back pops one. */
type Over = { name: 'alert' } | { name: 'export' };

function Shell() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready, notice, isPro, askPro, say } = useApp();
  const data = useData();
  const [tab, setTab] = useState<Tab>('gauge');
  const [stack, setStack] = useState<Over[]>([]);
  const push = (o: Over) => setStack((s) => [...s, o]);
  const pop = () => setStack((s) => s.slice(0, -1));
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  // New installs: three screens, notifications, the trial and reminder screens, then the paywall.
  const [step, setStep] = useState<'intro' | 'notify' | 'trial' | 'paywall'>('intro');
  // After the onboarding paywall is closed with the X: the small "The barometer is free" sheet.
  const [claim, setClaim] = useState(false);
  const [noting, setNoting] = useState(false);
  const paywallOpened = useRef(false);
  const askedRating = useRef(false);

  useEffect(() => {
    sweepCache();
  }, []);

  useEffect(() => {
    if (!ready || !data.loaded || onboarded !== null) return;
    (async () => {
      if ((await kvGet(ONBOARDED_KEY)) === '1') return setOnboarded(true);
      // Anyone who is Pro, or already has readings, has used the app: no onboarding.
      if (isPro || data.oldestT != null) {
        kvSet(ONBOARDED_KEY, '1').catch(() => {});
        return setOnboarded(true);
      }
      setOnboarded(false);
    })().catch(() => setOnboarded(true)); // fail open: never trap anyone
  }, [ready, data.loaded, onboarded, isPro, data.oldestT]);

  // A returning person: the sensor starts at once (on a first launch, the first intro screen starts it).
  useEffect(() => {
    if (onboarded) data.startSensor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboarded]);

  // The rating ask: a launch on a later day than install, once a full day of readings is stored.
  useEffect(() => {
    if (!onboarded || askedRating.current || !data.loaded) return;
    const now = Date.now();
    if (fullDayLaunch(data.installDay, dayKey(now), data.oldestT, now)) {
      askedRating.current = true;
      maybeRequestReview('fullDay');
    }
  }, [onboarded, data.loaded, data.installDay, data.oldestT]);

  const openOnboardingPaywall = () => {
    if (paywallOpened.current) return;
    paywallOpened.current = true;
    setStep('paywall');
    askPro('pro').then((pro) => {
      if (afterOnboardingPaywall(pro) === 'claim') setTimeout(() => setClaim(true), 450);
      kvSet(ONBOARDED_KEY, '1').catch(() => {});
      setOnboarded(true);
      setTab('gauge');
    });
  };

  /** Add a note: the first is free, the second opens the paywall. */
  const openNote = async () => {
    if (!canAddNote(isPro, data.notes.length) && !(await askPro('note'))) return;
    setNoting(true);
  };

  if (!ready || !data.loaded || onboarded === null) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  if (data.failed) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, padding: space.l, paddingTop: insets.top + space.xxl }}>
        <Text style={[type.title, { color: theme.ink }]}>Your readings did not open.</Text>
        <Text style={[type.body, { color: theme.inkSoft, marginTop: space.s }]}>Close the app and open it again. If it keeps happening, write to support from the App Store page. ({data.failed})</Text>
      </View>
    );
  }
  // A phone or iPad without a pressure sensor: one plain screen, no onboarding and no paywall.
  if (data.sensor === 'missing') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        <NoSensor kind="missing" />
      </View>
    );
  }

  if (!onboarded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        {step === 'intro' && <Intro onDone={() => setStep('notify')} />}
        {step === 'notify' && <NotifyStep onDone={() => setStep('trial')} />}
        {(step === 'trial' || step === 'paywall') && <TrialSteps onDone={openOnboardingPaywall} />}
        <PaywallModal privacyUrl={PRIVACY_URL} onboarding />
      </View>
    );
  }

  const top = stack[stack.length - 1];
  let body: React.ReactNode;
  if (data.sensor === 'silent' && (tab === 'gauge' || tab === 'altimeter') && top == null) body = <NoSensor kind="silent" />;
  else if (top?.name === 'alert') body = <AlertSetting onBack={pop} />;
  else if (top?.name === 'export') body = <Export onBack={pop} />;
  else if (tab === 'gauge') body = <Gauge onNote={openNote} onAltimeter={() => setTab('altimeter')} />;
  else if (tab === 'altimeter') body = <Altimeter />;
  else if (tab === 'history') body = <History onNote={openNote} onExport={() => push({ name: 'export' })} onAlert={() => push({ name: 'alert' })} />;
  else
    body = (
      <Settings
        onAlert={() => push({ name: 'alert' })}
        onExport={() => push({ name: 'export' })}
        onReplayOnboarding={() => {
          paywallOpened.current = false;
          setStep('intro');
          setOnboarded(false);
        }}
      />
    );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1 }}>{body}</View>
      {top == null ? <TabBar theme={theme} tab={tab} onTab={setTab} /> : null}
      <Notice theme={theme} text={notice} top={insets.top} />
      <NoteDrawer
        visible={noting}
        onClose={() => setNoting(false)}
        onSaved={() => {
          setNoting(false);
          say('Note saved.');
        }}
      />
      <PaywallModal privacyUrl={PRIVACY_URL} />
      <Drawer theme={theme} visible={claim} onClose={() => setClaim(false)} title="The barometer is free.">
        <View style={{ gap: space.l, paddingBottom: space.s }}>
          <Small theme={theme} style={{ fontSize: 17, lineHeight: 23 }}>
            The live gauge, the altimeter, every unit and the last 24 hours of history, for as long as you like. Pro adds the week and month, change alerts, notes and export.
          </Small>
          <Action theme={theme} label="Open the gauge" onPress={() => setClaim(false)} />
        </View>
      </Drawer>
    </View>
  );
}

/** Hands Pro and the notice line from the app state to the data layer. */
function WithData({ children }: { children: React.ReactNode }) {
  const { isPro, say } = useApp();
  return (
    <DataProvider isPro={isPro} onAlert={say}>
      {children}
    </DataProvider>
  );
}

/** A failure while a screen renders: shown instead of a frozen screen. Nothing is lost on disk. */
class Guard extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: '#ECEEEA', padding: space.l, paddingTop: 80 }}>
        <Text style={[type.title, { color: '#101418' }]}>Something went wrong on this screen.</Text>
        <Text style={[type.body, { color: '#101418', marginTop: space.s }]}>Close the app and open it again. Your readings and notes are kept.</Text>
        <Text style={{ fontSize: 12, color: '#757E84', marginTop: space.l }}>{error.message}</Text>
      </View>
    );
  }
}

export default function App() {
  const theme = useTheme();
  const [fontsLoaded, fontError] = useFonts({ ...UI_FONT_FILES });
  // If the fonts are still not in after a few seconds, open anyway with the system font.
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGaveUp(true), 6000);
    return () => clearTimeout(t);
  }, []);
  // The background colour while fonts load, so launch never flashes white.
  if (!fontsLoaded && !fontError && !gaveUp) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  return (
    <Guard>
      <SafeAreaProvider>
        <AppProvider>
          <WithData>
            <Shell />
          </WithData>
        </AppProvider>
      </SafeAreaProvider>
    </Guard>
  );
}
