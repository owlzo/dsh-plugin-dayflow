/**
 * One day in full: totals, category filters, and the activity timeline.
 * @module dsh-plugin-dayflow/client/day
 */

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { PanelDay } from '../panel-contract.js';
import { formatClock, formatDuration, formatShare, longDate, panelLanguage } from './format.js';
import type { Translate } from './format.js';
import type { RingState } from './ring.js';
import { AppBadge } from './app-badge.js';
import { dayState } from './state.js';
import type { Phase } from './types.js';

const BACK_ARROW = (
  <path d="M9.5 3 4.5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
);
const CHEVRON_LEFT = (
  <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
);
const CHEVRON_RIGHT = (
  <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
);
const REFRESH_GLYPH = (
  <path
    d="M13 8a5 5 0 1 1-1.6-3.7M13 2.5V5h-2.5"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

/** Props for the day view. */
export interface DayViewProps {
  /** The day payload; stays set while a refresh runs, so the view never blanks. */
  day: PanelDay | undefined;
  phase: Phase;
  /** The last failure's message, shown as a banner when data is already on screen. */
  error: string;
  t: Translate;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  onRefresh: () => void;
  onRetry: () => void;
}

function iconButton(path: ReactNode, label: string, onClick: () => void): ReactNode {
  return (
    <button type="button" className="dfp-icon-button" aria-label={label} title={label} onClick={onClick}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        {path}
      </svg>
    </button>
  );
}

function stateText(state: RingState, t: Translate): string {
  switch (state) {
    case 'pending':
      return t('statePending');
    case 'empty':
      return t('stateEmpty');
    case 'no-data':
      return t('stateNoData');
    default:
      return t('stateNoData');
  }
}

function stateHint(state: RingState, t: Translate): string {
  switch (state) {
    case 'pending':
      return t('analyzingHint');
    case 'empty':
      return t('emptyDayHint');
    default:
      return t('noDataHint');
  }
}

/**
 * Render one day.
 * @param props - the day, its load state, and the navigation callbacks.
 * @returns the day view.
 */
export function DayView(props: DayViewProps): ReactNode {
  const { day, phase, error, t, onBack, onPrev, onNext, onRefresh, onRetry } = props;
  const [filter, setFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    setFilter(undefined);
  }, [day?.date]);

  const colors = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of day?.categories ?? []) map.set(category.name, category.color_hex);
    return map;
  }, [day]);

  const status: RingState = day === undefined ? 'no-data' : dayState(day);
  const cards = day === undefined ? [] : filter === undefined ? day.cards : day.cards.filter((card) => card.category === filter);

  return (
    <div className="dfp-view">
      <div className="dfp-day-head">
        {iconButton(BACK_ARROW, t('back'), onBack)}
        <div className="dfp-day-heading">
          <span className="dfp-day-title">{day === undefined ? t('loading') : longDate(day.date, t)}</span>
          {day !== undefined && (
            <span className="dfp-day-sub">
              {formatDuration(day.tracked_minutes)} {t('tracked')} ·{' '}
              {t(day.cards.length === 1 ? 'activitiesOne' : 'activities', { count: day.cards.length })}
            </span>
          )}
        </div>
        {iconButton(CHEVRON_LEFT, t('prevDay'), onPrev)}
        {iconButton(CHEVRON_RIGHT, t('nextDay'), onNext)}
        {iconButton(REFRESH_GLYPH, t('refresh'), onRefresh)}
      </div>

      {phase === 'loading' && day === undefined && <div className="dfp-state">{t('loading')}</div>}

      {phase === 'error' && day === undefined && (
        <div className="dfp-state">
          <span className="dfp-state-title">{t('error')}</span>
          <span>{error}</span>
          <button type="button" className="dfp-today-button" onClick={onRetry}>
            {t('retry')}
          </button>
        </div>
      )}

      {day !== undefined && (
        <>
          {error !== '' && (
            <div className="dfp-banner">
              <span>{error}</span>
              <button type="button" className="dfp-today-button" onClick={onRetry}>
                {t('retry')}
              </button>
            </div>
          )}

          {day.categories.length > 0 && (
            <div className="dfp-chips">
              {day.categories.map((category) => (
                <button
                  key={category.name}
                  type="button"
                  className={`dfp-chip${filter === category.name ? ' is-active' : ''}`}
                  aria-pressed={filter === category.name}
                  onClick={() => setFilter((current) => (current === category.name ? undefined : category.name))}
                >
                  <span className="dfp-dot" style={{ background: category.color_hex }} />
                  {category.name}
                  <span className="dfp-chip-meta">
                    {formatDuration(category.minutes)} · {formatShare(category.share)}
                  </span>
                </button>
              ))}
              {filter !== undefined && (
                <button type="button" className="dfp-chip dfp-chip-clear" onClick={() => setFilter(undefined)}>
                  {t('filterAll')}
                </button>
              )}
            </div>
          )}

          {day.cards.length === 0 ? (
            <div className="dfp-state">
              <span className="dfp-state-title">{stateText(status, t)}</span>
              <span>{stateHint(status, t)}</span>
            </div>
          ) : cards.length === 0 ? (
            <div className="dfp-state">{t('filteredEmpty')}</div>
          ) : (
            <ul className="dfp-events">
              {cards.map((card) => (
                <li key={card.record_id} className="dfp-event">
                  <div className="dfp-event-time">
                    {formatClock(card.start, panelLanguage(t))}
                    <span className="dfp-event-duration">{formatDuration(card.duration_minutes)}</span>
                  </div>
                  <div className="dfp-event-body">
                    <span className="dfp-event-title">{card.title === '' ? t('untitled') : card.title}</span>
                    <span className="dfp-event-meta">
                      {card.apps !== undefined && card.apps[0] !== undefined && (
                        <AppBadge
                          domain={card.apps[0]}
                          color={colors.get(card.category) ?? 'var(--dsw-alias-label-tertiary)'}
                          size={15}
                          className="dfp-event-badge"
                        />
                      )}
                      <span className="dfp-dot" style={{ background: colors.get(card.category) ?? 'var(--dsw-alias-label-tertiary)' }} />
                      {card.category === '' ? t('uncategorized') : card.category}
                      {card.subcategory !== undefined && card.subcategory !== '' && ` · ${card.subcategory}`}
                      {card.apps !== undefined && card.apps.length > 0 && ` · ${card.apps.join(' · ')}`}
                    </span>
                    {card.summary !== '' && <p className="dfp-event-summary">{card.summary}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {day.pending_batches > 0 && <p className="dfp-note">{t('pending', { count: day.pending_batches })}</p>}
        </>
      )}
    </div>
  );
}
