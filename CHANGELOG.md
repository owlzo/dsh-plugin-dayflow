# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-10-23

### Added

- Site icons on the panel: every week card and day-detail row now shows the
  favicon of the app or site it was recorded from, falling back to a lettered
  tile in the category colour.
- `GET /api/dayflow/icon?domain=…`, which fetches one `favicon.ico` per domain on
  first use, caches it under `$DSH_HOME/dayflow-icons`, and serves it with a
  week-long cache header. This is the plugin's only outbound request: no
  cookies, no referrer, loopback and bare-IP names refused, 4 s timeout, and
  256 KB cap.
- An `icons` configuration switch (default `true`); `false` makes no request and
  also ignores already-cached icons.

### Changed

- Week cards keep their title readable next to the badge: the title is the only
  child that may shrink, so a long host name never squeezes it to one character.

## [0.3.1] - 2026-10-23

### Fixed

- The week view stepped through its seven days by adding 86,400,000 ms per day,
  which lands on the wrong date across a daylight-saving boundary (for example
  Berlin's late-October change returned a six-day week). It now steps by
  calendar day and resolves each day with the 4 AM window, so DST weeks keep
  seven days.
- The week-layout tests built cards from fixed `+08:00` offsets, so they failed
  on a UTC runner. They now build local dates, and the suite passes in UTC,
  Berlin, New York, Kolkata, Auckland, and Lord Howe.

## [0.3.0] - 2026-10-23

### Added

- A **Week** view beside the calendar: seven day columns over one hour axis, with
  each activity drawn as a card placed at its time and tinted by its category
  colour, matching Dayflow's own weekly timeline.
- `GET /api/dayflow/week?date=YYYY-MM-DD`, returning seven consecutive
  `PanelDay` payloads anchored on Monday, so the week view needs no client-side
  merging across month boundaries.
- Packed lanes for overlapping cards, a minimum card height so short blocks stay
  readable, a data-driven hour axis with `−`/`+` zoom, a sticky header row, a
  tinted today column with a date badge, an inline category legend, and a weekly
  tracked total.
- Hover cards on week cards (day, time range, duration, apps, summary) and
  click-through to the day detail.
- A **Month / Week** segmented switch in the panel header; switching keeps the
  selected day marked in both views.

### Changed

- The panel body now owns the view state, so the day detail returns to whichever
  view opened it.

## [0.2.1] - 2026-10-22

### Added

- Desktop App compatibility metadata: `dsh.compatibility.dshReleases` declares
  `0.2.0-rc.2` and `0.2.1-rc.2` compatible, and `dsh.client.inject` names the
  client packages whose services the panel's slots come from.
- Peer declarations for `@deepseek-ai/dsh-client-connection`,
  `@deepseek-ai/dsh-client-ui-primitives`, `@deepseek-ai/dsh-client-locale`,
  `@deepseek-ai/dsh-client-ui-conversation`,
  `@deepseek-ai/dsh-client-ui-sidebar-right`, `react`, and `react-dom`, so the
  manifest's requirements match what the two halves actually import.

### Changed

- The development cohort moves to DSH `0.2.1-rc.2` (`cordis` 4.0.5,
  `schemastery` 3.18.5), and the panel type-checks against the real
  `@deepseek-ai/dsh-client-ui-primitives` types instead of a local shim.

### Notes

- Verified on both `0.2.0-rc.2` and `0.2.1-rc.2`: the tool-definition surface,
  the skill registry, the system-prompt sections, and the exact Fetch-route
  signature are unchanged across that corridor, and the client platform table
  still exposes React, React DOM, and the UI primitives.

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

[0.4.0]: https://github.com/tailong-wu/dsh-plugin-dayflow/releases/tag/v0.4.0
[0.3.1]: https://github.com/tailong-wu/dsh-plugin-dayflow/releases/tag/v0.3.1
[0.3.0]: https://github.com/tailong-wu/dsh-plugin-dayflow/releases/tag/v0.3.0
[0.2.1]: https://github.com/tailong-wu/dsh-plugin-dayflow/releases/tag/v0.2.1
[0.2.0]: https://github.com/tailong-wu/dsh-plugin-dayflow/releases/tag/v0.2.0
[0.1.0]: https://github.com/tailong-wu/dsh-plugin-dayflow/releases/tag/v0.1.0
