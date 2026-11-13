// Small DOM + formatting helpers shared by every view.
export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
export const titleCase = s => s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
export const badge = l => `<span class="badge ${l}">${l === 'ok' ? 'Matches' : cap(l)}</span>`;
export const maxLvl = rs => rs.some(r => r.level === 'high') ? 'high' : rs.some(r => r.level === 'medium') ? 'medium' : rs.length ? 'low' : '';
export const fmtDate = (iso, opts = {day: 'numeric', month: 'short', year: 'numeric'}) => new Date(iso).toLocaleDateString('en-GB', opts);

export function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2400);
}

export async function copy(text, label = 'Copied') {
  try { await navigator.clipboard.writeText(text); toast(label); }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(label); } catch { toast('Select the text and copy it manually'); }
    ta.remove();
  }
}

export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
};

const P = 'width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
export const ICONS = {
  overview: `<svg ${P}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`,
  clauses: `<svg ${P}><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>`,
  diff: `<svg ${P}><rect x="3" y="4" width="8" height="16" rx="1.5"/><rect x="13" y="4" width="8" height="16" rx="1.5"/></svg>`,
  redline: `<svg ${P}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>`,
  negotiate: `<svg ${P}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>`,
  versions: `<svg ${P}><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M6 8.5v3a4 4 0 0 0 4 4h5.5"/></svg>`,
  memory: `<svg ${P}><path d="M4 5c0-1.1 3.6-2 8-2s8 .9 8 2-3.6 2-8 2-8-.9-8-2z"/><path d="M4 5v14c0 1.1 3.6 2 8 2s8-.9 8-2V5"/><path d="M4 12c0 1.1 3.6 2 8 2s8-.9 8-2"/></svg>`,
  report: `<svg ${P}><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>`,
  upload: `<svg ${P}><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>`,
  chev: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chev"><path d="M9 6l6 6-6 6"/></svg>`,
};
