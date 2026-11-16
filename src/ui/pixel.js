// Pixel-art legal sprites drawn procedurally on a small grid, then outlined and scaled with crisp pixels.
// Usage: <canvas data-sprite="scales"></canvas>, then call drawSprites().

const PAL = {
  o: '#2b2118',                                   // outline
  G: '#e9b62f', S: '#b9831a', H: '#fff0a6', K: '#8a6416', Y: '#f6d25a', // gold
  W: '#9a5a2b', D: '#6b3816', L: '#c9864b',      // wood / leather
  P: '#f4e7c5', Q: '#d8c18a', T: '#8c7a55',      // parchment
  R: '#c8322c', r: '#ff7466',                    // wax seal
  F: '#fbf8f0', E: '#c9c1ad', N: '#2d2d36',      // feather, nib
  B: '#243457', b: '#5a73a8',                    // ink
  A: '#ece6d8', a: '#b9b09b', c: '#8f8673',      // stone
  V: '#3f6b4a', v: '#6f9e76',                    // green cloth
};

function grid(w, h) {
  const g = Array.from({length: h + 2}, () => Array(w + 2).fill(null));
  const set = (x, y, c) => { x = Math.round(x) + 1; y = Math.round(y) + 1; if (x >= 0 && y >= 0 && x < w + 2 && y < h + 2) g[y][x] = c; };
  return {
    g, set,
    rect(x, y, ww, hh, c) { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) set(x + i, y + j, c); },
    disc(cx, cy, r, c) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) set(cx + x, cy + y, c); },
    line(x0, y0, x1, y1, c, t = 1) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 || 1;
      for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; for (let a = 0; a < t; a++) for (let b = 0; b < t; b++) set(x + a, y + b, c); }
    },
  };
}

function outline(g) {
  const h = g.length, w = g[0].length, out = g.map(r => r.slice());
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (g[y][x]) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx])) out[y][x] = 'o';
  }
  return out;
}

const SPRITES = {
  scales() {
    const s = grid(34, 30);
    s.rect(16, 5, 2, 20, 'G'); s.rect(17, 5, 1, 20, 'S');
    s.disc(16, 3, 2, 'G'); s.set(15, 2, 'H');
    s.rect(3, 7, 28, 2, 'G'); s.rect(3, 8, 28, 1, 'S'); s.rect(3, 7, 28, 1, 'H');
    s.line(4, 9, 0, 19, 'K'); s.line(4, 9, 9, 19, 'K');
    s.line(29, 9, 25, 15, 'K'); s.line(29, 9, 33, 15, 'K');
    s.rect(4, 17, 5, 3, 'Y'); s.rect(5, 16, 3, 1, 'Y'); s.rect(4, 17, 5, 1, 'H');                 // coins
    s.rect(27, 10, 5, 5, 'P'); s.rect(28, 11, 3, 1, 'T'); s.rect(28, 13, 2, 1, 'T');               // document
    s.rect(0, 20, 11, 1, 'G'); s.rect(1, 21, 9, 1, 'G'); s.rect(2, 22, 7, 1, 'S');
    s.rect(24, 16, 11, 1, 'G'); s.rect(25, 17, 9, 1, 'G'); s.rect(26, 18, 7, 1, 'S');
    s.rect(12, 25, 10, 2, 'G'); s.rect(12, 25, 10, 1, 'H'); s.rect(10, 27, 14, 2, 'G'); s.rect(10, 28, 14, 1, 'S');
    return s.g;
  },
  gavel() {
    const s = grid(32, 30);
    s.line(14, 12, 25, 23, 'W', 3); s.line(16, 12, 27, 23, 'D', 1);
    s.rect(4, 3, 19, 9, 'W'); s.rect(4, 3, 19, 1, 'L'); s.rect(4, 11, 19, 1, 'D');
    s.rect(3, 4, 1, 7, 'D'); s.rect(23, 4, 1, 7, 'D');
    s.rect(8, 3, 2, 9, 'G'); s.rect(17, 3, 2, 9, 'G'); s.set(8, 4, 'H'); s.set(17, 4, 'H');
    s.rect(1, 25, 16, 4, 'D'); s.rect(2, 24, 14, 1, 'W'); s.rect(1, 25, 16, 1, 'L');
    return s.g;
  },
  scroll() {
    const s = grid(30, 32);
    s.rect(5, 5, 20, 22, 'P'); s.rect(23, 5, 2, 22, 'Q');
    s.rect(3, 2, 24, 4, 'Q'); s.rect(3, 2, 24, 1, 'P'); s.rect(2, 3, 1, 2, 'T'); s.rect(27, 3, 1, 2, 'T');
    s.rect(3, 26, 24, 4, 'Q'); s.rect(3, 26, 24, 1, 'P'); s.rect(2, 27, 1, 2, 'T'); s.rect(27, 27, 1, 2, 'T');
    [[9, 14], [12, 11], [15, 14], [18, 9]].forEach(([y, w]) => s.rect(8, y, w, 1, 'T'));
    s.disc(20, 21, 3, 'R'); s.set(19, 20, 'r'); s.set(18, 21, 'r');
    s.rect(18, 24, 2, 5, 'R'); s.rect(21, 24, 2, 5, 'R');
    return s.g;
  },
  quill() {
    const s = grid(30, 32);
    for (let i = 0; i <= 40; i++) {
      const t = i / 40, px = 26 - 16 * t, py = 1 + 21 * t, hw = Math.sin(Math.PI * Math.min(1, t * 1.1)) * 4.2;
      s.line(px - 0.81 * hw, py - 0.59 * hw, px, py, 'F'); s.line(px, py, px + 0.81 * hw, py + 0.59 * hw, 'E');
    }
    s.line(26, 1, 10, 22, 'E');
    s.line(10, 22, 6, 27, 'N', 2);
    s.rect(1, 24, 10, 7, 'B'); s.rect(3, 22, 6, 2, 'B'); s.rect(2, 25, 1, 4, 'b'); s.rect(3, 22, 6, 1, 'b');
    return s.g;
  },
  court() {
    const s = grid(34, 30);
    for (let r = 0; r < 7; r++) s.rect(16 - 2 * r, 1 + r, 2 + 4 * r, 1, 'A');
    for (let r = 2; r < 7; r++) s.set(16 - 2 * r + 1, 1 + r, 'a');
    s.disc(17, 5, 1, 'G');
    s.rect(2, 8, 30, 2, 'A'); s.rect(2, 9, 30, 1, 'a');
    [4, 10, 16, 22, 28].forEach(x => { s.rect(x - 1, 10, 5, 1, 'A'); s.rect(x, 11, 3, 11, 'A'); s.rect(x + 2, 11, 1, 11, 'a'); });
    s.rect(2, 22, 30, 2, 'A'); s.rect(1, 24, 32, 2, 'a'); s.rect(0, 26, 34, 2, 'A'); s.rect(0, 27, 34, 1, 'c');
    return s.g;
  },
  lens() {
    const s = grid(32, 32);
    s.disc(12, 12, 10, 'A'); s.disc(12, 12, 7, 'b'); s.disc(10, 10, 3, 'F');
    s.rect(3, 11, 2, 2, 'a'); s.set(20, 13, 'a');
    s.line(19, 19, 29, 29, 'W', 3); s.line(21, 19, 30, 28, 'D', 1);
    s.rect(27, 3, 3, 1, 'G'); s.rect(28, 2, 1, 3, 'G');
    return s.g;
  },
  books() {
    const s = grid(32, 28);
    // bottom: green law book
    s.rect(1, 20, 30, 7, 'V'); s.rect(1, 20, 30, 1, 'v'); s.rect(27, 21, 3, 5, 'P'); s.rect(27, 22, 3, 1, 'Q'); s.rect(27, 24, 3, 1, 'Q');
    s.rect(6, 22, 2, 3, 'G'); s.rect(18, 22, 2, 3, 'G'); s.rect(10, 23, 6, 1, 'G');
    // middle: red book, offset
    s.rect(4, 13, 26, 7, 'R'); s.rect(4, 13, 26, 1, 'r'); s.rect(4, 14, 3, 5, 'P'); s.rect(4, 15, 3, 1, 'Q'); s.rect(4, 17, 3, 1, 'Q');
    s.rect(11, 15, 2, 3, 'G'); s.rect(23, 15, 2, 3, 'G'); s.rect(15, 16, 6, 1, 'G');
    // top: blue book
    s.rect(2, 6, 24, 7, 'B'); s.rect(2, 6, 24, 1, 'b'); s.rect(22, 7, 3, 5, 'P'); s.rect(22, 8, 3, 1, 'Q'); s.rect(22, 10, 3, 1, 'Q');
    s.rect(6, 8, 2, 3, 'G'); s.rect(16, 8, 2, 3, 'G'); s.rect(10, 9, 4, 1, 'G');
    // bookmark ribbon
    s.rect(14, 1, 2, 5, 'R'); s.set(14, 0, 'r');
    return s.g;
  },
  docs() {
    const s = grid(32, 30);
    // back page (v1)
    s.rect(1, 1, 18, 22, 'Q'); s.rect(1, 1, 18, 1, 'P');
    [[5, 12], [8, 10], [11, 12], [14, 8]].forEach(([y, w]) => s.rect(4, y, w, 1, 'T'));
    // front page (v2)
    s.rect(11, 7, 19, 22, 'P'); s.rect(28, 7, 2, 22, 'Q');
    [[11, 13], [14, 11], [17, 13], [20, 9]].forEach(([y, w]) => s.rect(14, y, w, 1, 'T'));
    s.rect(14, 17, 13, 1, 'r'); // changed line
    // green tick badge
    s.disc(24, 24, 3, 'V'); s.set(22, 24, 'F'); s.set(23, 25, 'F'); s.set(24, 24, 'F'); s.set(25, 23, 'F'); s.set(26, 22, 'F');
    return s.g;
  },
  case() {
    const s = grid(32, 26);
    s.rect(11, 1, 10, 2, 'D'); s.rect(11, 1, 2, 7, 'D'); s.rect(19, 1, 2, 7, 'D');
    s.rect(1, 7, 30, 17, 'W'); s.rect(1, 7, 30, 1, 'L'); s.rect(1, 23, 30, 1, 'D');
    s.rect(1, 13, 30, 1, 'D'); s.rect(14, 11, 4, 5, 'G'); s.set(14, 11, 'H');
    s.rect(4, 9, 1, 3, 'L'); s.rect(27, 9, 1, 3, 'L');
    return s.g;
  },
};

const cache = {};
function bitmap(name) {
  if (!cache[name]) cache[name] = outline(SPRITES[name]());
  return cache[name];
}

export function drawSprites(root = document) {
  root.querySelectorAll('canvas[data-sprite]').forEach(cv => {
    const g = bitmap(cv.dataset.sprite); if (!g) return;
    const h = g.length, w = g[0].length, px = 6;
    cv.width = w * px; cv.height = h * px;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    g.forEach((row, y) => row.forEach((c, x) => { if (c) { ctx.fillStyle = PAL[c]; ctx.fillRect(x * px, y * px, px, px); } }));
  });
}
