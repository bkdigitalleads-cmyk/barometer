# Barometer

A barometer and altimeter for iPhone that reads the phone's own pressure sensor: the live reading on a dial with the three-hour trend, sea level pressure, elevation and climb without signal, a chart of the last day, week and month with gaps left as gaps, a pressure change alert, notes on the chart, and a PDF and CSV export. No account, no server.

Expo SDK 57, React Native, TypeScript, with a small Swift module for background readings (modules/baro-background). See CLAUDE.md for how it is built and shipped, NOTES.md for the change log and the TestFlight checklist, docs/design/NOTES.md for the design, and store/metadata.md for the App Store listing.

    npm install
    npx tsc --noEmit
    npm test
    npx expo export --platform ios
