/**
 * Build-time GitHub feed. Never breaks the build:
 *   token? → GraphQL (pinned + recent) → else REST (recent) → else committed cache.
 * A successful live fetch refreshes src/data/github-cache.json for the next offline build.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { site } from '@/data/site';

export interface Repo {
  name: string;
  description: string | null;
  url: string;
  homepage: string | null;
  stars: number;
  forks: number;
  language: string | null;
  languageColor: string | null;
  topics: string[];
  updatedAt: string;
  pinned: boolean;
}

export interface GitHubFeed {
  user: string;
  fetchedAt: string;
  source: 'graphql' | 'rest' | 'cache';
  repos: Repo[];
}

// Resolved from the project root: import.meta.url points into the build output once bundled.
const CACHE_PATH = resolve(process.cwd(), 'src/data/github-cache.json');
const LIMIT = 9;

const FALLBACK_COLORS: Record<string, string> = {
  Python: '#3572A5',
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  'Jupyter Notebook': '#DA5B0B',
  Astro: '#ff5a03',
  Rust: '#dea584',
  Go: '#00ADD8',
  C: '#555555',
  'C++': '#f34b7d',
  MATLAB: '#e16737',
  R: '#198CE7',
  Julia: '#a270ba',
  HTML: '#e34c26',
  CSS: '#663399',
  Shell: '#89e051',
};

const TIMEOUT_MS = 8000;

async function viaGraphQL(user: string, token: string): Promise<Repo[]> {
  const query = `query($login: String!) {
    user(login: $login) {
      pinnedItems(first: 6, types: REPOSITORY) { nodes { ... on Repository { ...R } } }
      repositories(first: 20, privacy: PUBLIC, isFork: false, orderBy: {field: PUSHED_AT, direction: DESC}) { nodes { ...R } }
    }
  }
  fragment R on Repository {
    name description url homepageUrl stargazerCount forkCount pushedAt isArchived
    primaryLanguage { name color }
    repositoryTopics(first: 6) { nodes { topic { name } } }
  }`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'portfolio-build' },
    body: JSON.stringify({ query, variables: { login: user } }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`GraphQL ${res.status}`);
  const json = (await res.json()) as any;
  if (json.errors?.length || !json.data?.user) throw new Error(`GraphQL: ${json.errors?.[0]?.message ?? 'no user'}`);

  const map = (n: any, pinned: boolean): Repo => ({
    name: n.name,
    description: n.description,
    url: n.url,
    homepage: n.homepageUrl || null,
    stars: n.stargazerCount,
    forks: n.forkCount,
    language: n.primaryLanguage?.name ?? null,
    languageColor: n.primaryLanguage?.color ?? null,
    topics: (n.repositoryTopics?.nodes ?? []).map((t: any) => t.topic.name),
    updatedAt: n.pushedAt,
    pinned,
  });
  const pinned = (json.data.user.pinnedItems.nodes as any[]).filter(Boolean).map((n) => map(n, true));
  const names = new Set(pinned.map((r) => r.name));
  const recent = (json.data.user.repositories.nodes as any[])
    .filter((n) => !n.isArchived && !names.has(n.name))
    .map((n) => map(n, false));
  return [...pinned, ...recent].slice(0, LIMIT);
}

async function viaREST(user: string, token?: string): Promise<Repo[]> {
  const res = await fetch(`https://api.github.com/users/${user}/repos?sort=pushed&per_page=30&type=owner`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'portfolio-build',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`REST ${res.status}`);
  const list = (await res.json()) as any[];
  return list
    .filter((r) => !r.fork && !r.archived && !r.private)
    .slice(0, LIMIT)
    .map((r) => ({
      name: r.name,
      description: r.description,
      url: r.html_url,
      homepage: r.homepage || null,
      stars: r.stargazers_count,
      forks: r.forks_count,
      language: r.language,
      languageColor: r.language ? (FALLBACK_COLORS[r.language] ?? null) : null,
      topics: r.topics ?? [],
      updatedAt: r.pushed_at,
      pinned: false,
    }));
}

async function readCache(): Promise<GitHubFeed> {
  try {
    const feed = JSON.parse(await readFile(CACHE_PATH, 'utf8')) as GitHubFeed;
    return { ...feed, source: 'cache' };
  } catch {
    return { user: site.githubUser, fetchedAt: new Date(0).toISOString(), source: 'cache', repos: [] };
  }
}

let memo: Promise<GitHubFeed> | undefined;

export function getGitHubFeed(): Promise<GitHubFeed> {
  memo ??= load();
  return memo;
}

async function load(): Promise<GitHubFeed> {
  const user = site.githubUser;
  const token = process.env.GITHUB_TOKEN || import.meta.env.GITHUB_TOKEN;
  if (process.env.GITHUB_FEED_OFFLINE === '1') return readCache();

  let repos: Repo[] | undefined;
  let source: GitHubFeed['source'] = 'rest';
  try {
    if (token) {
      try {
        repos = await viaGraphQL(user, token);
        source = 'graphql';
      } catch (e) {
        console.warn(`[github] GraphQL failed (${(e as Error).message}); trying REST`);
      }
    }
    repos ??= await viaREST(user, token);
  } catch (e) {
    console.warn(`[github] live fetch failed (${(e as Error).message}); using cache`);
    return readCache();
  }

  const feed: GitHubFeed = { user, fetchedAt: new Date().toISOString(), source, repos };
  try {
    await writeFile(CACHE_PATH, JSON.stringify(feed, null, 2) + '\n');
  } catch {
    /* read-only FS is fine */
  }
  return feed;
}
