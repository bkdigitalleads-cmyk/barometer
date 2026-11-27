# Barometer (engine base)

This first commit is the shared app engine, copied unchanged from bkdigitalleads-cmyk/cashcounter main at 84c3ba6 (Nov 24, 2026): the startup guard (index.ts), purchases.ts with the foreground Pro re-check (state.tsx), trial.ts, reminder.ts, reviews.ts, offer.ts, testing.ts, the SQLite layer pattern, the PDF writer, the share code, the onboarding trial screens, the paywall with three rows, Settings with the hidden test menu, the EAS workflows, plugins/withoutPushEntitlement.js and AGENTS.md. The count, till, denomination and count sheet modules were not copied.

It is not an app on its own: there is no app.json or package.json here. The Barometer app is built on top of it on a branch and arrives by pull request. eas.json `ascAppId` is a placeholder until Cowork fills it.
