/**
 * Regenerates public/og.png (social card) from the built site.
 * Usage: npm run build && npm run assets
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';

// Playwright is not a project dependency (keeps CI lean): install it locally with
// `npm i -D playwright && npx playwright install chromium`, or point NODE_PATH at a global copy.
const { chromium } = createRequire(import.meta.url)('playwright');

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json' };
const root = join(process.cwd(), 'dist');

// Minimal static server for dist/ (no dependency on `astro preview`).
const server = createServer(async (req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(root, path);
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

try {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

  // Social card: the live hero at 1200×630, HUD and scroll cue hidden.
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await og.goto(base, { waitUntil: 'networkidle' });
  await og.addStyleTag({ content: '.nav-wrap,.scroll-cue,.hud,.ctas{display:none!important} body::before{display:none}' });
  await og.waitForTimeout(2500);
  await og.screenshot({ path: 'public/og.png' });

  await browser.close();
  console.log('✓ public/og.png updated — run `npm run build` again to include it.');
} finally {
  server.close();
}
