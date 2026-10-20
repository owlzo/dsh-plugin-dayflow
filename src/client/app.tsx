/**
 * The panel body: a month calendar that drills into one day.
 *
 * The calendar is the entry surface; picking a day swaps the body for the day
 * view without leaving the sidebar tab, and Escape (or the back arrow) returns.
 * @module dsh-plugin-dayflow/client/app
 */

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { shiftDayKey, shiftMonthKey } from '../panel-contract.js';
import type { PanelDay, PanelMonth } from '../panel-contract.js';
import { DayView } from './day.js';
import { monthKeyOf, monthOfDay, todayKey } from './format.js';
import type { Translate } from './format.js';
import { MonthView } from './month.js';
import type { Phase } from './types.js';

/** Props the slot runtime injects into the panel body. */
export interface PanelProps {
  /** Reads one day from the host; `undefined` means the current Dayflow day. */
  loadDay: (date?: string, signal?: AbortSignal) => Promise<PanelDay>;
  /** Reads one month of days; `undefined` means the current month. */
  loadMonth: (month?: string, signal?: AbortSignal) => Promise<PanelMonth>;
  /** Namespace-bound translation. */
  t: Translate;
}

function rawMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Make a transport failure readable without hiding a server message.
 * @param message - the raw failure message.
 * @param t - the bound translator.
 * @returns the message to show.
 */
function humanize(message: string, t: Translate): string {
  return /fetch|network|load failed/i.test(message) ? t('network') : message;
}

/**
 * Render the panel.
 * @param props - the injected readers and translator.
 * @returns the month calendar or one day.
 */
export function DayflowPanel({ loadDay, loadMonth, t }: PanelProps): ReactNode {
  const [month, setMonth] = useState(() => monthKeyOf(new Date()));
  const [monthData, setMonthData] = useState<PanelMonth | undefined>(undefined);
  const [monthPhase, setMonthPhase] = useState<Phase>('loading');
  const [monthError, setMonthError] = useState('');
  const [monthNonce, setMonthNonce] = useState(0);

  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [dayOpen, setDayOpen] = useState(false);
  const [dayData, setDayData] = useState<PanelDay | undefined>(undefined);
  const [dayPhase, setDayPhase] = useState<Phase>('ready');
  const [dayError, setDayError] = useState('');
  const [dayNonce, setDayNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setMonthPhase('loading');
    setMonthError('');
    loadMonth(month, controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return;
        setMonthData(data);
        setMonthPhase('ready');
      },
      (cause: unknown) => {
        if (controller.signal.aborted) return;
        setMonthError(rawMessage(cause));
        setMonthPhase('error');
      },
    );
    return () => {
      controller.abort();
    };
  }, [month, monthNonce, loadMonth]);

  useEffect(() => {
    if (!dayOpen || selected === undefined) return;
    const controller = new AbortController();
    const seeded = monthData?.days.find((entry) => entry.date === selected);
    setDayData((current) => (current?.date === selected ? current : seeded));
    setDayPhase(seeded === undefined ? 'loading' : 'ready');
    setDayError('');
    loadDay(selected, controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return;
        setDayData(data);
        setDayPhase('ready');
      },
      (cause: unknown) => {
        if (controller.signal.aborted) return;
        setDayError(rawMessage(cause));
        setDayPhase(seeded === undefined ? 'error' : 'ready');
      },
    );
    return () => {
      controller.abort();
    };
  }, [dayOpen, selected, dayNonce, loadDay]);

  useEffect(() => {
    if (!dayOpen) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setDayOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [dayOpen]);

  const pick = useCallback(
    (date: string) => {
      setSelected(date);
      setDayOpen(true);
      setDayData(undefined);
      setDayPhase('loading');
      const target = monthOfDay(date);
      if (target !== month) setMonth(target);
    },
    [month],
  );

  const goToday = (): void => {
    const target = monthKeyOf(new Date());
    setDayOpen(false);
    setSelected(undefined);
    if (target === month) setMonthNonce((value) => value + 1);
    else setMonth(target);
  };

  const refresh = (): void => {
    if (dayOpen && selected !== undefined) {
      setDayNonce((value) => value + 1);
      setMonthNonce((value) => value + 1);
      return;
    }
    setMonthNonce((value) => value + 1);
  };

  const body =
    dayOpen && selected !== undefined ? (
      <DayView
        day={dayData}
        phase={dayPhase}
        error={dayError === '' ? '' : humanize(dayError, t)}
        t={t}
        onBack={() => setDayOpen(false)}
        onPrev={() => pick(shiftDayKey(selected, -1))}
        onNext={() => pick(shiftDayKey(selected, 1))}
        onRefresh={refresh}
        onRetry={() => setDayNonce((value) => value + 1)}
      />
    ) : (
      <MonthView
      data={monthData}
      phase={monthPhase}
      error={humanize(monthError, t)}
      t={t}
      month={monthData?.month ?? month}
      today={monthData?.today ?? todayKey()}
      selected={selected}
      onPrevMonth={() => {
        setDayOpen(false);
        setSelected(undefined);
        setMonth(shiftMonthKey(monthData?.month ?? month, -1));
      }}
      onNextMonth={() => {
        setDayOpen(false);
        setSelected(undefined);
        setMonth(shiftMonthKey(monthData?.month ?? month, 1));
      }}
      onToday={goToday}
      onPick={pick}
      onRefresh={refresh}
      onRetry={() => setMonthNonce((value) => value + 1)}
      />
    );

  return <div className="dfp-root">{body}</div>;
}
