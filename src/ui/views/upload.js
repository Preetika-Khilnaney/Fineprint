// New review view: agent pipeline progress list.
import {AGENTS} from '../../engine/index.js';
import {$, esc} from '../dom.js';

export function renderAgents(state = {}) {
  $('#agents').innerHTML = AGENTS.map((a, i) => {
    const s = state[a.key] || {};
    return `<li class="agent ${s.st || ''}"><span class="st">${s.st === 'done' ? '✓' : s.st === 'run' ? '' : i + 1}</span>
      <span><span class="nm">${a.name}</span><span class="ds">${a.description}</span></span>
      <span class="out">${esc(s.out || '')}</span></li>`;
  }).join('');
}
