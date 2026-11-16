import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    /** e.g. "Lead · doctoral research" */
    role: z.string().optional(),
    tags: z.array(z.string()).default([]),
    /** 'neuro' | 'ai' | 'bridge' — tints the card accent */
    domain: z.enum(['neuro', 'ai', 'bridge']).default('bridge'),
    repo: z.string().optional(),
    demo: z.string().optional(),
    year: z.union([z.number(), z.string()]).optional(),
    featured: z.boolean().default(false),
    /** Bento size on the home page */
    size: z.enum(['sm', 'md', 'lg']).default('sm'),
    order: z.number().default(100),
  }),
});

const publications = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/publications' }),
  schema: z.object({
    /** Optional: entries without a title are shown by authors + venue (as on the CV). */
    title: z.string().optional(),
    authors: z.string(),
    /** e.g. "52 citations" */
    note: z.string().optional(),
    venue: z.string(),
    year: z.number(),
    url: z.string().optional(),
    kind: z.enum(['journal', 'conference', 'preprint', 'thesis']).default('journal'),
  }),
});

export const collections = { projects, publications };
