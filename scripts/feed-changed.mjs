/**
 * Exit 0 if the GitHub feed cache meaningfully changed since HEAD, 1 if not.
 * Ignores fetchedAt/source, and this site's own repo push time (otherwise every
 * nightly commit would make the next night look "changed").
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const FILE = 'src/data/github-cache.json';
const SELF = 'chrismaa.com';

const norm = (feed) =>
  JSON.stringify((feed.repos ?? []).map((r) => (r.name === SELF ? { ...r, updatedAt: null } : r)));

const now = JSON.parse(readFileSync(FILE, 'utf8'));
let before = { repos: [] };
try {
  before = JSON.parse(execSync(`git show HEAD:${FILE}`, { encoding: 'utf8' }));
} catch {}

if (!now.repos?.length) {
  console.log('feed empty (fetch failed?) — not committing');
  process.exit(1);
}
const changed = norm(now) !== norm(before);
console.log(changed ? 'feed changed' : 'feed unchanged');
process.exit(changed ? 0 : 1);
