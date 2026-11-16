# chrismaa — neuroscience → AI portfolio

A fast, static portfolio with a dark liquid-glass look and neurotech motifs:

- **Hero:** a live leaky integrate-and-fire neural simulation. Pulses travel along synapses and the cursor acts as a stimulating electrode. As you scroll, it morphs into a feed-forward artificial neural network.
- **EEG-trace dividers** and an **axon-style experience timeline**, where milestones light up like nodes of Ranvier.
- **Command palette** (`⌘K` / `Ctrl K` / `/`) with a **terminal mode** (type `>` or press `` ` ``): `help`, `whoami`, `ls projects`, `open <name>`, `orbit`, `contact`, `motion off`, and more.
- **Live GitHub feed**, built from the GitHub API at build time and refreshed nightly, with a committed cache fallback so a build never fails.

Built with Astro 7, Tailwind CSS v4 and vanilla TypeScript. The homepage ships about 8 KB of gzipped JS and scores about 99/100/100/100 on Lighthouse mobile.

## Quick start

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build && npm run check
```

Node 22.23.4 or newer is required (see `.nvmrc`).

## Editing content

| What | Where |
| --- | --- |
| Name, tagline, location, social links, GitHub username | `src/data/site.ts` |
| Experience, education, skill groups, interests, awards | `src/data/cv.ts` |
| Projects (one Markdown file each) | `src/content/projects/*.md` |
| Publications | `src/content/publications/*.md` |
| Social image | `public/og.png` |

Publications without a title are shown by authors and journal, as on the CV. Add a `title:` line to the file to show the title.

**Project frontmatter:**
- `domain`: `neuro`, `ai` or `bridge`. Sets the card's accent colour.
- `size`: `lg` (2×2), `md` (1×2) or `sm` (1×1). Sets the card's footprint in the 3-column bento grid.
- `featured`: shows the project on the home page.
- `order`: sorts the projects.

**Regenerate the OG image** from the built site (needs Playwright installed locally):

```bash
npm i -D playwright && npx playwright install chromium
```

```bash
npm run build && npm run assets && npm run build
```

## Deploying (Hostinger, automatic)

The site is live at **https://chrismaa.com**. Hostinger deploys it on its own:

- **Hostinger's GitHub integration** watches `main`. Every push triggers `npm install && npm run build` on Hostinger (Node 22, app type Astro, output `dist`), and the result is published to `public_html`. To ship a change, merge it into `main`.
- **`.github/workflows/ci.yml`** type-checks and builds every push and pull request, so a broken change shows up in GitHub before Hostinger deploys it.
- **Nightly GitHub feed refresh.** At 03:17 UTC the same workflow rebuilds with a token and checks for repo changes (`scripts/feed-changed.mjs`). If anything changed, it commits `src/data/github-cache.json` to `main`, and that push makes Hostinger rebuild with fresh data. You can also run it by hand: Actions → CI & nightly feed → Run workflow.

To check or change the deploy settings, go to Hostinger hPanel → Websites → chrismaa.com → the Git/deployments panel. It currently shows repo `christophermaa/chrismaa.com`, branch `main`, auto-deploy on.

The canonical URL defaults to `https://chrismaa.com` (`astro.config.mjs`). To change it, set a `SITE_URL` environment variable.

`public/.htaccess` does the following on Hostinger:
- forces HTTPS and removes `www.`
- serves the custom 404 page
- turns on Brotli/gzip compression
- caches hashed `/_astro/*` assets for a year
- sends security headers (CSP, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`)

## GitHub feed

`src/lib/github.ts` uses `GITHUB_TOKEN` when one is set: GraphQL returns pinned and recent repos. Without a token, REST returns recent repos only. If every live fetch fails, the build falls back to `src/data/github-cache.json`. A successful local build refreshes that cache, so commit it now and then. Set `GITHUB_FEED_OFFLINE=1` to force the cache.

## Accessibility and motion

- Respects `prefers-reduced-motion`. A static SVG of the network is shown and the scroll morph is turned off.
- Respects `prefers-reduced-transparency`: glass surfaces become solid.
- Visitors can also run `motion off` in the terminal; the setting is saved per browser.
- Keyboard: skip link, visible amber focus rings, and a fully keyboard-driven palette built on native `<dialog>`.

## Later: Supabase

v1 needs no backend. Natural next steps are a contact form (a Supabase table plus an edge function with a captcha) or an "ask my CV" chat (an edge function calling an LLM). Both can be added as small client islands without changing the static deploy.
