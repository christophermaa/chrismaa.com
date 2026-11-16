/**
 * Command-palette entries, assembled at build time from site data, content collections
 * and the GitHub feed. Serialised into the page as JSON — no runtime fetches.
 */
import { getCollection } from 'astro:content';
import { site } from '@/data/site';
import { getGitHubFeed } from '@/lib/github';

export type Action =
  | { type: 'nav'; href: string }
  | { type: 'ext'; href: string }
  | { type: 'copy'; text: string }
  | { type: 'motion' };

export interface Command {
  id: string;
  group: 'Navigate' | 'Projects' | 'Repositories' | 'Actions';
  label: string;
  hint?: string;
  keywords?: string;
  action: Action;
}

export async function getCommands(): Promise<Command[]> {
  const sections: Command[] = [
    ['home', 'Home', '/'],
    ['projects', 'Projects', '/#projects'],
    ['about', 'How I build', '/#about'],
    ['experience', 'Experience', '/#experience'],
    ['skills', 'Skills', '/#skills'],
    ['interests', 'Interests — space & Earth observation', '/#interests'],
    ['github', 'GitHub activity', '/#github'],
    ['research', 'Publications & awards', '/#research'],
    ['contact', 'Contact', '/#contact'],
  ].map(([id, label, href]) => ({ id: `nav-${id}`, group: 'Navigate', label: label!, action: { type: 'nav', href: href! } }));

  const projects = (await getCollection('projects'))
    .sort((a, b) => a.data.order - b.data.order)
    .map<Command>((p) => ({
      id: `project-${p.id}`,
      group: 'Projects',
      label: p.data.title,
      hint: p.data.tags.slice(0, 3).join(' · '),
      keywords: `${p.id} ${p.data.tags.join(' ')} ${p.data.summary}`,
      action: { type: 'nav', href: `/projects/${p.id}` },
    }));

  const feed = await getGitHubFeed();
  const repos = feed.repos.map<Command>((r) => ({
    id: `repo-${r.name}`,
    group: 'Repositories',
    label: r.name,
    hint: [r.language, `★ ${r.stars}`].filter(Boolean).join(' · '),
    keywords: `${r.description ?? ''} ${r.topics.join(' ')}`,
    action: { type: 'ext', href: r.url },
  }));

  const actions: Command[] = [
    { id: 'act-gh', group: 'Actions', label: 'Open GitHub profile', hint: `@${site.githubUser}`, action: { type: 'ext', href: site.links.github } },
    { id: 'act-li', group: 'Actions', label: 'Contact me on LinkedIn', keywords: 'contact message email hire', action: { type: 'ext', href: site.links.linkedin } },
    { id: 'act-orcid', group: 'Actions', label: 'Open ORCID profile', keywords: 'research publications', action: { type: 'ext', href: site.links.orcid } },
    { id: 'act-src', group: 'Actions', label: 'View source of this site', keywords: 'code repo', action: { type: 'ext', href: site.sourceRepo } },
    { id: 'act-motion', group: 'Actions', label: 'Toggle animations', keywords: 'motion reduce accessibility', action: { type: 'motion' } },
  ];

  return [...sections, ...projects, ...repos, ...actions];
}
