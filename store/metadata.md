# Barometer, App Store metadata (1.0.0)

Everything here is pasted into App Store Connect by Brian and Cowork. No em dashes anywhere, no brand names, no "Unlock", "Premium", "Seamless", "Effortless", "Welcome", "Let's" or exclamation marks. Never "storm warning", "forecast" or "predict", and nothing medical (no "prevents", "treats" or "predicts migraines"); health words appear only as note labels a person picks, and in the keyword fields.

App record: bundle id com.bwk.barometer, SKU barometer, ASC app id 6840171467 (eas.json `ascAppId`). RevenueCat public iOS key in app.json `extra.revenueCatApiKeyIos` (from Cowork, Nov 27, 2026). Still a placeholder: app.json `extra.eas.projectId` (Expo project bkdeveloper123/barometer), a `TODO_COWORK_...` string until Cowork sends it.

## Name (30/30)
Barometer: Barometric Pressure

Home screen name and in-app name (app.json `name`): Barometer.

## Subtitle (25/30)
Altimeter, Elevation, hPa

## Keywords, English (U.S.) (100/100)
my,altitude,air,atmospheric,tracker,free,gauge,mbar,inhg,weather,fishing,headache,migraine,sinus,log

Rule: no word from the name or the subtitle (barometer, barometric, pressure, altimeter, elevation, hpa), no repeats, no brand names. With the name and subtitle Apple can form: barometer, altimeter, altimeter free, elevation, my elevation, barometric pressure, air pressure, pressure tracker, pressure gauge, hpa, atmospheric pressure, barometer for fishing, headache tracker, migraine weather, pressure log.

## Spanish (Mexico) listing (indexed for US search)
Name (27/30): Altimeter: My Elevation Now
Subtitle (27/30): Air Pressure Tracker, Gauge
Keywords (98/100): barometer,barometric,altitude,atmospheric,mbar,weather,fishing,hiking,headache,migraine,joint,pain

As briefed the keyword list was 107 bytes, over the 100 limit. `hpa` and `inhg` were dropped because both are already indexed from the English listing (the subtitle and the keywords). Several more words repeat the English keywords (altitude, atmospheric, mbar, weather, fishing, headache, migraine); swapping them for new words would widen the reach. Kept as briefed apart from the two (Brian's decision, Nov 27, 2026).

Promotional text (es-MX): same as English. Description (es-MX): the English description; the app's own text is in English.

## Promotional text (156/170)
See the air pressure where you are, whether it is rising or falling, and your elevation without signal. A chart of the last day, week and month. No account.

## Description
The air pressure where you are, right now. Your iPhone already has a pressure sensor; Barometer shows it on a clear dial, tells you whether it is rising or falling, and keeps a record you can look back on.

WHAT YOU GET
• The air pressure where you are, right now, from your iPhone's own sensor
• Whether it is rising, steady or falling, with the change over the last three hours
• Your elevation and how far you have climbed, without signal
• A chart of the last day, week and month, with gaps left as gaps
• A heads-up on a big change: an alert when the pressure rises or falls by the amount you choose
• Works offline; nothing leaves the phone

THE GAUGE
• One large number and a dial that would look right on a boat or a wall
• A second hand on the reading three hours ago, like a classic barometer
• hPa, mbar, inHg, mmHg, kPa or psi
• What the sensor reads, or adjusted to sea level with your elevation; the screen always says which

THE ALTIMETER
• Elevation in feet or meters, from your location once or from pressure alone
• Tap Reset at the bottom of the stairs or the start of a trail and see the climb or drop since
• Location is asked only here, only while you use the app, and stays on the phone

HISTORY AND NOTES
• A reading every five minutes while the app is open, and one each time iOS lets the app check in the background
• Charts for 3 hours, 24 hours, 7 days and 30 days
• Tag a moment, like Headache, Joint pain, Fishing, Hike or your own label, and it sits on the chart with the pressure and trend
• Export a one-page PDF chart for a doctor or a trip log, and a CSV of every reading and note

HOW BACKGROUND READINGS WORK
iOS decides when the app may check in the background, often a few times a day. Gaps are normal and show as gaps. Swiping the app away, Low Power Mode or turning off Background App Refresh stops the background checks, and the change alert can come late.

PRIVATE
• No account, no sign-in, no cloud
• Readings, notes and your elevation stay on your iPhone

Barometer shows what your iPhone's pressure sensor reads. It is a gauge and a record, not a weather service.

BAROMETER PRO
Free forever: the live barometer, the altimeter, every unit and the last 24 hours of history. Pro adds the 7 and 30 day charts, change alerts, notes on the chart, PDF and CSV export, sea level from a typed elevation, and the dial styles: weekly with a free trial for new subscribers, yearly, or lifetime with one payment.

Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://bkdigitalleads-cmyk.github.io/barometer/privacy.html

## What's New (1.0.0)
First version. The air pressure from your iPhone's own sensor on a clear dial, rising or falling, your elevation without signal, and a chart of the last day.

## Category
Primary: Weather. Secondary: Utilities.

## Age rating
4+. Every content question is None.

## App Privacy (nutrition label)
Purchases (Purchase History), used for App Functionality, not linked to the user's identity, not used for tracking. RevenueCat keeps the purchase history under an anonymous app user id to confirm Pro. Nothing else is collected: readings, notes and the elevation stay in SQLite on the device. No account, no analytics, no network calls of the app's own. The privacy page says exactly this.

Permissions: Motion & Fitness (the pressure sensor, asked when the first onboarding screen starts it); notifications (the change alert and the trial reminder, asked on the onboarding notifications screen); location while using the app (only on the Altimeter tab, only on tapping Use my location). No camera, microphone, contacts, photos or background location. Background modes: fetch and processing (Background App Refresh), for one pressure reading per run.

## Pricing and RevenueCat
- Subscription group "Barometer Pro".
- `baro_pro_weekly`: auto-renewing weekly, with a free trial (introductory offer). RevenueCat package `$rc_weekly`. Listed first and preselected on both paywalls.
- `baro_pro_yearly`: auto-renewing yearly. RevenueCat package `$rc_annual`.
- `baro_pro_lifetime`: non-consumable, one time. RevenueCat package `$rc_lifetime`.
- RevenueCat: entitlement `pro` (attach all three products), offering `default` with the three packages.
- Prices and trial text in the app always come from StoreKit through RevenueCat. Prices are Brian's to set; the design renders use made-up prices ($3.99 a week with 3 days free, $19.99 a year, $29.99 once).

## App Review contact and support
- Support URL: https://bkdigitalleads-cmyk.github.io/barometer/support.html
- Marketing URL: https://bkdigitalleads-cmyk.github.io/barometer/
- Privacy Policy URL: https://bkdigitalleads-cmyk.github.io/barometer/privacy.html
- Contact email: bkdigitalleads@gmail.com. Settings in the app has "Email support", which opens Mail with the subject "Barometer support".

## App Review note (paste into ASC, Notes)
Barometer reads the iPhone's built-in pressure sensor (CMAltimeter, through Motion & Fitness) and shows the reading, whether it rose or fell over three hours, the elevation, and a chart of stored readings. It shows what the sensor reads; it is not a weather service and makes no health claims. There is no account, sign-in or server, and the app makes no network calls of its own (RevenueCat confirms purchases). Readings and notes are stored in SQLite on the device and leave it only when the user shares or prints a PDF or CSV.

Free: the live barometer, the altimeter, all units, sea level pressure from the device's location, and the last 24 hours of history (the 3 hour and 24 hour charts), plus one note. Pro adds the 7 and 30 day charts, the pressure change alert, notes on the chart, PDF and CSV export, sea level from a typed elevation, and two more dial styles. The in-app paywall opens on a locked chart range (7D or 30D in History), on turning on the alert, on a second note, on export, on a typed elevation, on a dial style, and from Settings. Restore purchases is on both paywalls and in Settings.

First launch: three short screens (the first one starts the sensor, so iOS asks for Motion & Fitness access), then a notifications screen with Allow notifications and Not now, then, if the Apple ID can still get the free trial, two screens about the trial and its reminder, then the paywall. Its close button (X, top right) appears after 3 seconds; closing it shows a short sheet ("The barometer is free.") and the app opens on the gauge.

Why each permission: Motion & Fitness is how iOS gives apps the pressure sensor. Notifications are used only for the change alert the user turns on and one reminder before a free trial ends. Location (when in use only) is asked only on the Altimeter tab when the user taps Use my location, to get a starting elevation once; it is never used in the background and never leaves the device; the app works with it denied.

Background readings: the app registers a BGAppRefreshTask (com.bwk.barometer.refresh) and a BGProcessingTask (com.bwk.barometer.processing). When iOS runs either, the app takes one reading from the pressure sensor, stores it on the device, checks the user's alert setting, and asks for the next run. It does no networking and no location. The app says in plain words that iOS decides when this happens and that the alert can be late.

How to test: open the app; the gauge shows the reading. Settings, Pressure unit, try inHg. Altimeter tab: tap Reset here, walk up a flight of stairs, see the climb; tap Use my location for a starting elevation. History: 3H and 24H show stored readings; 7D opens the paywall. Tap the tag on the gauge, pick Headache, Save note; it appears on the chart. History, bell: turn the alert on (opens the paywall on a free account). History, share icon: Export, Share PDF or Share CSV.

## Screenshots (6.9 inch at 1320x2868 and 6.3 inch at 1206x2622, six each)
From the app's own screens (the renders in docs/design/after are the source); a short caption at the top in Archivo Tab on the fog background; no device frames, no weather symbols, no emoji. Sample readings are made up.
1. "Air Pressure, Right Now": the gauge with the dial, the large reading and the trend (01-gauge)
2. "Rising or Falling at a Glance": the 24 hour chart with the gaps left empty (03-chart-24h)
3. "Your Elevation Without Signal": the altimeter with the climb since reset (02-altimeter)
4. "A Heads-Up on a Big Change": the change alert setting with the example notification (07-alert)
5. "Notes on the Chart": History with numbered notes and the pressure and trend at each (06-notes)
6. "PDF and CSV Export": the one-page PDF chart with Share PDF and Print (08-export)
