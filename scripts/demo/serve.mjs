/**
 * Serve the built demo page and its icons over HTTP.
 *
 * The panel fetches `/api/dayflow/icon?domain=…` exactly as it does in the
 * harness; this server answers from the cache `icons.mjs` fills, so the recorded
 * badges are the same favicons the plugin would show.
 * @module scripts/demo/serve
 */

import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';

import { readIcon } from './icons.mjs';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

/**
 * Start a server for one demo directory.
 * @param root - the directory holding `index.html`.
 * @param iconDir - the directory holding the cached icons.
 * @returns the server and the origin to open.
 */
export async function serve(root, iconDir) {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');

    if (url.pathname === '/api/dayflow/icon') {
      const icon = await readIcon(iconDir, url.searchParams.get('domain') ?? '');
      if (icon === undefined) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, {
        'content-type': icon.mediaType,
        'cache-control': 'public, max-age=604800, immutable',
      });
      response.end(icon.bytes);
      return;
    }

    const relative = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    try {
      const body = await readFile(join(root, relative));
      response.writeHead(200, { 'content-type': TYPES[extname(relative)] ?? 'application/octet-stream' });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });

  await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}
