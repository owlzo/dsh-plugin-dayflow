/**
 * A small site badge for an activity card: the site's favicon when it has one,
 * a lettered tile in the category colour otherwise.
 *
 * The image is loaded from the host's cached icon route, so the browser never
 * talks to the site itself and a missing icon costs one failed request per
 * session.
 * @module dsh-plugin-dayflow/client/app-badge
 */

import { useState } from 'react';
import type { ReactNode } from 'react';

import { PANEL_ICON_PATH } from '../panel-contract.js';

/** Props for one badge. */
export interface AppBadgeProps {
  /** The recorded app or site name, e.g. `github.com`. */
  domain: string;
  /** Category colour, used for the fallback tile. */
  color: string;
  /** Square size in pixels. */
  size: number;
  /** Class for spacing in the caller's layout. */
  className?: string;
}

/**
 * A host name for display: drops `www.` and any path.
 * @param raw - the recorded value.
 * @returns the host, or the input when it has no dots.
 */
export function hostOf(raw: string): string {
  const trimmed = raw.trim().toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  const host = trimmed.split('/')[0] ?? trimmed;
  return host.replace(/^www\./, '');
}

/**
 * The fallback tile's letter.
 * @param host - a host name.
 * @returns one uppercase character.
 */
export function initialOf(host: string): string {
  const first = host.replace(/^[^a-z0-9]+/i, '').charAt(0);
  return first === '' ? '?' : first.toUpperCase();
}

/**
 * Render one badge.
 * @param props - the recorded name, fallback colour, and size.
 * @returns the favicon image or its lettered fallback.
 */
export function AppBadge({ domain, color, size, className }: AppBadgeProps): ReactNode {
  const [failed, setFailed] = useState(false);
  const host = hostOf(domain);
  const style = { width: size, height: size, borderRadius: Math.round(size * 0.28) };

  if (host === '' || failed) {
    return (
      <span
        className={`dfp-badge dfp-badge-fallback${className === undefined ? '' : ` ${className}`}`}
        style={{ ...style, background: color, fontSize: Math.round(size * 0.55) }}
        aria-hidden="true"
        title={host}
      >
        {initialOf(host)}
      </span>
    );
  }

  return (
    <img
      className={`dfp-badge${className === undefined ? '' : ` ${className}`}`}
      style={style}
      src={`${PANEL_ICON_PATH}?domain=${encodeURIComponent(host)}`}
      alt=""
      title={host}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
