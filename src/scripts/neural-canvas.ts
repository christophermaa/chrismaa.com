/**
 * Hero simulation: a small leaky integrate-and-fire network.
 *
 *  - Each neuron integrates input, leaks toward rest and fires when it crosses threshold.
 *  - Spikes travel along synapses as visible pulses and depolarise the target neuron.
 *  - The pointer acts as a stimulating electrode.
 *  - Scroll progress (--p on the hero track) morphs the organic layout into a
 *    feed-forward artificial network — the neuroscience → AI story.
 *
 * Budget: ≤ 90 neurons, ≤ 360 pulses, sprites instead of shadowBlur, paused off-screen.
 */
import { BUCKETS, buildGraph, type Graph, type GEdge } from '@/lib/neural-graph';

const CYAN = '63, 212, 230';
const VIOLET = '155, 120, 245';
const AMBER = '245, 185, 66';

const TAU = 0.45; // membrane time constant (s)
const THRESHOLD = 1;
const REFRACTORY = 0.4; // s
const SPONTANEOUS_HZ = 0.12; // background input events per neuron
const WEIGHT = 0.42;
const PULSE_SPEED = 320; // bucket px / s
const MAX_PULSES = 360;

interface Neuron {
  v: number;
  refractory: number;
  glow: number;
  out: { bio: number[]; ann: number[] };
}
interface Pulse {
  edge: GEdge;
  set: 'bio' | 'ann';
  p: number;
  speed: number;
}

function sprite(rgb: string, size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, `rgba(${rgb}, 1)`);
  grd.addColorStop(0.25, `rgba(${rgb}, 0.45)`);
  grd.addColorStop(1, `rgba(${rgb}, 0)`);
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return c;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function startNeuralCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const host = canvas.closest<HTMLElement>('[data-hero]') ?? canvas.parentElement!;
  const track = canvas.closest<HTMLElement>('[data-hero-track]');
  const hud = {
    rate: document.querySelector<HTMLElement>('[data-hud-rate]'),
    mode: document.querySelector<HTMLElement>('[data-hud-mode]'),
    bar: document.querySelector<HTMLElement>('[data-hud-bar]'),
  };
  const reduceMotion = () =>
    matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off';

  const glowCyan = sprite(CYAN);
  const glowAmber = sprite(AMBER);

  let graph: Graph;
  let neurons: Neuron[] = [];
  let pulses: Pulse[] = [];
  let W = 0;
  let H = 0;
  let dpr = 1;
  let scale = 1;
  let ox = 0;
  let oy = 0;
  let morph = 0;
  let running = false;
  let visible = true;
  let last = 0;
  let raf = 0;
  const spikeTimes: number[] = [];
  const pointer = { x: -1e4, y: -1e4, active: false };

  function setup() {
    const rect = host.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const bucket = W / H >= 1 ? BUCKETS.landscape : BUCKETS.portrait;
    if (!graph || graph.bucket.id !== bucket.id) {
      graph = buildGraph(bucket);
      neurons = graph.nodes.map(() => ({
        v: Math.random() * 0.6,
        refractory: 0,
        glow: 0,
        out: { bio: [], ann: [] },
      }));
      graph.bio.forEach((e, i) => neurons[e.from]!.out.bio.push(i));
      graph.ann.forEach((e, i) => neurons[e.from]!.out.ann.push(i));
      pulses = [];
    }
    // cover transform — identical to the SVG's xMidYMid slice
    scale = Math.max(W / bucket.w, H / bucket.h);
    ox = (W - bucket.w * scale) / 2;
    oy = (H - bucket.h * scale) / 2;
  }

  const px = (i: number, t: number) => {
    const n = graph.nodes[i]!;
    return ox + (n.bx + (n.ax - n.bx) * t) * scale;
  };
  const py = (i: number, t: number) => {
    const n = graph.nodes[i]!;
    return oy + (n.by + (n.ay - n.by) * t) * scale;
  };

  function readMorph() {
    if (!track) return 0;
    const r = track.getBoundingClientRect();
    const travel = r.height - window.innerHeight;
    if (travel <= 0) {
      track.style.setProperty('--p', '0');
      return 0;
    }
    const p = Math.min(1, Math.max(0, -r.top / travel));
    track.style.setProperty('--p', p.toFixed(3));
    return ease(Math.min(1, Math.max(0, (p - 0.08) / 0.72)));
  }

  function fire(i: number, now: number) {
    const n = neurons[i]!;
    n.v = 0;
    n.refractory = REFRACTORY;
    n.glow = 1;
    spikeTimes.push(now);
    const set: 'bio' | 'ann' = morph < 0.5 ? 'bio' : 'ann';
    const list = set === 'bio' ? graph.bio : graph.ann;
    for (const ei of n.out[set]) {
      if (pulses.length >= MAX_PULSES) break;
      const e = list[ei]!;
      const a = graph.nodes[e.from]!;
      const b = graph.nodes[e.to]!;
      const len = Math.hypot(b.bx - a.bx, b.by - a.by) || 1;
      pulses.push({ edge: e, set, p: 0, speed: (PULSE_SPEED * (0.8 + Math.random() * 0.4)) / len });
    }
  }

  function step(dt: number, now: number) {
    // input layer gets the background drive once the network is "artificial"
    const inputBoost = morph >= 0.5;
    neurons.forEach((n, i) => {
      if (n.refractory > 0) {
        n.refractory -= dt;
      } else {
        n.v -= (n.v / TAU) * dt;
        const rate = inputBoost ? (graph.nodes[i]!.layer === 0 ? SPONTANEOUS_HZ * 6 : SPONTANEOUS_HZ * 0.3) : SPONTANEOUS_HZ;
        if (Math.random() < rate * dt) n.v += 0.6 + Math.random() * 0.6;
        if (pointer.active) {
          const d = Math.hypot(px(i, morph) - pointer.x, py(i, morph) - pointer.y);
          if (d < 140) n.v += 3.2 * dt * (1 - d / 140);
        }
        if (n.v >= THRESHOLD) fire(i, now);
      }
      n.glow = Math.max(0, n.glow - dt * 2.2);
    });

    for (let k = pulses.length - 1; k >= 0; k--) {
      const pl = pulses[k]!;
      pl.p += pl.speed * dt;
      if (pl.p >= 1) {
        const target = neurons[pl.edge.to]!;
        if (target.refractory <= 0) target.v += WEIGHT * (0.7 + Math.random() * 0.6);
        pulses.splice(k, 1);
      }
    }

    while (spikeTimes.length && now - spikeTimes[0]! > 1000) spikeTimes.shift();
  }

  function edgePoint(e: GEdge, set: 'bio' | 'ann', t: number, s: number) {
    const x0 = px(e.from, t), y0 = py(e.from, t), x1 = px(e.to, t), y1 = py(e.to, t);
    if (set === 'ann') return [x0 + (x1 - x0) * s, y0 + (y1 - y0) * s] as const;
    const dx = x1 - x0, dy = y1 - y0;
    const bend = e.bend * (1 - t);
    const cx = (x0 + x1) / 2 - dy * bend, cy = (y0 + y1) / 2 + dx * bend;
    const u = 1 - s;
    return [u * u * x0 + 2 * u * s * cx + s * s * x1, u * u * y0 + 2 * u * s * cy + s * s * y1] as const;
  }

  function draw() {
    const t = morph;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx!.clearRect(0, 0, W, H);
    ctx!.lineWidth = 1;

    // synapses — biological curves fade out, feed-forward lines fade in
    if (t < 1) {
      ctx!.beginPath();
      for (const e of graph.bio) {
        const x0 = px(e.from, t), y0 = py(e.from, t), x1 = px(e.to, t), y1 = py(e.to, t);
        const dx = x1 - x0, dy = y1 - y0, bend = e.bend * (1 - t);
        ctx!.moveTo(x0, y0);
        ctx!.quadraticCurveTo((x0 + x1) / 2 - dy * bend, (y0 + y1) / 2 + dx * bend, x1, y1);
      }
      ctx!.strokeStyle = `rgba(140, 170, 255, ${0.16 * (1 - t)})`;
      ctx!.stroke();
    }
    if (t > 0) {
      ctx!.beginPath();
      for (const e of graph.ann) {
        ctx!.moveTo(px(e.from, t), py(e.from, t));
        ctx!.lineTo(px(e.to, t), py(e.to, t));
      }
      ctx!.strokeStyle = `rgba(${VIOLET}, ${0.2 * t})`;
      ctx!.stroke();
    }

    // pulses (action potentials) — additive glow
    ctx!.globalCompositeOperation = 'lighter';
    for (const pl of pulses) {
      const [x, y] = edgePoint(pl.edge, pl.set, t, pl.p);
      const [tx, ty] = edgePoint(pl.edge, pl.set, t, Math.max(0, pl.p - 0.12));
      ctx!.strokeStyle = `rgba(${AMBER}, 0.55)`;
      ctx!.lineWidth = 1.4;
      ctx!.beginPath();
      ctx!.moveTo(tx, ty);
      ctx!.lineTo(x, y);
      ctx!.stroke();
      ctx!.drawImage(glowAmber, x - 7, y - 7, 14, 14);
    }

    // somata
    graph.nodes.forEach((_n, i) => {
      const x = px(i, t), y = py(i, t);
      const st = neurons[i]!;
      if (st.glow > 0.02) {
        const g = 10 + 26 * st.glow;
        ctx!.globalAlpha = st.glow;
        ctx!.drawImage(glowAmber, x - g, y - g, g * 2, g * 2);
        ctx!.globalAlpha = 1;
      }
      const charge = Math.min(1, st.v / THRESHOLD);
      if (charge > 0.2) {
        const g = 6 + 10 * charge;
        ctx!.globalAlpha = 0.35 * charge;
        ctx!.drawImage(glowCyan, x - g, y - g, g * 2, g * 2);
        ctx!.globalAlpha = 1;
      }
    });
    ctx!.globalCompositeOperation = 'source-over';
    graph.nodes.forEach((n, i) => {
      const st = neurons[i]!;
      const r = n.r * (1 + t * 0.6);
      ctx!.beginPath();
      ctx!.arc(px(i, t), py(i, t), r, 0, Math.PI * 2);
      ctx!.fillStyle = st.glow > 0.4 ? `rgba(${AMBER}, 0.95)` : `rgba(${CYAN}, ${0.6 + 0.3 * Math.min(1, st.v)})`;
      ctx!.fill();
    });
  }

  let hudTick = 0;
  function updateHud(now: number) {
    if (now - hudTick < 250) return;
    hudTick = now;
    if (hud.rate) hud.rate.textContent = (spikeTimes.length / neurons.length).toFixed(2);
    if (hud.mode) hud.mode.textContent = morph < 0.5 ? 'biological' : 'artificial';
    if (hud.bar) hud.bar.style.transform = `scaleX(${morph.toFixed(3)})`;
  }

  function frame(now: number) {
    raf = 0;
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    morph = readMorph();
    step(dt, now);
    draw();
    updateHud(now);
    raf = requestAnimationFrame(frame);
  }

  function play() {
    if (running || !visible || document.hidden || reduceMotion()) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function pause() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }
  function renderStatic() {
    morph = readMorph();
    draw();
    updateHud(performance.now() + 1000);
  }

  setup();
  renderStatic();
  host.classList.add('neural-live');

  new ResizeObserver(() => {
    setup();
    if (!running) renderStatic();
  }).observe(host);

  new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting;
    visible ? play() : pause();
  }).observe(host);

  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()));

  window.addEventListener(
    'scroll',
    () => {
      if (!running && visible) requestAnimationFrame(renderStatic);
    },
    { passive: true },
  );

  const setPointer = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    pointer.active = true;
  };
  host.addEventListener('pointermove', setPointer, { passive: true });
  host.addEventListener('pointerdown', setPointer, { passive: true });
  host.addEventListener('pointerleave', () => (pointer.active = false));
  host.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'mouse') pointer.active = false;
  });

  // allow the command palette's "toggle animations" to start/stop us
  window.addEventListener('motionchange', () => (reduceMotion() ? (pause(), renderStatic()) : play()));

  play();
}
