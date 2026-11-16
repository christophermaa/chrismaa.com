/**
 * Command palette + terminal mode.
 *  - ⌘K / Ctrl+K / "/" opens; native <dialog> gives focus trapping, Esc and inert background.
 *  - Fuzzy search over build-time commands (combobox + listbox ARIA pattern).
 *  - Typing ">" switches to a tiny terminal with real commands.
 */
import type { Command } from '@/data/commands';

interface Payload {
  commands: Command[];
  whoami: string;
  github: string;
  linkedin: string;
}

const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
/** Touch-first devices: don't pop the on-screen keyboard until the user asks for it. */
const isTouch = matchMedia('(pointer: coarse)').matches;

/** Subsequence fuzzy score — higher is better, null when no match. */
function score(query: string, text: string): { s: number; hits: number[] } | null {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (!q) return { s: 0, hits: [] };
  const direct = t.indexOf(q);
  if (direct >= 0) {
    return { s: 100 - direct + (direct === 0 || t[direct - 1] === ' ' ? 30 : 0), hits: [...q].map((_, k) => direct + k) };
  }
  let s = 0;
  let ti = 0;
  let streak = 0;
  const hits: number[] = [];
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found < 0) return null;
    streak = found === ti ? streak + 1 : 0;
    s += 1 + streak * 2 + (found === 0 || t[found - 1] === ' ' ? 4 : 0);
    hits.push(found);
    ti = found + 1;
  }
  return { s, hits };
}

function highlight(label: string, hits: number[]) {
  if (!hits.length) return escapeHtml(label);
  const set = new Set(hits);
  return [...label].map((c, i) => (set.has(i) ? `<mark>${escapeHtml(c)}</mark>` : escapeHtml(c))).join('');
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function initPalette() {
  const dialog = document.querySelector<HTMLDialogElement>('[data-palette]');
  const input = document.querySelector<HTMLInputElement>('[data-palette-input]');
  const list = document.querySelector<HTMLUListElement>('[data-palette-list]');
  const term = document.querySelector<HTMLElement>('[data-term]');
  const out = document.querySelector<HTMLElement>('[data-term-out]');
  const promptEl = document.querySelector<HTMLElement>('[data-prompt]');
  const dataEl = document.getElementById('palette-data');
  if (!dialog || !input || !list || !term || !out || !dataEl) return;

  const data = JSON.parse(dataEl.textContent || '{}') as Payload;
  let results: Command[] = [];
  let active = 0;
  let terminal = false;
  const history: string[] = [];
  let histIdx = -1;

  document.querySelectorAll('[data-mod-key]').forEach((el) => (el.textContent = isMac ? '⌘K' : 'Ctrl K'));

  // ---------- open / close ----------
  let returnFocus: HTMLElement | null = null;

  // Keep the dialog inside the *visible* viewport on phones (the on-screen keyboard
  // shrinks visualViewport but not the layout viewport).
  const vv = window.visualViewport;
  const fitViewport = () => {
    if (!vv) return;
    dialog!.style.setProperty('--vvh', `${vv.height}px`);
    dialog!.style.setProperty('--vvt', `${vv.offsetTop}px`);
  };
  vv?.addEventListener('resize', () => dialog!.open && fitViewport());
  vv?.addEventListener('scroll', () => dialog!.open && fitViewport());

  function open(mode: 'search' | 'terminal' = 'search') {
    if (!dialog!.open) {
      returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      fitViewport();
      dialog!.showModal();
    }
    input!.value = mode === 'terminal' ? '>' : '';
    update();
    list!.scrollTop = 0;
    if (isTouch && mode === 'search') {
      // showModal() autofocuses the first focusable element; on touch that would open the keyboard
      // over the list. Move focus to the dialog itself instead; tapping the field still opens it.
      dialog!.setAttribute('tabindex', '-1');
      dialog!.focus({ preventScroll: true });
    } else {
      input!.focus({ preventScroll: true });
    }
  }
  function close() {
    dialog!.close();
  }
  // Return focus to where it was, so global shortcuts keep working after closing.
  dialog.addEventListener('close', () => {
    input!.blur();
    if (returnFocus && returnFocus !== document.body && document.contains(returnFocus)) returnFocus.focus();
    returnFocus = null;
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close(); // backdrop click
  });
  document.querySelector('[data-palette-close]')?.addEventListener('click', close);
  document.querySelectorAll('[data-open-palette]').forEach((b) => b.addEventListener('click', () => open()));

  document.addEventListener('keydown', (e) => {
    const field = (e.target as HTMLElement | null)?.closest('input, textarea, [contenteditable="true"]');
    // the palette's own input doesn't count once the dialog has closed
    const typing = field && !(field === input && !dialog.open);
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      dialog.open ? close() : open();
    } else if (e.key === '/' && !typing && !dialog.open) {
      e.preventDefault();
      open();
    } else if (e.key === '`' && !typing && !dialog.open) {
      e.preventDefault();
      open('terminal');
    }
  });

  // ---------- search mode ----------
  function render() {
    if (!results.length) {
      list!.innerHTML = `<li class="none" role="presentation">no matching signal — try <b>&gt; help</b></li>`;
      input!.removeAttribute('aria-activedescendant');
      return;
    }
    const q = input!.value.trim();
    let html = '';
    let group = '';
    results.forEach((c, i) => {
      if (c.group !== group) {
        group = c.group;
        html += `<li class="group" role="presentation">${group}</li>`;
      }
      const m = score(q, c.label);
      html += `<li id="opt-${i}" class="opt" role="option" aria-selected="${i === active}" data-i="${i}">
        <span class="lbl">${highlight(c.label, m?.hits ?? [])}</span>
        ${c.hint ? `<span class="hint">${escapeHtml(c.hint)}</span>` : ''}
      </li>`;
    });
    list!.innerHTML = html;
    input!.setAttribute('aria-activedescendant', `opt-${active}`);
    list!.querySelector(`#opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }

  function search(q: string) {
    if (!q) return data.commands.slice();
    return data.commands
      .map((c) => {
        // fuzzy on the label; keywords only count as whole-substring matches
        const a = score(q, c.label);
        const kw = c.keywords?.toLowerCase().includes(q.toLowerCase()) ? 20 : -1;
        const s = Math.max(a ? a.s * 2 : -1, kw);
        return { c, s };
      })
      .filter((r) => r.s >= 0)
      .sort((x, y) => y.s - x.s)
      .slice(0, 30)
      .map((r) => r.c);
  }

  function run(c: Command | undefined) {
    if (!c) return;
    const a = c.action;
    if (a.type === 'nav') {
      close();
      location.href = a.href;
    } else if (a.type === 'ext') {
      close();
      window.open(a.href, '_blank', 'noopener');
    } else if (a.type === 'copy') {
      navigator.clipboard?.writeText(a.text).catch(() => {});
      enterTerminal();
      print(`copied ${a.text} to clipboard`, 'ok');
    } else if (a.type === 'motion') {
      const off = toggleMotion();
      enterTerminal();
      print(`animations ${off ? 'off' : 'on'}`, 'ok');
    }
  }

  function toggleMotion(force?: 'on' | 'off') {
    const d = document.documentElement;
    const off = force ? force === 'off' : d.dataset.motion !== 'off';
    if (off) d.dataset.motion = 'off';
    else delete d.dataset.motion;
    try {
      localStorage.setItem('motion', off ? 'off' : 'on');
    } catch {}
    window.dispatchEvent(new Event('motionchange'));
    return off;
  }

  // ---------- terminal mode ----------
  function enterTerminal() {
    if (!input!.value.startsWith('>')) input!.value = '>';
    update();
  }

  function print(text: string, cls = '') {
    const div = document.createElement('div');
    div.className = `ln ${cls}`;
    div.textContent = text;
    out!.appendChild(div);
    term!.scrollTop = term!.scrollHeight;
  }

  const projects = () => data.commands.filter((c) => c.group === 'Projects');
  const repos = () => data.commands.filter((c) => c.group === 'Repositories');

  const commands: Record<string, (args: string[]) => void> = {
    help: () =>
      print(
        [
          'available commands:',
          '  whoami            who is this?',
          '  ls [projects|repos|sections]',
          '  orbit             where I\'m heading next',
          '  open <name>       open a project, repo or section',
          '  github            open GitHub profile',
          '  contact           message me on LinkedIn',
          '  motion [on|off]   toggle animations',
          '  clear             clear the screen',
          '  exit              back to search',
        ].join('\n'),
      ),
    whoami: () => print(data.whoami),
    ls: ([what = 'projects']) => {
      const map: Record<string, Command[]> = {
        projects: projects(),
        repos: repos(),
        sections: data.commands.filter((c) => c.group === 'Navigate'),
      };
      const items = map[what];
      if (!items) return print(`ls: unknown target "${what}"`, 'err');
      print(items.length ? items.map((c) => `  ${c.label}`).join('\n') : '  (empty)');
    },
    open: (args) => {
      const q = args.join(' ');
      if (!q) return print('usage: open <name>', 'err');
      const hit = search(q)[0];
      if (!hit) return print(`open: nothing matches "${q}"`, 'err');
      print(`opening ${hit.label}…`, 'ok');
      setTimeout(() => run(hit), 250);
    },

    github: () => {
      print('opening GitHub…', 'ok');
      window.open(data.github, '_blank', 'noopener');
    },
    contact: () => {
      print('opening LinkedIn…', 'ok');
      window.open(data.linkedin, '_blank', 'noopener');
    },
    motion: ([v]) => {
      const off = toggleMotion(v === 'on' || v === 'off' ? v : undefined);
      print(`animations ${off ? 'off' : 'on'}`, 'ok');
    },
    clear: () => (out!.innerHTML = ''),
    exit: () => {
      input!.value = '';
      update();
    },
    sudo: () => print('permission denied: ask your PI.', 'err'),
    orbit: () =>
      print(
        'next orbit: Earth observation & SAR.\n  coursework: ANU astrophysics (ASTR1001), astronomy & space (ASTR1003)\n  bridge: coherent imaging + Doppler processing, from ultrasound to radar',
        'ok',
      ),
  };

  function exec(line: string) {
    const raw = line.replace(/^>\s*/, '').trim();
    if (!raw) return;
    history.unshift(raw);
    histIdx = -1;
    print(raw, 'cmd');
    const [name = '', ...args] = raw.split(/\s+/);
    const fn = commands[name.toLowerCase()];
    if (fn) fn(args);
    else print(`command not found: ${name} — try "help"`, 'err');
    if (input!.value.startsWith('>')) input!.value = '>';
  }

  // ---------- wiring ----------
  function update() {
    const v = input!.value;
    const nowTerminal = v.startsWith('>');
    if (nowTerminal !== terminal) {
      terminal = nowTerminal;
      list!.hidden = terminal;
      term!.hidden = !terminal;
      promptEl!.textContent = terminal ? '❯' : '⌕';
      input!.setAttribute('aria-expanded', String(!terminal));
      dialog!.querySelectorAll('[data-mode]').forEach((b) =>
        b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.mode === (terminal ? 'terminal' : 'search'))),
      );
      input!.placeholder = terminal ? 'type a command, or tap one below' : 'Search or type > for terminal…';
      if (terminal && !out!.childElementCount) print('neuro-shell v1 — type "help" to list commands', 'ok');
    }
    if (!terminal) {
      results = search(v.trim());
      active = 0;
      render();
    }
  }

  dialog.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((b) =>
    b.addEventListener('click', () => {
      const toTerminal = b.dataset.mode === 'terminal';
      if (toTerminal === terminal) return;
      input.value = toTerminal ? '>' : '';
      update();
      // only summon the keyboard when it's needed (terminal on desktop, or search when asked)
      if (!isTouch) input.focus();
    }),
  );
  dialog.querySelectorAll<HTMLButtonElement>('[data-term-cmd]').forEach((b) =>
    b.addEventListener('click', () => exec(b.dataset.termCmd ?? '')),
  );

  input.addEventListener('input', update);
  input.addEventListener('keydown', (e) => {
    if (terminal) {
      if (e.key === 'Enter') {
        e.preventDefault();
        exec(input.value);
      } else if (e.key === 'ArrowUp' && history.length) {
        e.preventDefault();
        histIdx = Math.min(history.length - 1, histIdx + 1);
        input.value = `>${history[histIdx]}`;
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        histIdx = Math.max(-1, histIdx - 1);
        input.value = histIdx < 0 ? '>' : `>${history[histIdx]}`;
      }
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!results.length) return;
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
      render();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(results[active]);
    }
  });

  list.addEventListener('click', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('[data-i]');
    if (li) run(results[Number(li.dataset.i)]);
  });
  list.addEventListener('pointermove', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('[data-i]');
    if (!li) return;
    const i = Number(li.dataset.i);
    if (i !== active) {
      active = i;
      list.querySelectorAll('[aria-selected="true"]').forEach((el) => el.setAttribute('aria-selected', 'false'));
      li.setAttribute('aria-selected', 'true');
      input.setAttribute('aria-activedescendant', li.id);
    }
  });
}
