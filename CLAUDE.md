@AGENTS.md

# Barometer (barometer)

App #21 in Brian's iOS app portfolio (seller bkdigitalleads-cmyk). Expo SDK 57, React Native 0.86, TypeScript, expo-sensors (the pressure sensor, CMAltimeter, while the app is open), a local Expo Module in Swift for background readings (modules/baro-background), expo-sqlite (readings, notes and settings), expo-location (when in use only, the Altimeter tab), pdf-lib with @pdf-lib/fontkit (the one-page PDF chart), react-native-svg (the dial, the chart, the tape, glyphs, and the on-screen PDF drawn from the same layout), RevenueCat, expo-notifications (local only: the change alert and the trial reminder). Engine forked from Cash Counter (cashcounter main at 84c3ba6, Nov 24, 2026), which came from Estimate Maker, Signature Maker, Migraine Log, Image to Text, Pumping and Odo 1.0.6. The count, till, denomination, deposit and count sheet modules were dropped.

- App Store name: "Barometer: Barometric Pressure". Subtitle "Altimeter, Elevation, hPa". Spanish (Mexico): "Altimeter: My Elevation Now", "Air Pressure Tracker, Gauge". Home screen and in-app name: "Barometer". Category Weather, secondary Utilities. Bundle ID com.bwk.barometer. Expo slug and scheme: barometer. Owner bkdeveloper123. GitHub: bkdigitalleads-cmyk/barometer.
- Placeholders for Cowork (each a `TODO_COWORK_...` string): app.json `extra.revenueCatApiKeyIos` (the public RevenueCat SDK key, starts with `appl_`; until then the app runs with purchases off), app.json `extra.eas.projectId`, eas.json `ascAppId`. The website's App Store button links to apps.apple.com until the app id exists.
- Not in the store yet. 1.0.0 build 1 is on branch claude/barometer-1.0.0 (PR, not merged, never built).
- What it is: a barometer and altimeter that reads the iPhone's own pressure sensor. The live reading on a dial with a three-hour trend, sea level pressure from a known elevation, an altimeter with climb since a reset point, a chart of stored readings with gaps left as gaps, a pressure change alert, notes on the chart, CSV and a one-page PDF. No account, no server.
- Guardrail, always: the app shows what the sensor reads. It is not a weather forecast and never says storm warning, forecast or predict, or anything medical (prevents, treats, predicts migraines). Health words appear only as note labels the person picks (and in the store keyword fields). Location is when in use only, never background, and never leaves the phone. Nothing is uploaded and there are no network calls of the app's own. No brand names anywhere.

## Background readings (read before touching modules/ or src/background.ts)

- Stock Expo cannot do this well: expo-background-task only schedules a BGProcessingTask (network required, 12 hours by default), which iOS runs about once a night. So modules/baro-background registers its own BGAppRefreshTask (com.bwk.barometer.refresh) and a BGProcessingTask without the network requirement (com.bwk.barometer.processing), both in plugins/withBackgroundReadings.js (UIBackgroundModes fetch and processing).
- Each run: one CMAltimeter reading (median of the first three samples, 10 second timeout), kept in UserDefaults for the app, the alert check (BaroAlert.swift, a line-for-line copy of src/alerts.ts `checkAlert`; a test compares their constants), a local notification if it fires, and the next request (15 minutes and 2 hours earliest). No JavaScript runs for it.
- iOS decides how often: often a few times a day for an app opened most days, less for one rarely opened, never after the app is swiped away, with Background App Refresh off, or in Low Power Mode. Every text that mentions it says so plainly. Never promise "every hour" or "around the clock".
- The app moves those readings into SQLite at launch and on every return (src/background.ts `importPending`, parked in the kv table first so a failed write loses nothing), and hands its own last four hours to the module when it goes to the background, so both sides check the same three hours. The alert state (last alert time and direction) is shared, so one change alerts once.
- The Swift module only compiles in Xcode or the EAS build; nothing here can type-check it. Keep changes to it small and read them twice.

## How shipping works (read before every push)

- A push to `main` that touches app.json, eas.json, package*.json, App.tsx, index.ts, src/, assets/ or modules/ starts an EAS workflow (.eas/workflows/deploy.yml) once the Expo project is connected. It builds iOS in the cloud and uploads the build to App Store Connect / TestFlight. Every such push costs a paid build credit. (modules/ is in the filter because the Swift module is app code.)
- Never merge to `main` without Brian. Work on a branch and open a PR.
- Pushes that only change Markdown files (CLAUDE.md, NOTES.md, README.md, store/metadata.md), store/ or docs/ do not build.
- Version numbers are local (`appVersionSource: local`, no auto-increment). Before any push that builds: raise `ios.buildNumber` in app.json by 1, and raise `version` when it will become a new App Store release. A build number that was already used makes the upload fail.
- Before every commit: run `npx tsc --noEmit` and `npm test`, and fix every error.
- Batch the changes for one app into one push. Ask Brian before any push that builds, and say what is in it.
- Submitting for App Review, release dates, prices, the subtitle, keywords, the age rating and screenshots all happen in App Store Connect. Brian and his Cowork session handle that side. Do not try to do it from here.

## Rules

- Brian handles every credential and sign-in. Never type, paste, print or store passwords, tokens or API keys (the RevenueCat key in app.json is the public SDK key and belongs there). If git push asks for credentials, stop and tell Brian.
- No spending (paid services, EAS builds beyond what Brian approved) without Brian saying go.
- Never change the RevenueCat entitlement id `pro`, the offering `default`, the product ids (baro_pro_weekly, baro_pro_yearly, baro_pro_lifetime), the packages ($rc_weekly, $rc_annual, $rc_lifetime) or the logic in src/purchases.ts (a copy of the engine's, with the foreground Pro re-check in state.tsx) without Brian asking. Paying users must never lose Pro. Prices and trial text on screen always come from StoreKit through RevenueCat.
- Free forever (src/gates.ts holds the rules, with checks): the live barometer, the altimeter, every unit, sea level from location, the last 24 hours of history (3 hour and 24 hour charts) and one note. Pro: the 7 and 30 day charts, the change alert, notes on the chart (any number), CSV and PDF export, a typed elevation for sea level, and the Marine and Plain dials. The in-app paywall opens on a locked range, on turning on the alert, on a second note, on export, on a typed elevation, on a dial style, and from Settings. Every reading is stored on both plans; older ones show again with Pro. Never delete what someone made.
- Pressure is kept in hPa and elevation in meters everywhere; units only change what is shown (src/units.ts). The atmosphere math is in src/atmosphere.ts, the trend in src/readings.ts, gaps in src/chart.ts, the alert in src/alerts.ts, all unit-tested. Do not do this math anywhere else.
- The trend rule: the change from the stored reading nearest three hours before (between 1 and 3.5 hours back); under 1 hPa is Steady. The alert: at least the chosen amount (2 to 6 hPa) within three hours, never above 15 hPa (that is the phone going up or down), once per change. Change these only with Brian, and change BaroAlert.swift with alerts.ts.
- The database only ever gains migrations (src/db/schema.ts `MIGRATIONS`). Never edit or reorder a shipped migration; add a new one. Old rows must still read.
- Do not change the app name, subtitle, keywords or the rating-prompt triggers (a later-day launch once a full day of history exists, or the first export; at most one per launch, each once ever) without asking.
- Keep changes small. Fix what the task needs and tidy only the files you already touch. List anything else you notice in NOTES.md under "Noticed, not changed" instead of fixing it. No broad refactors, dependency upgrades or Expo SDK upgrades unless Brian asks.
- Copy voice: plain, short. No "Unlock", "Premium", "Seamless", "Effortless", "Welcome", "Let's", exclamation marks or em dashes in any user-facing text (app, notifications, PDFs, store text, website), in commits or pull requests. Examples: "Falling, 3.1 hPa in 3 hours", "No readings while the app was closed.", "Pressure fell 4 hPa in the last 3 hours." Support email bkdigitalleads@gmail.com only.
- Design (docs/design/NOTES.md) uses the theme's tokens, never ad hoc values. The accent (sea-glass teal) is on the hand, the chart line and the main button only. Glyphs are drawn in src/ui/Glyph.tsx. No icon pack.
- Fonts: only SIL OFL fonts, each with its licence in assets/fonts. Archivo Tab is Archivo with its tabular figures made the default by store/tabular-fonts.py (sources in store/fonts-src).
- plugins/withoutPushEntitlement.js stays last in app.json plugins. After touching plugins, check `npx expo config --type introspect` still shows `ios.entitlements` as `{}`, only NSMotionUsageDescription and NSLocationWhenInUseUsageDescription as usage strings (no Always location), and UIBackgroundModes fetch and processing only.
- Readings stay on the device unless the person shares a PDF or a CSV. Never add analytics, a server, sync or a network call.

## Logging (so Brian's Cowork session can follow along)

- With every commit, add an entry at the top of NOTES.md in the same commit: date, version/build, what changed and why, and how it was checked.

## Testing

- Type check: `npx tsc --noEmit`. Unit checks: `npm test`. Bundle check: `npx expo export --platform ios`. Config: `npx expo config --type introspect`.
- Pure logic has no React or native imports (it imports with a `.ts` extension so Node runs it directly), so `npm test` checks exactly what the app runs.
- Icon concepts: `node store/icon.js options` (uses the preinstalled Playwright and Chromium); `node store/icon.js` writes the shipped icon files from `CHOSEN` (null: a plain stand-in tile until Brian picks).
- Simulator (needs Xcode): Expo Go does not work (RevenueCat and the Swift module need a development build). The simulator has no pressure sensor (the app shows the no-sensor screen) and does not run background tasks.
- Real-device check: TestFlight build from the EAS workflow, on Brian's iPhone. NOTES.md has the TestFlight checklist.
