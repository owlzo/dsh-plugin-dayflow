# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-10-20

### Changed

- The Web panel is now a month calendar. Every day is a segmented ring sized by
  that day's category minutes, with hover cards, click-through day details,
  category filters, day stepping, and a layout that follows the pane width and
  switches from hover to tap on touch devices.
- `PanelDay.pending_batches` and `PanelDay.last_capture_at` now describe the day
  itself rather than the process-wide backlog and the newest capture anywhere.
- The conversation-header toggle collapses to an icon below 720px, where the
  header runs out of room.

### Added

- `GET /api/dayflow/month?month=YYYY-MM`: one `PanelDay` per calendar day, plus
  the month, today, and timezone. Day states are derived from `tracked_minutes`,
  `pending_batches`, and `last_capture_at`, so quiet days, days with no captures,
  and days still being analyzed never render as zero activity.
- Tests for the month payload and route, per-day capture and backlog queries,
  month math, localized formatting, and the Monday-first calendar grid.
- Localized documentation screenshots for the calendar and the day view.

### Fixed

- Chinese timestamps in the panel and hover cards now use a 24-hour clock.

## [0.1.0] - 2026-10-19

### Added

- Eight read tools over Dayflow's local SQLite database: `dayflow_timeline`,
  `dayflow_activity`, `dayflow_breakdown`, `dayflow_search`, `dayflow_daily`,
  `dayflow_weekly`, `dayflow_categories`, and `dayflow_status`.
- Six editing tools over Dayflow's Unix-socket bridge, gated by the app's own
  "Allow edits" switch: `dayflow_update_activity`, `dayflow_delete_activity`,
  `dayflow_create_category`, `dayflow_update_category`,
  `dayflow_delete_category`, and `dayflow_set_goal`.
- Four skills registered at runtime: `dayflow`, `onboarding`, `standup`, and
  `weekly-review`.
- A system-prompt section documenting the 4 AM day boundary, `Idle`/`System`
  handling, analysis lag, and the untrusted-content boundary.
- An optional Web panel: a conversation-header button opens a right-Sidebar tab
  with the day's category bar and activity cards, drawn with the harness's own
  primitives and design tokens. `panel: false` removes its entry points.
- Two host routes behind the panel, `GET /api/dayflow/day` and
  `GET /api/dayflow/panel`, registered through the connection service so they
  inherit the browser-trust fence and session cookie.
- A browser half built as a lazy-CJS `__ModuleLoader__` bundle with esbuild,
  using only the harness's frozen platform modules (React and the UI
  primitives) and no runtime dependencies.
- A bundle patch so `dsh plugin add` mounts the plugin, plus `databasePath`,
  `agentSocket`, `edits`, `skills`, and `searchLimit` configuration.
- Tests covering day and week boundaries, SQL semantics, the stable payloads,
  preference parsing, the socket protocol, error codes, plugin composition, the
  panel payload and routes, panel formatting, and the built client bundle's
  registration contract (67 tests).

[0.2.0]: https://github.com/tailong-wu/dsh-plugin-dayflow/releases/tag/v0.2.0
[0.1.0]: https://github.com/tailong-wu/dsh-plugin-dayflow/releases/tag/v0.1.0
