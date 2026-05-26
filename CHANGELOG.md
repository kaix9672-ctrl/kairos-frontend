# Changelog — kairos-frontend

## [Unreleased] — branch `chore/reconcile-datalayer-and-ignore-drop` (2026-05-26)
### Fixed
- `src/api.js`: corrected a stale data-layer comment ("This WRITES to Supabase
  server-side" → "This WRITES server-side (backend SQLite at KAIROS_DB)"). There is no
  Supabase layer; the backend persists to SQLite.
- **Lint: 0 errors / 0 warnings** (was 11 errors + 1 warning). `App.jsx`: removed unused
  `React` import, dead `SHADOW` const, unused props (`route`, `onRunLive`, `reco`); fixed a
  `useEffect` exhaustive-deps warning; `eslint-disable` on the two interlinked, never-called
  client-engine fns (`evaluate`, `buildDigest`) — kept for reference, not deleted to avoid a
  cascade across founder code. `src/brand/mascots/mascots.jsx`: removed unused `React` import.
  `eslint.config.js`: ignore the (retained) integration-drop clutter so it isn't linted.
### Changed
- `.gitignore`: ignore the one-off mascot integration drop at repo root
  (`integration_drop/`, `kairos_mascots_integration.diff`, `MASCOT_SYSTEM.md`,
  `mascots_preview.html`, loose `mascot_*.png`, `mascots.{css,data.js,jsx}`). Root-anchored
  so the real assets under `src/brand/mascots` + `public/brand` stay tracked.
### Added
- `EXECUTION_STATUS.md`, `CHANGELOG.md` (this file) — running status + change history.
- `playwright` (devDependency) + `verify_ui.mjs` — headless Chromium UI verification harness.
  Drives the real app end-to-end (homepage → scan → subscribe → pay/mock-activate →
  dashboard), asserts mascots render (loaded + visible) and that there are 0 console/page
  errors. Result on this state: **all 5 stages PASS, 0 errors**.

## Prior (on `ops-hardening`)
- `05f564f` Integrate mascot system and UX polish across all screens
- `d6f9372` Redesign KAIROS frontend experience
- `c2135ba` Launch hardening: env-driven support email, gitignore secrets, real README
