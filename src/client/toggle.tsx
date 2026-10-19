/**
 * The conversation-header action that opens the Dayflow panel.
 *
 * It is the panel's only entry point, so the feature stays optional: users who
 * never click it keep their layout untouched.
 * @module dsh-plugin-dayflow/client/toggle
 */

import { Button, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives';
import type { ReactNode } from 'react';

import type { Translate } from './format.js';

/** Props the slot runtime injects into the header action. */
export interface ToggleProps {
  /** Opens (and focuses) the Dayflow panel tab. */
  openPanel: () => void;
  /** Namespace-bound translation. */
  t: Translate;
}

function TimelineGlyph(): ReactNode {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 2.5v11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="4" cy="4.5" r="1.6" fill="currentColor" />
      <circle cx="4" cy="11.5" r="1.6" fill="currentColor" />
      <path
        d="M7.5 4.5H13M7.5 8H11.5M7.5 11.5H12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Render the header toggle.
 * @param props - the injected opener and translator.
 * @returns the button anchored in the conversation header.
 */
export function DayflowToggle({ openPanel, t }: ToggleProps): ReactNode {
  return (
    <Tooltip label={t('open')} side="bottom">
      <Button variant="ghost" size="sm" className="dfp-header-button" icon={<TimelineGlyph />} onClick={openPanel}>
        {t('button')}
      </Button>
    </Tooltip>
  );
}
