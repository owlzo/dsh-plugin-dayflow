/**
 * The Dayflow timeline panel body: one day, its category split, and every
 * recorded activity, rendered with the harness's own primitives and tokens.
 * @module dsh-plugin-dayflow/client/panel
 */

import { Button, StateDot } from '@deepseek-ai/dsh-client-ui-primitives';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { shiftDayKey } from '../panel-contract.js';
import type { PanelCard, PanelDay } from '../panel-contract.js';
import { dayLabel, formatClock, formatDuration } from './format.js';
import type { Translate } from './format.js';

/** Props the slot runtime injects into the panel body. */
export interface PanelProps {
  /** Reads one day from the host; `undefined` means the current Dayflow day. */
  loadDay: (date?: string, signal?: AbortSignal) => Promise<PanelDay>;
  /** Namespace-bound translation. */
  t: Translate;
}

type Phase = 'loading' | 'ready' | 'error';

function icon(path: ReactNode, label: string, onClick: () => void): ReactNode {
  return (
    <button type="button" className="dfp-icon-button" aria-label={label} title={label} onClick={onClick}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        {path}
      </svg>
    </button>
  );
}

const ChevronLeft = <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />;
const ChevronRight = <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />;
const RefreshGlyph = (
  <path
    d="M13 8a5 5 0 1 1-1.6-3.7M13 2.5V5h-2.5"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

function CategoryDot({ color }: { color: string }): ReactNode {
  return <span className="dfp-dot" style={{ background: color }} aria-hidden="true" />;
}

function CardRow({ card, color }: { card: PanelCard; color: string }): ReactNode {
  const apps = card.apps === undefined || card.apps.length === 0 ? undefined : card.apps.join(' · ');
  const category = card.category === '' ? '—' : card.category;
  return (
    <li className="dfp-card">
      <div className="dfp-time">
        {formatClock(card.start)}
        <span className="dfp-time-duration">{formatDuration(card.duration_minutes)}</span>
      </div>
      <div className="dfp-card-main">
        <span className="dfp-card-title">{card.title === '' ? '(untitled activity)' : card.title}</span>
        <div className="dfp-card-meta">
          <CategoryDot color={color} />
          <span>{category}</span>
          {apps !== undefined && <span className="dfp-card-apps">· {apps}</span>}
        </div>
        {card.summary !== '' && <p className="dfp-summary-text">{card.summary}</p>}
      </div>
    </li>
  );
}

function Summary({ day, t }: { day: PanelDay; t: Translate }): ReactNode {
  if (day.categories.length === 0) return null;
  return (
    <div className="dfp-summary">
      <div className="dfp-bar" role="img" aria-label={t('tracked')}>
        {day.categories.map((category) => (
          <span
            key={category.name}
            className="dfp-bar-segment"
            style={{ background: category.color_hex, flexGrow: Math.max(category.share, 0.02) }}
          />
        ))}
      </div>
      <div className="dfp-legend">
        {day.categories.map((category) => (
          <span key={category.name} className="dfp-legend-item">
            <CategoryDot color={category.color_hex} />
            {category.name}
            <span className="dfp-legend-time">{formatDuration(category.minutes)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function PendingNote({ day, t }: { day: PanelDay; t: Translate }): ReactNode {
  if (day.pending_batches <= 0) return null;
  return <p className="dfp-note">{t('pending', { count: day.pending_batches })}</p>;
}

/**
 * The panel body.
 * @param props - the injected loader and translator.
 * @returns the panel.
 */
export function DayflowPanel({ loadDay, t }: PanelProps): ReactNode {
  const [date, setDate] = useState<string | undefined>(undefined);
  const [nonce, setNonce] = useState(0);
  const [day, setDay] = useState<PanelDay | undefined>(undefined);
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setPhase('loading');
    loadDay(date, controller.signal).then(
      (payload) => {
        if (controller.signal.aborted) return;
        setDay(payload);
        setPhase('ready');
      },
      (cause: unknown) => {
        if (controller.signal.aborted) return;
        const message = cause instanceof Error ? cause.message : String(cause);
        setError(/fetch|network|load failed/i.test(message) ? t('network') : message);
        setPhase('error');
      },
    );
    return () => {
      controller.abort();
    };
  }, [date, nonce, loadDay]);

  const colors = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of day?.categories ?? []) map.set(category.name, category.color_hex);
    return map;
  }, [day]);

  const shown = day?.date ?? date;
  const label = shown === undefined ? t('today') : dayLabel(shown, day?.today ?? shown, t);
  const navigate = (delta: number): void => {
    const anchor = day?.date ?? date ?? day?.today;
    if (anchor !== undefined) setDate(shiftDayKey(anchor, delta));
  };

  return (
    <div className="dfp-root">
      <div className="dfp-toolbar">
        {icon(ChevronLeft, t('prev'), () => navigate(-1))}
        <div className="dfp-heading">
          <span className="dfp-day">{label}</span>
          <span className="dfp-sub">
            {day === undefined ? '' : `${formatDuration(day.tracked_minutes)} ${t('tracked')}`}
          </span>
        </div>
        {icon(ChevronRight, t('next'), () => navigate(1))}
        {icon(RefreshGlyph, t('refresh'), () => setNonce((value) => value + 1))}
      </div>

      <div className="dfp-body">
        {phase === 'loading' && (
          <div className="dfp-state">
            <span className="dfp-state-title">
              <StateDot state="ongoing" />
              {t('loading')}
            </span>
          </div>
        )}

        {phase === 'error' && (
          <div className="dfp-state">
            <span className="dfp-state-title">
              <StateDot state="error" />
              {t('error')}
            </span>
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => setNonce((value) => value + 1)}>
              {t('retry')}
            </Button>
          </div>
        )}

        {phase === 'ready' && day !== undefined && (
          <>
            <Summary day={day} t={t} />
            {day.cards.length === 0 ? (
              <div className="dfp-state">
                <span className="dfp-state-title">
                  <StateDot state="idle" />
                  {t('empty')}
                </span>
                <span>{t('emptyHint')}</span>
              </div>
            ) : (
              <ul className="dfp-cards">
                {day.cards.map((card) => (
                  <CardRow
                    key={card.record_id}
                    card={card}
                    color={colors.get(card.category) ?? 'var(--dsw-alias-label-tertiary)'}
                  />
                ))}
              </ul>
            )}
            <PendingNote day={day} t={t} />
          </>
        )}
      </div>
    </div>
  );
}
