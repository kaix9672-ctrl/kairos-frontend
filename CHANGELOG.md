# Changelog — kairos-frontend

## [Unreleased] — branch `chore/reconcile-datalayer-and-ignore-drop` (2026-05-26)
### Fixed
- `src/api.js`: corrected a stale data-layer comment ("This WRITES to Supabase
  server-side" → "This WRITES server-side (backend SQLite at KAIROS_DB)"). There is no
  Supabase layer; the backend persists to SQLite.
### Changed
- `.gitignore`: ignore the one-off mascot integration drop at repo root
  (`integration_drop/`, `kairos_mascots_integration.diff`, `MASCOT_SYSTEM.md`,
  `mascots_preview.html`, loose `mascot_*.png`, `mascots.{css,data.js,jsx}`). Root-anchored
  so the real assets under `src/brand/mascots` + `public/brand` stay tracked.
### Added
- `EXECUTION_STATUS.md`, `CHANGELOG.md` (this file) — running status + change history.

## Prior (on `ops-hardening`)
- `05f564f` Integrate mascot system and UX polish across all screens
- `d6f9372` Redesign KAIROS frontend experience
- `c2135ba` Launch hardening: env-driven support email, gitignore secrets, real README
