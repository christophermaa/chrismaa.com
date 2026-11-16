---
title: This site, built AI-first
summary: A static Astro site with a live spiking-network simulation, a command palette and a nightly-synced GitHub feed, built with Claude Code in an agentic workflow.
role: Solo · design & engineering
tags: [Astro, TypeScript, Canvas, Claude Code, CI/CD]
domain: ai
repo: https://github.com/christophermaa/chrismaa.com
year: 2026
featured: true
size: sm
order: 5
---

## What's in it
- **Hero simulation:** a leaky integrate-and-fire network. Spikes travel along synapses, and scrolling rearranges the network into a feed-forward neural net.
- **Command palette and terminal:** press `⌘K` / `Ctrl K` or `/`.
- **GitHub feed:** fetched at build time and refreshed nightly by GitHub Actions, with a cached fallback so a build never fails.
- **Performance:** about 8 KB of JavaScript and a Lighthouse score of about 99 on mobile.

## How it was built
I worked with Claude Code as an agentic pair. I planned the architecture, then iterated through implementation, Playwright screenshots, Lighthouse runs and fixes. The bugs it caught along the way include a fuzzy search that ranked badly and a focus race in the palette.
