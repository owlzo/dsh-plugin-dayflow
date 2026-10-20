/**
 * Panel styles, expressed only in the harness's design tokens so the panel
 * follows the active theme and the client's own typography.
 *
 * The ring sizes respond to the panel's own width through a container query,
 * because the right Sidebar can be docked, split, or fullscreen. Hover styling
 * is limited to fine pointers; touch devices open a day on tap instead.
 * @module dsh-plugin-dayflow/client/styles
 */

const STYLE_ID = 'dsh-plugin-dayflow-panel';

export const PANEL_CSS = `
.dfp-header-button {
  color: var(--dsw-alias-label-secondary);
}

.dfp-header-button:hover:not(:disabled) {
  color: var(--dsw-alias-label-primary);
}

/* The conversation header runs out of room on narrow viewports; the tooltip
 * still names the action, so the label collapses to the icon there. */
@media (max-width: 720px) {
  .dfp-header-button .dfp-toggle-label {
    display: none;
  }
  .dfp-header-button {
    padding: 0 6px;
  }
}

.dfp-root {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 20px;
}

.dfp-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--dsh-scrollbar-thumb, transparent) transparent;
}

.dfp-spacer {
  flex: 1;
}

/* ── Toolbar ─────────────────────────────────────────────────────────── */

.dfp-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}

.dfp-icon-button:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
}

.dfp-icon-button:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color);
  outline-offset: 1px;
}

.dfp-today-button {
  height: 24px;
  padding: 0 10px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
  white-space: nowrap;
}

.dfp-today-button:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.dfp-today-button:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color);
  outline-offset: 1px;
}

/* ── Month header ────────────────────────────────────────────────────── */

.dfp-month-head {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 6px 6px 8px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}

.dfp-month-heading {
  flex: 1;
  min-width: 0;
  padding-left: 2px;
}

.dfp-month-label {
  display: block;
  font-size: 13px;
  line-height: 18px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dfp-month-sub {
  display: block;
  font-size: 12px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Calendar grid ───────────────────────────────────────────────────── */

.dfp-weekdays {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  padding: 8px 6px 2px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 16px;
  text-align: center;
}

.dfp-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 2px 1px;
  padding: 0 6px 8px;
}

.dfp-blank {
  min-height: 40px;
}

.dfp-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 2px 0 3px;
  border: 0;
  border-radius: var(--dsw-radius-md);
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: background-color 120ms ease;
}

.dfp-cell:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color);
  outline-offset: -2px;
}

.dfp-cell.is-selected {
  background: var(--dsw-alias-interactive-bg-hover);
  box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l3);
}

.dfp-cell.is-today .dfp-cell-date {
  font-weight: 600;
}

.dfp-cell.is-today .dfp-cell-ring::after {
  content: '';
  position: absolute;
  inset: -2px;
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 50%;
  pointer-events: none;
}

.dfp-cell.is-no-data .dfp-cell-date {
  color: var(--dsw-alias-label-tertiary);
  opacity: 0.75;
}

.dfp-cell-ring {
  position: relative;
  width: 34px;
  height: 34px;
  flex: none;
}

.dfp-cell-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.dfp-cell-date {
  font-size: 11px;
  line-height: 13px;
  color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums;
}

.dfp-cell-total {
  font-size: 8px;
  line-height: 10px;
  color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

@container (min-width: 380px) {
  .dfp-cell-ring {
    width: 38px;
    height: 38px;
  }
  .dfp-cell-date {
    font-size: 12px;
    line-height: 14px;
  }
  .dfp-cell-total {
    font-size: 9px;
    line-height: 11px;
  }
}

@container (min-width: 470px) {
  .dfp-cell-ring {
    width: 44px;
    height: 44px;
  }
  .dfp-cell-date {
    font-size: 12px;
  }
  .dfp-cell-total {
    font-size: 9.5px;
  }
}

@container (min-width: 560px) {
  .dfp-cell-ring {
    width: 52px;
    height: 52px;
  }
  .dfp-cell-date {
    font-size: 13px;
    line-height: 15px;
  }
  .dfp-cell-total {
    font-size: 10px;
    line-height: 12px;
  }
}

@container (min-width: 640px) {
  .dfp-cell-ring {
    width: 58px;
    height: 58px;
  }
  .dfp-cell-date {
    font-size: 14px;
    line-height: 16px;
  }
  .dfp-cell-total {
    font-size: 10.5px;
    line-height: 12px;
  }
}

@container (min-width: 760px) {
  .dfp-cell-ring {
    width: 64px;
    height: 64px;
  }
  .dfp-cell-date {
    font-size: 15px;
    line-height: 17px;
  }
}

@media (hover: hover) and (pointer: fine) {
  .dfp-cell:hover {
    background: var(--dsw-alias-interactive-bg-hover);
  }
}

/* ── The ring ────────────────────────────────────────────────────────── */

.dfp-ring {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.dfp-ring-track {
  stroke: var(--dsw-alias-border-l3);
  opacity: 0.5;
}

.dfp-ring--empty .dfp-ring-track {
  stroke: var(--dsw-alias-border-l2);
  opacity: 0.9;
}

.dfp-ring--pending .dfp-ring-track {
  stroke: var(--dsw-alias-state-warn-primary);
  opacity: 0.55;
  stroke-dasharray: 2.5 2.5;
  animation: dfp-ring-pulse 2.4s ease-in-out infinite;
}

.dfp-ring--no-data .dfp-ring-track {
  opacity: 0.35;
  stroke-dasharray: 1 4;
}

.dfp-ring-seg {
  pointer-events: stroke;
  transition: opacity 120ms ease, filter 120ms ease;
}

.dfp-ring-seg.is-active {
  filter: brightness(1.12);
}

.dfp-ring:has(.dfp-ring-seg.is-active) .dfp-ring-seg:not(.is-active) {
  opacity: 0.5;
}

@keyframes dfp-ring-pulse {
  0%, 100% {
    opacity: 0.35;
  }
  50% {
    opacity: 0.7;
  }
}

/* ── Legend ──────────────────────────────────────────────────────────── */

.dfp-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  padding: 8px 12px;
  border-top: 1px solid var(--dsw-alias-border-l2);
}

.dfp-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
}

.dfp-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  flex: none;
}

/* ── Hover card ──────────────────────────────────────────────────────── */

.dfp-hovercard {
  position: fixed;
  z-index: 9000;
  max-width: 260px;
  min-width: 170px;
  padding: 9px 11px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: var(--dsw-elevation-prominent, 0 8px 24px rgba(0, 0, 0, 0.14));
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  line-height: 17px;
  pointer-events: none;
}

.dfp-hc-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.dfp-hc-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-weight: 600;
}

.dfp-hc-total {
  flex: none;
  color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums;
}

.dfp-hc-cats {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 6px;
}

.dfp-hc-cat {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.dfp-hc-cat-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dfp-hc-muted {
  color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}

.dfp-hc-events {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 8px;
  padding-top: 6px;
  border-top: 0.5px solid var(--dsw-alias-border-l2);
}

.dfp-hc-event {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsw-alias-label-secondary);
}

.dfp-hc-note {
  margin-top: 8px;
  color: var(--dsw-alias-label-tertiary);
}

.dfp-hc-hint {
  margin-top: 8px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
}

/* ── Day header ──────────────────────────────────────────────────────── */

.dfp-day-head {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 6px 6px 8px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}

.dfp-day-heading {
  flex: 1;
  min-width: 0;
  padding-left: 2px;
}

.dfp-day-title {
  display: block;
  font-size: 13px;
  line-height: 18px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dfp-day-sub {
  display: block;
  font-size: 12px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Category filters ────────────────────────────────────────────────── */

.dfp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 12px;
}

.dfp-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  height: 24px;
  padding: 0 9px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 18px;
  cursor: pointer;
  white-space: nowrap;
}

.dfp-chip:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.dfp-chip:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color);
  outline-offset: 1px;
}

.dfp-chip.is-active {
  background: var(--dsw-alias-label-primary);
  border-color: transparent;
  color: var(--dsw-alias-bg-layer-3);
}

.dfp-chip-meta {
  color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}

.dfp-chip.is-active .dfp-chip-meta {
  color: inherit;
  opacity: 0.75;
}

.dfp-chip-clear {
  border-style: dashed;
}

/* ── Timeline ────────────────────────────────────────────────────────── */

.dfp-events {
  list-style: none;
  margin: 0;
  padding: 0;
}

.dfp-event {
  display: flex;
  gap: 10px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l1, var(--dsw-alias-border-l2));
}

.dfp-event-time {
  flex: none;
  width: 56px;
  font-size: 12px;
  line-height: 17px;
  color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}

.dfp-event-duration {
  display: block;
  color: var(--dsw-alias-label-tertiary);
  opacity: 0.85;
}

.dfp-event-body {
  min-width: 0;
  flex: 1;
}

.dfp-event-title {
  display: block;
  font-size: 13px;
  line-height: 19px;
  color: var(--dsw-alias-label-primary);
  overflow-wrap: anywhere;
}

.dfp-event-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 1px;
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
}

.dfp-event-summary {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 17px;
  color: var(--dsw-alias-label-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── States ──────────────────────────────────────────────────────────── */

.dfp-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 36px 24px;
  text-align: center;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}

.dfp-state-title {
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
}

.dfp-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
}

.dfp-banner span {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dfp-note {
  margin: 0;
  padding: 10px 12px;
  border-top: 1px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 17px;
}
`;

/**
 * Add the panel stylesheet to the page once.
 * @returns a disposer that removes it.
 */
export function installStyles(): () => void {
  if (typeof document === 'undefined') return () => {};
  const existing = document.querySelector<HTMLStyleElement>(`style[data-dsh-plugin="${STYLE_ID}"]`);
  if (existing !== null) return () => {};

  const style = document.createElement('style');
  style.dataset.dshPlugin = STYLE_ID;
  style.textContent = PANEL_CSS;
  document.head.append(style);
  return () => {
    style.remove();
  };
}
