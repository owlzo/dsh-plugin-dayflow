/**
 * Site favicons for the activity cards.
 *
 * Dayflow records the apps and sites it saw as domain names (`github.com`,
 * `chat.deepseek.com`, …), so the only faithful "app logo" is that site's own
 * icon. Icons are fetched once, cached under the harness home, and served from
 * `/api/dayflow/icon`; the client falls back to a lettered badge when a site has
 * none.
 *
 * This is the plugin's only outbound request. It is limited to a single
 * `favicon.ico` GET per domain, sends no cookies and no referrer, and can be
 * switched off entirely with `icons: false`.
 * @module dsh-plugin-dayflow/icons
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';


/** Longest icon accepted from a site. */
const MAX_ICON_BYTES = 256 * 1024;

/** Fetch budget for one icon. */
const FETCH_TIMEOUT_MS = 4000;

/** A host name safe to fetch: lowercase labels, dots and dashes only. */
const HOST_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;

/** Media types an icon route may serve. */
const MEDIA_TYPES = new Set([
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
]);

/** One cached icon; the bytes own a plain (non-shared) buffer. */
export interface CachedIcon {
  readonly bytes: Uint8Array<ArrayBuffer>;
  readonly mediaType: string;
}

/**
 * Normalize a recorded app/site name into a host name.
 * @param value - the `appSites` entry, which may include a scheme or a path.
 * @returns the host name, or `undefined` when it is not a public host name.
 */
export function normalizeHost(value: string): string | undefined {
  let host = value.trim().toLowerCase();
  if (host === '') return undefined;
  host = host.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  host = host.split('/')[0] ?? '';
  host = host.split('?')[0] ?? '';
  host = host.split('#')[0] ?? '';
  host = host.replace(/:\d+$/, '');
  // Loopback names cannot serve a public favicon and would be an SSRF target.
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return undefined;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return undefined;
  return HOST_PATTERN.test(host) ? host : undefined;
}

function mediaTypeOf(header: string | null, host: string): string | undefined {
  const declared = header?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (MEDIA_TYPES.has(declared)) return declared;
  if (declared === 'image/ico' || declared === 'image/icon') return 'image/x-icon';
  if (declared !== '' && !declared.startsWith('text/')) return undefined;
  // Servers commonly answer `application/octet-stream`; fall back on the suffix.
  return host.endsWith('.svg') ? 'image/svg+xml' : 'image/x-icon';
}

/** Per-domain icon cache with a bounded in-memory layer over the disk cache. */
export class IconStore {
  private readonly memory = new Map<string, CachedIcon>();
  private readonly failed = new Set<string>();
  private readonly pending = new Map<string, Promise<CachedIcon | undefined>>();
  private readonly directory: string;
  private readonly enabled: boolean;

  /**
   * @param directory - where fetched icons are cached on disk.
   * @param enabled - whether outbound fetches are allowed.
   */
  constructor(directory: string, enabled: boolean) {
    this.directory = directory;
    this.enabled = enabled;
  }

  private pathFor(host: string): string {
    return join(this.directory, `${createHash('sha256').update(host).digest('hex').slice(0, 32)}.icon`);
  }

  private metaPathFor(host: string): string {
    return `${this.pathFor(host)}.json`;
  }

  /**
   * Read one host's icon, fetching it on first use.
   * @param raw - the recorded app or site name.
   * @returns the icon, or `undefined` when the site has none or icons are off.
   */
  async get(raw: string): Promise<CachedIcon | undefined> {
    const host = normalizeHost(raw);
    if (host === undefined) return undefined;
    const cached = this.memory.get(host);
    if (cached !== undefined) return cached;
    if (this.failed.has(host)) return undefined;

    const inFlight = this.pending.get(host);
    if (inFlight !== undefined) return inFlight;

    const job = this.load(host).finally(() => {
      this.pending.delete(host);
    });
    this.pending.set(host, job);
    return job;
  }

  private async load(host: string): Promise<CachedIcon | undefined> {
    const fromDisk = await this.readDisk(host);
    if (fromDisk !== undefined) {
      this.memory.set(host, fromDisk);
      return fromDisk;
    }
    if (!this.enabled) return undefined;

    const fetched = await this.fetchIcon(host);
    if (fetched === undefined) {
      this.failed.add(host);
      return undefined;
    }
    this.memory.set(host, fetched);
    await this.writeDisk(host, fetched);
    return fetched;
  }

  private async readDisk(host: string): Promise<CachedIcon | undefined> {
    try {
      const file = await readFile(this.pathFor(host));
      const bytes = new Uint8Array(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
      const meta = JSON.parse(await readFile(this.metaPathFor(host), 'utf8')) as { mediaType?: unknown };
      const mediaType = typeof meta.mediaType === 'string' && MEDIA_TYPES.has(meta.mediaType) ? meta.mediaType : 'image/x-icon';
      return bytes.byteLength === 0 ? undefined : { bytes, mediaType };
    } catch {
      return undefined;
    }
  }

  private async writeDisk(host: string, icon: CachedIcon): Promise<void> {
    try {
      await mkdir(this.directory, { recursive: true });
      await writeFile(this.pathFor(host), icon.bytes);
      await writeFile(this.metaPathFor(host), JSON.stringify({ mediaType: icon.mediaType }));
    } catch {
      // A read-only cache directory only costs a re-fetch next start.
    }
  }

  private async fetchIcon(host: string): Promise<CachedIcon | undefined> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(`https://${host}/favicon.ico`, {
        signal: controller.signal,
        redirect: 'follow',
        headers: { accept: 'image/*', 'user-agent': 'dsh-plugin-dayflow' },
      });
      if (!response.ok) return undefined;
      const declaredLength = Number(response.headers.get('content-length') ?? '0');
      if (Number.isFinite(declaredLength) && declaredLength > MAX_ICON_BYTES) return undefined;
      const buffer = new Uint8Array(await response.arrayBuffer());
      if (buffer.byteLength === 0 || buffer.byteLength > MAX_ICON_BYTES) return undefined;
      const mediaType = mediaTypeOf(response.headers.get('content-type'), host);
      if (mediaType === undefined) return undefined;
      return { bytes: buffer, mediaType };
    } catch {
      return undefined;
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * The cache directory for one harness home.
 * @param home - the harness home directory.
 * @returns the icon cache path.
 */
export function iconDirectory(home: string): string {
  return join(home, 'dayflow-icons');
}
