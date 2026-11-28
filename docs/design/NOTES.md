# Barometer design notes (1.0.0, Nov 27, 2026)

## Concept: the bulkhead instrument

The person opening this app wants one number they can trust and a sense of where it is going: someone whose head or knee knows the weather is turning, an angler deciding whether to go out, a hiker on a ridge with no signal. The model is a good brass-and-enamel barometer screwed to a boat's bulkhead or a hallway wall: a pale face in a dark bezel, fine graduations, large engraved figures, one colored hand, and a second "set hand" left on an earlier reading so the change shows at a glance.

- The wall (background) is fog, #ECEEEA. Plates (cards, sheets, the dial face) are enamel, #FBFBF8, with a 1 px edge and 18-point corners. Ink is #101418. The bezel is graphite, #1F272C.
- One accent, sea-glass teal (#0B6E66, white lettering at about 6:1), and it means "the reading or the thing to do": the dial's hand, the chart line and its wash, and the one main button on a screen. Picked options are solid ink, never teal. Nothing else is colored; there is no red, no warning color, no weather icon.
- Type: Archivo, a grotesque with engineered, slightly wide figures that read like instrument numerals. store/tabular-fonts.py points its digits at the font's own tabular figures ("Archivo Tab"), so a live reading never jitters sideways as it changes. Numbers, titles and labels are Archivo Tab; sentences are the system font, which follows Dynamic Type.
- The dial (src/ui/Dial.tsx) is a 270 degree scale in the person's unit with a wall barometer's span (950 to 1050 hPa, 28 to 31 inHg, and so on, src/dial.ts), a teal hand with a counterweight, and a thin set hand on the reading three hours ago. Up a mountain the scale slides whole graduations so the hand stays on the face. The face carries only numbers, the unit and SENSOR or SEA LEVEL: no Rain, Change or Fair, because the app does not forecast.
- Three dial styles: Classic (free: enamel face, fine scale), Marine (dark face, bold scale) and Plain (the ring and the hand). The rest of the app does not change with them.
- The chart (src/ui/Chart.tsx) draws a line only between readings close in time; a stretch with no readings is a pale band with no line through it, and a lone background reading is a dot. Notes stand on it as numbered ink marks. The same rule draws the PDF.
- Controls are pills (buttons, segment tracks, chips), like the knobs on an instrument panel; plates are softly rounded. Every control is at least 48 points; the main button is 56.
- Dark follows the system: a night watch. The wall goes to #0A0F12, plates to graphite #141B1F, the teal lifts to #5FD4C4 with dark lettering. The PDF preview stays white, because that is what prints.
- Motion is quiet: sheets fade; touch feedback on picks, saves and the altimeter reset.

Nothing here is Cash Counter's: no steel tray, no deposit-slip blue, no signal amber, no Barlow, no square compartments. The kit has its own names (src/ui/Kit.tsx: Tap, Action, Outline, Knob, Segments, Plate, Row, Toggle, Title, Small, Caps, Field, TopBar, Notice, Drawer; plus Dial, Chart, Tape, PageView and Glyph).

## Renders

`after/` holds the screens the brief asks for, 393x852 points at 2x, light and dark, from a throwaway web copy of the app (not in the repo): the real App.tsx, screens, kit, dial, chart and PDF layout on react-native-web, with the database swapped for an in-memory copy of src/db/repo.ts seeded with the made-up week from src/sample.ts, a stub sensor reading that week's pressure, a stubbed store with $3.99 a week with 3 days free, $19.99 a year and $29.99 once (made up; real prices come from StoreKit), a drawn status bar and the clock pinned to Friday, Nov 27, 2026, 9:41 AM in New York. Haptics, Dynamic Type, VoiceOver, the iOS switch and the share and print sheets are not visible in them.

1. `01-gauge`: the gauge, sea level from a location fix, Steady over 3 hours
2. `02-altimeter`: elevation 125 ft and a climb of 79 ft since the reset point, with the tape
3. `03-chart-24h`: History, 24 hours, gaps left empty, two notes on the chart
4. `04-chart-7d`: History, 7 days (Pro)
5. `05-note-add`: tagging a moment (Headache, now, with the pressure and trend)
6. `06-notes`: the notes list with the pressure and trend at each
7. `07-alert`: the change alert setting with the plain words about iOS timing
8. `08-export`: Export with the one-page PDF chart in inHg
9. `09-paywall-onboarding`: the onboarding paywall, close button showing (it appears after 3 seconds)
10. `10-paywall-in-app`: the in-app paywall opened by the locked 7D range
11. `11-settings`: Settings on the free plan (locks on the Pro rows)
12. `12` to `15`: onboarding: the three value screens and notifications; `16-trial`: the trial screen
13. `17-no-sensor`: the plain screen for a phone without a pressure sensor
14. `18-gauge-free-inhg` and `19-gauge-marine`: the gauge in inHg on the free plan, and the Marine dial in mmHg

## Icon

**Chosen (Nov 27, 2026): 3, Ridge.** A dial arc of dark graduations over a graphite mountain ridge with a white snowcap, and the teal hand rising from behind the ridge, on the fog tile (#ECEEEA): the barometer and the altimeter in one. `CHOSEN = 'ridge'` in `store/icon.js`; `node store/icon.js` writes every shipped file from it:

- `assets/icon.png`: 1024x1024, RGB with no alpha channel, square corners (iOS rounds them)
- `assets/android-icon-foreground.png`: the same tile; app.json `android.adaptiveIcon.backgroundColor` is the same fog, #ECEEEA
- `assets/splash-icon.png` and `splash-icon-dark.png`: the tile with rounded corners, centred on the fog (light) or near-black (dark) splash
- `assets/favicon.png`, `docs/apple-touch-icon.png` (180, square) and `docs/icon-512.png` (rounded, with clear corners so it sits on the light and the dark page), which is the logo on every website page

No app screen draws the icon, so no render in `after/` changed. The option sheet stays for the record: `node store/icon.js options` draws `icon-options.png`, each concept large and at 60 px on a light and a dark wallpaper.

1. Bulkhead (`bulkhead`): the app's own dial, an enamel face in a graphite bezel with the teal hand and the set hand. Reads "barometer" fastest; the most like the app itself.
2. Set hand (`sethand`): no face, a bold arc of graduations on deep teal with a white hand and the thin set hand, so the trend is the mark. The strongest silhouette at 60 px and the least like other gauge icons.
3. Ridge (`ridge`): a dial arc over a mountain ridge, for the barometer and the altimeter in one, on fog. Says altimeter too; lighter on a light wallpaper.

No letters, no clouds, suns or raindrops, no real instrument maker's dial.
