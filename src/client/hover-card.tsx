/**
 * A position-aware hover card for the calendar.
 *
 * It renders under `document.body` so the panel's scroll port cannot clip it,
 * measures itself once mounted, and clamps to the viewport: below the anchor by
 * default, above it when the lower half has no room, and never past either
 * horizontal edge.
 * @module dsh-plugin-dayflow/client/hover-card
 */

import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Space kept between the card and the viewport edge. */
const VIEWPORT_MARGIN = 8;

/** Distance between the anchor and the card. */
const ANCHOR_GAP = 8;

/** Props for the hover card. */
export interface HoverCardProps {
  /** The cell the pointer is over. */
  anchor: DOMRect;
  /** Card contents. */
  children: ReactNode;
}

/**
 * Render the card next to its anchor.
 * @param props - anchor rectangle and contents.
 * @returns the portal, or `null` outside a browser.
 */
export function HoverCard({ anchor, children }: HoverCardProps): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | undefined>(undefined);

  useLayoutEffect(() => {
    const node = ref.current;
    if (node === null) return;
    const width = node.offsetWidth;
    const height = node.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, anchor.left + anchor.width / 2 - width / 2),
      Math.max(VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN),
    );
    const below = anchor.bottom + ANCHOR_GAP;
    const top =
      below + height + VIEWPORT_MARGIN <= viewportHeight
        ? below
        : Math.max(VIEWPORT_MARGIN, anchor.top - height - ANCHOR_GAP);

    setPosition({ left, top });
  }, [anchor]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className="dfp-hovercard"
      style={{ left: position?.left ?? -10_000, top: position?.top ?? -10_000 }}
    >
      {children}
    </div>,
    document.body,
  );
}
