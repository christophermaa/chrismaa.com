/**
 * Deterministic "neurons → network" graph shared by the build-time SVG fallback
 * and the client canvas, so the two line up exactly when the canvas takes over.
 *
 * Coordinates live in a fixed "bucket" space (landscape or portrait). Both the SVG
 * (preserveAspectRatio="xMidYMid slice") and the canvas map that space with the same
 * cover transform.
 */

export interface Bucket {
  id: 'landscape' | 'portrait';
  w: number;
  h: number;
  count: number;
  /** Layer sizes (relative) for the artificial-network layout */
  layers: number[];
  /** Region of the bucket the artificial network occupies */
  ann: { x0: number; x1: number; y0: number; y1: number };
}

export const BUCKETS: Record<Bucket['id'], Bucket> = {
  landscape: {
    id: 'landscape',
    w: 1600,
    h: 1000,
    count: 84,
    layers: [0.55, 1, 1.25, 1.25, 1, 0.55],
    ann: { x0: 0.5, x1: 0.9, y0: 0.2, y1: 0.82 },
  },
  portrait: {
    id: 'portrait',
    w: 900,
    h: 1600,
    count: 56,
    layers: [0.6, 1, 1.2, 1, 0.6],
    ann: { x0: 0.14, x1: 0.86, y0: 0.64, y1: 0.9 },
  },
};

export interface GNode {
  /** biological position */
  bx: number;
  by: number;
  /** artificial-network position */
  ax: number;
  ay: number;
  layer: number;
  r: number;
}

export interface GEdge {
  from: number;
  to: number;
  /** curve control offset (bio only), in bucket px, perpendicular to the edge */
  bend: number;
}

export interface Graph {
  bucket: Bucket;
  nodes: GNode[];
  bio: GEdge[];
  ann: GEdge[];
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildGraph(bucket: Bucket, seed = 1729): Graph {
  const rnd = mulberry32(seed);
  const { w, h, count } = bucket;
  const nodes: GNode[] = [];

  // Jittered-grid sampling with a density bias away from the headline area.
  const cols = Math.ceil(Math.sqrt((count * w) / h) * 1.5);
  const rows = Math.ceil((count * 1.5) / cols);
  const cells: [number, number][] = [];
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) cells.push([c, r]);
  // shuffle
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [cells[i], cells[j]] = [cells[j]!, cells[i]!];
  }
  for (const [c, r] of cells) {
    if (nodes.length >= count) break;
    const nx = (c + 0.15 + rnd() * 0.7) / cols;
    const ny = (r + 0.15 + rnd() * 0.7) / rows;
    const keep =
      bucket.id === 'landscape' ? 0.3 + 0.7 * Math.min(1, nx / 0.55) : 0.45 + 0.55 * Math.abs(ny - 0.42) * 2;
    if (rnd() > keep) continue;
    nodes.push({ bx: nx * w, by: ny * h, ax: 0, ay: 0, layer: 0, r: 1.4 + rnd() * 1.8 });
  }

  // Biological wiring: each neuron synapses onto its 3 nearest neighbours.
  const bio: GEdge[] = [];
  const seen = new Set<string>();
  nodes.forEach((n, i) => {
    const near = nodes
      .map((m, j) => ({ j, d: (m.bx - n.bx) ** 2 + (m.by - n.by) ** 2 }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
    for (const { j } of near) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const dir = rnd() < 0.5;
      bio.push({ from: dir ? i : j, to: dir ? j : i, bend: (rnd() - 0.5) * 0.5 });
    }
  });

  // Artificial layout: slice by x into layers, order each layer by y.
  const total = bucket.layers.reduce((a, b) => a + b, 0);
  const order = nodes.map((_, i) => i).sort((a, b) => nodes[a]!.bx - nodes[b]!.bx);
  const layerMembers: number[][] = [];
  let cursor = 0;
  bucket.layers.forEach((weight, li) => {
    const size =
      li === bucket.layers.length - 1 ? order.length - cursor : Math.round((weight / total) * order.length);
    const members = order.slice(cursor, cursor + size).sort((a, b) => nodes[a]!.by - nodes[b]!.by);
    cursor += size;
    layerMembers.push(members);
  });
  const { x0, x1, y0, y1 } = bucket.ann;
  const L = layerMembers.length;
  layerMembers.forEach((members, li) => {
    const x = (x0 + ((x1 - x0) * li) / (L - 1)) * w;
    const span = (y1 - y0) * (0.35 + 0.65 * (members.length / Math.max(...layerMembers.map((m) => m.length))));
    const top = ((y0 + y1) / 2 - span / 2) * h;
    members.forEach((idx, k) => {
      const n = nodes[idx]!;
      n.layer = li;
      n.ax = x;
      n.ay = members.length === 1 ? ((y0 + y1) / 2) * h : top + (span * h * k) / (members.length - 1);
    });
  });

  // Artificial wiring: feed-forward, each unit projects to ~3 units in the next layer.
  const ann: GEdge[] = [];
  for (let li = 0; li < L - 1; li++) {
    const a = layerMembers[li]!;
    const b = layerMembers[li + 1]!;
    a.forEach((from, k) => {
      const centre = Math.round((k / Math.max(1, a.length - 1)) * (b.length - 1));
      const targets = new Set<number>([centre, Math.max(0, centre - 1), Math.min(b.length - 1, centre + 1)]);
      targets.add(Math.floor(rnd() * b.length));
      for (const t of targets) ann.push({ from, to: b[t]!, bend: 0 });
    });
  }

  return { bucket, nodes, bio, ann };
}
