/**
 * Panel styles, expressed only in the harness's design tokens so the panel
 * follows the active theme and the client's own typography.
 *
 * The rules are injected once per page and removed when the plugin unloads.
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

.dfp-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 20px;
}

.dfp-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 8px 8px 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}

.dfp-heading {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.dfp-day {
  font-size: 13px;
  line-height: 18px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dfp-sub {
  font-size: 12px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dfp-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 28px;
  height: 28px;
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

.dfp-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--dsh-scrollbar-thumb, transparent) transparent;
}

.dfp-summary {
  padding: 12px 12px 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l1, var(--dsw-alias-border-l2));
}

.dfp-bar {
  display: flex;
  gap: 2px;
  height: 6px;
  width: 100%;
  border-radius: 999px;
  overflow: hidden;
  background: var(--dsw-alias-bg-layer-3);
}

.dfp-bar-segment {
  height: 100%;
  min-width: 2px;
}

.dfp-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin-top: 8px;
}

.dfp-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
}

.dfp-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  flex: none;
}

.dfp-legend-time {
  color: var(--dsw-alias-label-secondary);
}

.dfp-cards {
  list-style: none;
  margin: 0;
  padding: 0;
}

.dfp-card {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l1, var(--dsw-alias-border-l2));
}

.dfp-card:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.dfp-time {
  flex: none;
  width: 58px;
  font-size: 12px;
  line-height: 17px;
  color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}

.dfp-time-duration {
  display: block;
  color: var(--dsw-alias-label-tertiary);
  opacity: 0.85;
}

.dfp-card-main {
  min-width: 0;
  flex: 1;
}

.dfp-card-title {
  display: block;
  font-size: 13px;
  line-height: 19px;
  color: var(--dsw-alias-label-primary);
  overflow-wrap: anywhere;
}

.dfp-card-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  margin-top: 1px;
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
}

.dfp-card-apps {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dfp-summary-text {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 17px;
  color: var(--dsw-alias-label-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dfp-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 40px 24px;
  text-align: center;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}

.dfp-state-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
}

.dfp-note {
  margin: 0;
  padding: 10px 12px;
  border-top: 1px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 17px;
}

.dfp-spacer {
  flex: 1;
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
