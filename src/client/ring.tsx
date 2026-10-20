/**
 * The segmented donut ring: one coloured arc per Dayflow category, sized by
 * that category's share of the day.
 *
 * The ring is decorative for assistive technology — its parent button carries
 * the accessible label — but its arcs are pointer targets so hovering one can
 * describe that category.
 * @module dsh-plugin-dayflow/client/ring
 */

import type { ReactElement } from 'react';

import type { PanelCategory } from '../panel-contract.js';

/** How a day can look in the calendar. */
export type RingState = 'recorded' | 'empty' | 'pending' | 'no-data';

/** Geometry shared with the stylesheet. */
const CENTER = 20;
const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Gap between neighbouring arcs, in the 40-unit view box. */
const ARC_GAP = 1.1;

/** Props for one ring. */
export interface SegmentedRingProps {
  /** The day's category totals, already sorted by the host. */
  categories: readonly PanelCategory[];
  /** Drawn state; decides the track and whether arcs appear. */
  state: RingState;
  /** Category currently described by the hover card, if any. */
  activeCategory?: string;
  /** Called when the pointer enters one category's arc. */
  onSegmentEnter?: (name: string) => void;
  /** Called when the pointer leaves an arc. */
  onSegmentLeave?: () => void;
}

/**
 * Render the ring.
 * @param props - categories, state, and the segment hover hooks.
 * @returns the ring SVG.
 */
export function SegmentedRing({
  categories,
  state,
  activeCategory,
  onSegmentEnter,
  onSegmentLeave,
}: SegmentedRingProps): ReactElement {
  let cursor = 0;
  const arcs = state === 'recorded'
    ? categories
        .filter((category) => category.share > 0)
        .map((category) => {
          const span = Math.min(1, category.share) * CIRCUMFERENCE;
          const length = Math.max(0.7, span - ARC_GAP);
          const dashOffset = -cursor;
          cursor += span;
          return { category, length, dashOffset };
        })
    : [];

  return (
    <svg className={`dfp-ring dfp-ring--${state}`} viewBox="0 0 40 40" width="100%" height="100%" aria-hidden="true">
      <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
        <circle className="dfp-ring-track" cx={CENTER} cy={CENTER} r={RADIUS} fill="none" strokeWidth={4} />
        {arcs.map(({ category, length, dashOffset }) => (
          <circle
            key={category.name}
            className={`dfp-ring-seg${activeCategory === category.name ? ' is-active' : ''}`}
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={category.color_hex}
            strokeWidth={4}
            strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
            strokeDashoffset={dashOffset}
            onPointerEnter={onSegmentEnter === undefined ? undefined : () => onSegmentEnter(category.name)}
            onPointerLeave={onSegmentLeave}
          />
        ))}
      </g>
    </svg>
  );
}
