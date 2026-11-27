// Checks for the engine, the config, the copy and review-safety rules, the
// Swift alert rule against the TypeScript one, the store text and the site.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';

const O = await import('../src/offer.ts');
const AL = await import('../src/alerts.ts');

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(`${ROOT}${f}`, 'utf8');

function walk(dir, ext) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = `${dir}/${f}`;
    if (f === 'node_modules' || f === '.git') return [];
    return statSync(p).isDirectory() ? walk(p, ext) : ext.some((e) => p.endsWith(e)) ? [p] : [];
  });
}

/** Every string a person can see: app source, the Swift module, store text and the website. */
/** The rule lines that quote the banned words, so they are not counted as using them. */
const RULES = /^(Everything here is pasted|- Guardrail|- Copy voice).*$/gm;

function visibleSources() {
  return [
    ...walk(`${ROOT}src`, ['.ts', '.tsx']),
    `${ROOT}App.tsx`,
    `${ROOT}index.ts`,
    ...walk(`${ROOT}modules`, ['.swift']),
    `${ROOT}store/metadata.md`,
    ...walk(`${ROOT}docs`, ['.html']),
  ];
}

// ---------- engine ----------

test('trial and plans (engine copy): three rows, weekly first and preselected, disclosure has every price', () => {
  assert.equal(O.trialLabelFrom({ price: 0, periodNumberOfUnits: 3, periodUnit: 'DAY' }, true), '3 days free');
  assert.deepEqual(O.planOrder(true), ['WEEKLY', 'ANNUAL', 'LIFETIME']);
  assert.equal(O.preselect(['LIFETIME', 'ANNUAL', 'WEEKLY'], false), 'WEEKLY');
  const d = O.disclosureText({ weekly: '$3.99', yearly: '$19.99', lifetime: '$29.99', trial: '3 days free' });
  assert.match(d, /Weekly \$3\.99\/week .*3 days free/);
  assert.match(d, /Lifetime \$29\.99 is a one-time purchase/);
});

test('purchases.ts is the engine copy; the foreground Pro re-check never takes Pro away on an error', () => {
  const p = read('src/purchases.ts');
  assert.match(p, /export const ENTITLEMENT_ID = 'pro';/);
  assert.match(p, /!apiKey\.startsWith\('appl_'\)/);
  assert.match(p, /offerings\.current/);
  const st = read('src/state.tsx');
  assert.match(st, /checkPro\(\)\.then\(\(v\) => \{\s*if \(v !== null\) setStorePro\(v\);/);
  assert.match(st, /onProChange\(/);
});

test('the hidden test menu: seven taps on the version line, test builds only (TestFlight receipt, development, or sandbox Pro)', () => {
  const s = read('src/screens/Settings.tsx');
  assert.match(s, /testBuild && taps >= 7/);
  assert.match(s, /if \(!testBuild\) return;/);
  assert.match(read('src/state.tsx'), /const testBuild = __DEV__ \|\| isTestBuildNative\(\) \|\| sandbox;/);
  assert.match(read('modules/baro-background/ios/BaroBackgroundModule.swift'), /lastPathComponent == "sandboxReceipt"/);
});

test('the paywall opens on a locked range, the alert, a second note, export, a typed elevation, a dial, and from Settings; restore on every paywall', () => {
  assert.match(read('src/screens/History.tsx'), /askPro\('range'\)/);
  assert.match(read('src/screens/AlertSetting.tsx'), /askPro\('alert'\)/);
  assert.match(read('App.tsx'), /canAddNote\(isPro, data\.notes\.length\) && !\(await askPro\('note'\)\)/);
  assert.match(read('src/screens/Export.tsx'), /askPro\('export'\)/);
  assert.match(read('src/screens/Settings.tsx'), /askPro\('calibrate'\)/);
  assert.match(read('src/screens/Settings.tsx'), /askPro\('dial'\)/);
  assert.match(read('src/screens/Settings.tsx'), /askPro\('pro'\)/);
  const pw = read('src/screens/Paywall.tsx');
  assert.match(pw, /Restore purchases/);
  assert.match(pw, /ONBOARDING_CLOSE_DELAY_MS = 3000/);
  for (const r of ['range', 'alert', 'note', 'export', 'calibrate', 'dial', 'pro']) assert.match(pw, new RegExp(`\\b${r}: \\{ title:`));
});

test('rating: once per launch; triggers are a full day of history on a later day, and the first export', () => {
  assert.match(read('App.tsx'), /maybeRequestReview\('fullDay'\)/);
  assert.match(read('src/screens/Export.tsx'), /maybeRequestReview\('firstExport'\)/);
  assert.match(read('src/reviews.ts'), /if \(launchState !== 'idle'\) return;/);
});

// ---------- the background module ----------

test('the Swift alert rule is the TypeScript one: same window, same cap, same once-per-change test', () => {
  const sw = read('modules/baro-background/ios/BaroAlert.swift');
  assert.match(sw, new RegExp(`windowMs: Double = 3 \\* 60 \\* 60 \\* 1000`));
  assert.equal(AL.ALERT_WINDOW_MS, 3 * 60 * 60 * 1000);
  assert.match(sw, new RegExp(`ignoreAboveHpa: Double = ${AL.ALERT_IGNORE_ABOVE_HPA}\\b`));
  assert.match(sw, /lastDir == "fall" && lastAt != nil && r\.t < lastAt!/);
  assert.match(read('src/alerts.ts'), /state\.lastDir === 'fall' && state\.lastAt != null && r\.t < state\.lastAt/);
  assert.match(sw, /x >= thresholdHpa - 1e-9 && x <= ignoreAboveHpa/);
  assert.match(read('src/alerts.ts'), /x >= thresholdHpa - 1e-9 && x <= ALERT_IGNORE_ABOVE_HPA/);
  assert.match(sw, /Pressure \\\(hit\.dir == "fall" \? "fell" : "rose"\) \\\(amount\) \\\(unit\) in the last 3 hours\./);
});

test('the background module: an app refresh task and a processing task without network, registered at launch, rescheduled each run, no location', () => {
  const bg = read('modules/baro-background/ios/BaroBackground.swift');
  assert.match(bg, /BGAppRefreshTaskRequest\(identifier: refreshId\)/);
  assert.match(bg, /processing\.requiresNetworkConnectivity = false/);
  assert.match(bg, /static let refreshId = "com\.bwk\.barometer\.refresh"/);
  assert.match(bg, /static let processingId = "com\.bwk\.barometer\.processing"/);
  assert.match(bg, /schedule\(\)\n\s+let reader = BaroReader\(\)/, 'the next run is asked for first');
  assert.match(read('modules/baro-background/ios/BaroAppDelegateSubscriber.swift'), /didFinishLaunchingWithOptions[\s\S]*BaroBackground\.register\(\)/);
  const all = walk(`${ROOT}modules`, ['.swift']).map((f) => readFileSync(f, 'utf8')).join('\n');
  assert.doesNotMatch(all, /CoreLocation|CLLocation|URLSession|http/);
  const plugin = read('plugins/withBackgroundReadings.js');
  assert.match(plugin, /com\.bwk\.barometer\.refresh/);
  assert.match(plugin, /com\.bwk\.barometer\.processing/);
  assert.match(read('modules/baro-background/expo-module.config.json'), /BaroAppDelegateSubscriber/);
});

// ---------- config ----------

test('app.json: identity, iPhone only, plugins (background readings, push entitlement last), only the two usage strings, the store values from Cowork', () => {
  const app = JSON.parse(read('app.json')).expo;
  assert.equal(app.name, 'Barometer');
  assert.equal(app.slug, 'barometer');
  assert.equal(app.ios.bundleIdentifier, 'com.bwk.barometer');
  assert.equal(app.version, '1.0.0');
  assert.equal(app.ios.buildNumber, '1');
  assert.equal(app.ios.supportsTablet, false);
  assert.equal(app.owner, 'bkdeveloper123');
  assert.equal(app.ios.infoPlist.LSApplicationCategoryType, 'public.app-category.weather');
  assert.equal(JSON.parse(read('package.json')).version, app.version);
  assert.equal(app.plugins[app.plugins.length - 1], './plugins/withoutPushEntitlement');
  assert.equal(app.plugins[app.plugins.length - 2], './plugins/withBackgroundReadings');
  const loc = app.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-location')[1];
  assert.equal(loc.locationAlwaysAndWhenInUsePermission, false);
  assert.equal(loc.locationAlwaysPermission, false);
  assert.equal(loc.isIosBackgroundLocationEnabled, false);
  assert.ok(!/Camera|Microphone|Contacts|Photo|image-picker|expo-camera|background-task/i.test(JSON.stringify(app)));
  // From Cowork, Nov 27: the public RevenueCat SDK key. The Expo project id comes later.
  assert.equal(app.extra.revenueCatApiKeyIos, 'appl_vsUTOQSBmWxAOEuwbshqWvuMqdC');
  assert.match(app.extra.revenueCatApiKeyIos, /^appl_/);
  // Expo project bkdeveloper123/barometer, from Cowork, Nov 27.
  assert.equal(app.extra.eas.projectId, 'e34c37bf-76bb-4de5-a5da-1c98131c247e');
  const eas = JSON.parse(read('eas.json'));
  assert.equal(eas.cli.appVersionSource, 'local');
  assert.equal(eas.build.production.autoIncrement, false);
  assert.equal(eas.submit.production.ios.ascAppId, '6840171467');
  assert.match(read('docs/index.html'), /href="https:\/\/apps\.apple\.com\/app\/id6840171467"/);
  const deploy = read('.eas/workflows/deploy.yml');
  for (const p of ['app.json', 'src/**', 'assets/**', 'modules/**']) assert.ok(deploy.includes(`'${p}'`));
});

test('placeholders: none left anywhere in the repo (app, modules, plugins, docs, store, notes, tests, workflows)', () => {
  const mark = new RegExp(['TODO', 'COWORK'].join('_'));
  const files = [
    ...['app.json', 'eas.json', 'package.json', 'App.tsx', 'index.ts', 'CLAUDE.md', 'NOTES.md', 'README.md', 'AGENTS.md'].map((f) => `${ROOT}${f}`),
    ...walk(`${ROOT}src`, ['.ts', '.tsx']),
    ...walk(`${ROOT}modules`, ['.ts', '.swift', '.json', '.podspec']),
    ...walk(`${ROOT}plugins`, ['.js']),
    ...walk(`${ROOT}docs`, ['.html', '.md', '.xml', '.txt']),
    ...walk(`${ROOT}store`, ['.md', '.js', '.py']),
    ...walk(`${ROOT}tests`, ['.mjs']),
    ...walk(`${ROOT}.eas`, ['.yml']),
  ];
  for (const f of files) assert.doesNotMatch(readFileSync(f, 'utf8'), mark, f);
});

test('products: ids, packages, entitlement and offering as briefed', () => {
  const m = read('store/metadata.md');
  for (const s of ['baro_pro_weekly', 'baro_pro_yearly', 'baro_pro_lifetime', '$rc_weekly', '$rc_annual', '$rc_lifetime', 'entitlement `pro`', 'offering `default`']) assert.ok(m.includes(s), s);
});

test('no network calls of the app\'s own: no fetch, XMLHttpRequest or WebSocket in the app source; no analytics', () => {
  for (const f of [...walk(`${ROOT}src`, ['.ts', '.tsx']), `${ROOT}App.tsx`]) {
    const s = readFileSync(f, 'utf8');
    assert.doesNotMatch(s, /\bfetch\(|XMLHttpRequest|WebSocket|analytics|firebase|amplitude|mixpanel|sentry/i, f);
  }
  const pkg = JSON.parse(read('package.json'));
  for (const d of Object.keys(pkg.dependencies)) assert.doesNotMatch(d, /analytics|firebase|sentry|amplitude|mixpanel|expo-background-task|expo-task-manager/);
});

// ---------- copy and review safety ----------

test('copy voice: no banned words, exclamation marks or em dashes in anything a person sees', () => {
  const banned = new RegExp(`\\b(Unlock|Premium|Seamless|Effortless|${['Wel', 'come'].join('')}|Let's)\\b`);
  for (const f of visibleSources()) {
    const s = readFileSync(f, 'utf8');
    assert.ok(!s.includes('—'), `em dash in ${f}`);
    // Strings only: quoted text in code, all of Markdown and HTML.
    const strings = f.endsWith('.md') || f.endsWith('.html') ? [s.replace(RULES, '')] : s.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`|>[^<>{}\n]+</g) ?? [];
    for (const t of strings) {
      assert.doesNotMatch(t, banned, `${f}: ${t}`);
      assert.doesNotMatch(t.replace(/!==?|!\w|\w!|<!|!\[|!\(/g, ''), /[A-Za-z.] *!(\s|'|"|`|<|$)/, `exclamation mark in ${f}: ${t}`);
    }
  }
});

test('review safety: never storm warning, forecast or predict; nothing medical; no brand names', () => {
  for (const f of visibleSources()) {
    const s = readFileSync(f, 'utf8');
    const strings = f.endsWith('.md') || f.endsWith('.html') ? [s.replace(RULES, '')] : s.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`|>[^<>{}\n]+</g) ?? [];
    for (const t of strings) {
      assert.doesNotMatch(t, /storm warning|\bpredict|\bprevents?\b|\btreats?\b|diagnos|\bcures?\b/i, `${f}: ${t.slice(0, 80)}`);
      assert.doesNotMatch(t, /\bforecast/i, `${f}: ${t.slice(0, 80)}`);
      assert.doesNotMatch(t, /Apple Watch|Garmin|Weather Channel|AccuWeather|Google|iCloud/i, `${f}: ${t.slice(0, 80)}`);
    }
  }
});

test('health words appear in the app only as the note labels a person picks', () => {
  for (const f of [...walk(`${ROOT}src`, ['.ts', '.tsx']), `${ROOT}App.tsx`]) {
    if (f.endsWith('src/notes.ts') || f.endsWith('src/sample.ts')) continue;
    const s = readFileSync(f, 'utf8');
    const strings = s.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`|>[^<>{}\n]+</g) ?? [];
    for (const t of strings) assert.doesNotMatch(t, /headache|migraine|sinus|joint pain|arthritis/i, `${f}: ${t}`);
  }
  assert.match(read('src/notes.ts'), /PRESET_LABELS = \['Headache', 'Joint pain', 'Fishing', 'Hike'\]/);
});

test('the words the brief asks for: the trend, the gap and the alert', () => {
  assert.match(read('src/readings.ts'), /`\$\{DIRECTION_WORD\[trend\.direction\]\}, \$\{formatChange/);
  assert.match(read('src/chart.ts'), /GAP_TEXT = 'No readings while the app was closed\.'/);
  assert.match(read('src/alerts.ts'), /in the last 3 hours\./);
  assert.match(read('src/screens/AlertSetting.tsx'), /ALERT_TIMING_TEXT/);
});

// ---------- store text ----------

const section = (m, head) => {
  const i = m.indexOf(`## ${head}`);
  return m.slice(m.indexOf('\n', i) + 1).split('\n')[0];
};

test('store: names, subtitles and keywords within the limits, no word of the name or subtitle in the keywords', () => {
  const m = read('store/metadata.md');
  const name = section(m, 'Name');
  const sub = section(m, 'Subtitle');
  const kw = section(m, 'Keywords, English');
  assert.equal(name, 'Barometer: Barometric Pressure');
  assert.equal(sub, 'Altimeter, Elevation, hPa');
  assert.equal(kw, 'my,altitude,air,atmospheric,tracker,free,gauge,mbar,inhg,weather,fishing,headache,migraine,sinus,log');
  assert.ok(name.length <= 30 && sub.length <= 30);
  assert.ok(Buffer.byteLength(kw) <= 100);
  const taken = new Set(`${name} ${sub}`.toLowerCase().split(/[^a-z]+/).filter(Boolean));
  for (const w of kw.split(',')) assert.ok(!taken.has(w), w);
  assert.equal(new Set(kw.split(',')).size, kw.split(',').length);
  const es = m.slice(m.indexOf('## Spanish (Mexico)'));
  const esName = es.match(/Name \(\d+\/30\): (.*)/)[1];
  const esSub = es.match(/Subtitle \(\d+\/30\): (.*)/)[1];
  const esKw = es.match(/Keywords \(\d+\/100\): (.*)/)[1];
  assert.equal(esName, 'Altimeter: My Elevation Now');
  assert.equal(esSub, 'Air Pressure Tracker, Gauge');
  assert.ok(esName.length <= 30 && esSub.length <= 30 && Buffer.byteLength(esKw) <= 100, `${Buffer.byteLength(esKw)}`);
  for (const [label, text] of [['Name', name], ['Subtitle', sub]]) assert.ok(m.includes(`## ${label} (${text.length}/30)`));
  assert.ok(m.includes(`(${Buffer.byteLength(kw)}/100)`));
  assert.ok(es.includes(`Keywords (${Buffer.byteLength(esKw)}/100)`));
  const promo = section(m, 'Promotional text');
  assert.ok(promo.length <= 170);
  assert.ok(m.includes(`## Promotional text (${promo.length}/170)`));
});

test('store: description leads with outcomes; category Weather and Utilities; privacy label Purchases only; 4+; six screenshots', () => {
  const m = read('store/metadata.md');
  for (const s of ['The air pressure where you are, right now', 'rising, steady or falling', 'without signal', 'last day, week and month', 'A heads-up on a big change', 'Works offline; nothing leaves the phone']) assert.ok(m.includes(s), s);
  assert.match(m, /Primary: Weather\. Secondary: Utilities\./);
  assert.match(m, /Purchases \(Purchase History\), used for App Functionality, not linked to the user's identity, not used for tracking\./);
  assert.match(m, /^4\+/m);
  const shots = m.slice(m.indexOf('## Screenshots')).split('\n').filter((l) => /^\d\. /.test(l));
  assert.equal(shots.length, 6);
  for (const k of ['gauge', 'chart', 'altimeter', 'alert', 'notes', 'export']) assert.ok(shots.some((l) => l.toLowerCase().includes(k)), k);
  const review = m.slice(m.indexOf('## App Review note'), m.indexOf('## Screenshots'));
  for (const s of ['Free:', 'Pro adds', 'close button', 'no account', 'Location (when in use only)', 'Notifications are used only', 'Background readings', 'How to test']) assert.ok(review.toLowerCase().includes(s.toLowerCase()), s);
});

// ---------- site and design ----------

test('website: landing, privacy, support with an FAQ, sitemap and robots; the support email only', () => {
  for (const f of ['index.html', 'privacy.html', 'support.html', 'sitemap.xml', 'robots.txt', 'style.css', 'og-image.png', 'icon-512.png']) assert.ok(existsSync(`${ROOT}docs/${f}`), f);
  const sup = read('docs/support.html');
  assert.match(sup, /FAQPage/);
  assert.ok((sup.match(/<details>/g) ?? []).length >= 10);
  for (const f of ['index.html', 'privacy.html', 'support.html']) {
    const emails = read(`docs/${f}`).match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? [];
    for (const e of emails) assert.equal(e, 'bkdigitalleads@gmail.com');
    for (const img of read(`docs/${f}`).match(/src="([^"]+)"/g) ?? []) assert.ok(existsSync(`${ROOT}docs/${img.slice(5, -1)}`), img);
  }
  assert.match(read('docs/privacy.html'), /Purchases, not linked to you, not used for tracking/);
  assert.match(read('docs/robots.txt'), /barometer\/sitemap\.xml/);
});

test('design: every brief screen rendered at 393x852 points (2x), light and dark; three icon options, Ridge picked', () => {
  const need = ['01-gauge', '02-altimeter', '03-chart-24h', '04-chart-7d', '05-note-add', '06-notes', '07-alert', '08-export', '09-paywall-onboarding', '10-paywall-in-app', '11-settings', '12-onboarding-1', '13-onboarding-2', '14-onboarding-3', '15-notifications'];
  for (const n of need)
    for (const s of ['light', 'dark']) {
      const f = `${ROOT}docs/design/after/${n}-${s}.png`;
      assert.ok(existsSync(f), f);
      const b = readFileSync(f);
      assert.equal(b.readUInt32BE(16), 786);
      assert.equal(b.readUInt32BE(20), 1704);
    }
  assert.ok(existsSync(`${ROOT}docs/design/icon-options.png`));
  assert.match(read('store/icon.js'), /const CHOSEN = 'ridge';/);
  assert.match(read('docs/design/NOTES.md'), /\*\*Chosen \(Nov 27, 2026\): 3, Ridge\.\*\*/);
});

test('icon: the shipped files are Ridge, 1024 square RGB with no alpha, the fog tile; the adaptive background matches; the site logo has clear corners', () => {
  const b = readFileSync(`${ROOT}assets/icon.png`);
  assert.equal(b.readUInt32BE(16), 1024);
  assert.equal(b.readUInt32BE(20), 1024);
  assert.equal(b[24], 8);
  assert.equal(b[25], 2, 'RGB, no alpha channel');
  const app = JSON.parse(read('app.json')).expo;
  assert.equal(app.android.adaptiveIcon.backgroundColor, '#ECEEEA');
  assert.match(read('store/icon.js'), /ridge: \(\) => `\n\s+<rect width="1024" height="1024" fill="#ECEEEA"\/>/);
  const logo = readFileSync(`${ROOT}docs/icon-512.png`);
  assert.equal(logo[25], 6, 'the website logo keeps an alpha channel for its rounded corners');
  assert.match(read('docs/index.html'), /alt="Barometer app icon: a dial over a mountain ridge/);
});

test('fonts: only SIL OFL, with the licence; Archivo Tab digits are all one width', async () => {
  assert.match(read('assets/fonts/OFL-Archivo.txt'), /SIL Open Font License/);
  const fonts = readdirSync(`${ROOT}assets/fonts`).filter((f) => f.endsWith('.ttf'));
  assert.deepEqual(fonts.sort(), ['ArchivoTab-Bold.ttf', 'ArchivoTab-Medium.ttf', 'ArchivoTab-Regular.ttf', 'ArchivoTab-SemiBold.ttf']);
  const fontkit = (await import('@pdf-lib/fontkit')).default;
  for (const f of fonts) {
    const font = fontkit.create(readFileSync(`${ROOT}assets/fonts/${f}`));
    const widths = new Set('0123456789'.split('').map((d) => font.layout(d).glyphs[0].advanceWidth));
    assert.equal(widths.size, 1, f);
  }
});
