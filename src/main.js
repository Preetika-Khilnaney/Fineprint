// Fineprint — app shell: routing, running the agent pipeline, and event wiring.
import './styles.css';
import {newAnalysis, runAll, runPipeline} from './engine/index.js';
import {SAMPLE_V1, SAMPLE_V2} from './data/samples.js';
import {$, esc, toast, copy} from './ui/dom.js';
import {drawSprites} from './ui/pixel.js';
import {S} from './ui/state.js';
import {attachMemory, saveToMemory, setOutcome, memAll, memSet} from './ui/memory.js';
import {readFile} from './ui/fileReaders.js';
import {renderAgents} from './ui/views/upload.js';
import {renderOverview} from './ui/views/overview.js';
import {renderClauses, renderClauseList} from './ui/views/clauses.js';
import {renderDiff} from './ui/views/diff.js';
import {renderRedline, renderRevised, redlineItems, revisedText} from './ui/views/redline.js';
import {renderNegotiate, renderEmail} from './ui/views/negotiate.js';
import {renderVersions} from './ui/views/versions.js';
import {renderMemory} from './ui/views/memory.js';
import {renderReport} from './ui/views/report.js';
import {renderEvaluation, runBenchmark} from './ui/views/evaluation.js';

/* ---------- navigation ---------- */
const NAV = [['overview', 'Overview', '--c-teal'], ['clauses', 'Clauses', '--c-yellow'], ['diff', 'Clause diff', '--c-pink'], ['redline', 'Redline', '--c-lime'], ['negotiate', 'Negotiate', '--c-orange'], ['versions', 'Versions', '--c-blue'], ['memory', 'Memory', '--c-violet'], ['evaluation', 'Evaluation', '--c-pink'], ['report', 'Report', '--c-teal']];
const VIEWS = ['upload', ...NAV.map(v => v[0])];
const RENDER = {upload: () => {}, overview: renderOverview, clauses: renderClauses, diff: renderDiff, redline: renderRedline, negotiate: renderNegotiate, versions: renderVersions, memory: renderMemory, evaluation: renderEvaluation, report: renderReport};
const current = () => { const v = (location.hash || '#overview').slice(1); return VIEWS.includes(v) ? v : 'overview'; };

function renderNav() {
  const cur = current();
  $('#nav').innerHTML = NAV.map(([k, l, c]) => `<a href="#${k}" class="${k === cur ? 'on' : ''}" style="--tabc:var(${c})" ${k === cur ? 'aria-current="page"' : ''}>${l}</a>`).join('');
}

function route() {
  const v = current();
  VIEWS.forEach(k => ($('#v-' + k).hidden = k !== v));
  renderNav();
  if (S.A || v === 'upload') RENDER[v]();
  window.scrollTo({top: 0});
}

/* ---------- running the pipeline ---------- */
function fillPersp(roles, sel) { $('#persp').innerHTML = roles.map(r => `<option ${r === sel ? 'selected' : ''}>${esc(r)}</option>`).join(''); }

async function run({instant = false, resetPersp = false, overrides = {}} = {}) {
  if (S.running) return;
  const raw = $('#src').value.trim();
  if (raw.length < 40) { toast('Paste or upload a contract first'); location.hash = '#upload'; return; }
  S.running = true; $('#btnRun').disabled = true;
  const A = newAnalysis(raw, {name: S.docName, juris: $('#juris').value, persp: resetPersp ? null : ($('#persp').value || null), overrides});
  const watch = $('#speed').checked && !instant, st = {}, t0 = performance.now();
  if (watch) location.hash = '#upload';
  $('#orchState').textContent = 'Dispatching';
  renderAgents(st);
  try {
    await runPipeline(A, {delay: watch ? 120 : 0, onStep: (agent, status, out) => {
      st[agent.key] = {st: status, out}; renderAgents(st);
      $('#orchState').textContent = status === 'run' ? agent.name : 'Complete';
    }});
  } catch (e) { toast('The review stopped: ' + e.message); S.running = false; $('#btnRun').disabled = false; return; }
  $('#pipeTime').textContent = Math.round(performance.now() - t0) + ' ms';
  S.A = A; S.decisions = {}; S.edits = {}; S.catFilter = null; S.open = new Set(); S.V2 = null;
  $('#vout').innerHTML = '<div class="empty">Load or paste version 2, then compare.</div>';
  fillPersp(A.ctx.parties.map(p => p.role), A.ctx.us);
  attachMemory(A); saveToMemory(A, S.docName);
  S.running = false; $('#btnRun').disabled = false;
  if (watch) { toast(`Review complete · risk ${A.score}/100`); location.hash = '#overview'; }
  route();
}

function rerunFast(overrides) {
  const A = runAll(S.A.raw, {name: S.docName, juris: S.A.juris, persp: S.A.ctx.us, overrides});
  S.A = A; attachMemory(A); saveToMemory(A, S.docName); route();
}

async function handleFile(file, target) {
  if (!file) return;
  toast('Reading ' + file.name);
  try {
    const t = await readFile(file);
    if (target === 'v2') { $('#v2src').value = t; toast('Version 2 loaded'); }
    else { $('#src').value = t; S.docName = file.name; await run({resetPersp: true}); }
  } catch (e) { toast(e.message); }
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('button, a'); if (!t) return;
  const d = t.dataset;
  if (d.goto) {
    S.catFilter = null; $('#q').value = ''; $('#rf').value = 'all';
    location.hash = '#clauses';
    setTimeout(() => { renderClauses(); const el = document.getElementById('cl-' + d.goto); if (el) { el.scrollIntoView({behavior: 'smooth', block: 'start'}); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1600); } }, 40);
    return;
  }
  if (d.scroll) { e.preventDefault(); document.getElementById(d.scroll)?.scrollIntoView({behavior: 'smooth', block: 'start'}); return; }
  if (d.cat !== undefined && (t.classList.contains('cbar') || t.classList.contains('pill-t'))) { S.catFilter = d.cat; location.hash = '#clauses'; return; }
  if (d.toggle) { S.open.has(d.toggle) ? S.open.delete(d.toggle) : S.open.add(d.toggle); renderOverview(); return; }
  if (d.ff) { S.findFilter = d.ff; renderOverview(); return; }
  if (d.cf !== undefined) { S.catFilter = d.cf || null; renderClauses(); return; }
  if (d.addrl) {
    location.hash = '#redline';
    setTimeout(() => {
      const r = S.A.risks.find(q => q.id === d.addrl), items = redlineItems();
      const it = items.find(q => q.id === d.addrl) || items.find(q => q.clauseId && q.clauseId === r.clauseId);
      const el = it && document.getElementById('rl-' + it.id);
      if (el) el.scrollIntoView({behavior: 'smooth', block: 'center'});
    }, 60);
    return;
  }
  if (d.dec !== undefined && d.rid) { S.decisions[d.rid] = d.dec; renderRedline(); return; }
  if (d.delask) { $('#del-' + d.delask).innerHTML = `<span>Delete permanently?</span><button class="btn b-pink sm" data-del="${d.delask}">Delete</button><button class="link" data-delno="1">Keep</button>`; return; }
  if (d.del) { memSet(memAll().filter(r => r.id !== d.del)); attachMemory(S.A); renderMemory(); toast('Deleted from memory'); return; }
  if (d.delno) { renderMemory(); return; }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.reclass) { S.A.overrides = {...S.A.overrides, [t.dataset.reclass]: t.value}; rerunFast(S.A.overrides); toast('Clause recategorised and re-scored'); return; }
  if (t.dataset.oc) { setOutcome(S.A, t.dataset.oc, t.value); toast('Outcome saved to memory'); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.edit) { S.edits[t.dataset.edit] = t.value; clearTimeout(S._et); S._et = setTimeout(renderRevised, 250); }
});

$('#btnRun').onclick = () => run();
$('#btnUpload').onclick = () => $('#file').click();
$('#file').onchange = e => handleFile(e.target.files[0]);
const drop = $('#drop');
['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));
$('#btnSample1').onclick = () => { $('#src').value = SAMPLE_V1; S.docName = 'Sample · Vendor agreement v1'; toast('Sample v1 loaded. Select Run review.'); };
$('#btnSample2').onclick = () => { $('#src').value = SAMPLE_V2; S.docName = 'Sample · Vendor agreement v2'; toast('Sample v2 loaded. Select Run review.'); };
$('#btnClear').onclick = () => { $('#src').value = ''; $('#src').focus(); };
$('#juris').onchange = () => S.A && run({instant: true});
$('#persp').onchange = () => S.A && run({instant: true});
$('#q').oninput = renderClauseList;
$('#rf').onchange = renderClauseList;
$('#plainToggle').onclick = () => { S.plain = !S.plain; renderClauses(); };
$('#diffCat').onchange = renderDiff;
$('#wdToggle').onclick = () => { S.wordDiff = !S.wordDiff; renderDiff(); };
$('#acceptAll').onclick = () => { redlineItems().filter(r => r.level === 'high').forEach(r => (S.decisions[r.id] = 'accept')); renderRedline(); toast('High-risk edits accepted'); };
$('#resetRl').onclick = () => { S.decisions = {}; S.edits = {}; renderRedline(); };
$('#copyRevised').onclick = () => copy(revisedText().text, 'Revised contract copied');
$('#reanalyze').onclick = () => {
  if (!Object.values(S.decisions).includes('accept')) { toast('Accept at least one edit first'); return; }
  $('#src').value = revisedText().text; S.docName = S.docName.replace(/ · revised$/, '') + ' · revised';
  run();
};
$('#tone').onchange = renderEmail; $('#mustOnly').onchange = renderEmail;
$('#copyEmail').onclick = () => copy(S.emailText, 'Message copied');
$('#loadV2').onclick = () => { $('#v2src').value = SAMPLE_V2; toast('Sample v2 loaded'); };
$('#uploadV2').onclick = () => $('#fileV2').click();
$('#fileV2').onchange = e => handleFile(e.target.files[0], 'v2');
$('#btnCompare').onclick = () => {
  const t = $('#v2src').value.trim();
  if (t.length < 40) { toast('Paste or load version 2 first'); return; }
  S.V2 = runAll(t, {name: 'v2', juris: S.A.juris, persp: S.A.ctx.us}); renderVersions();
};
$('#vfilter').onchange = renderVersions;
$('#btnBench').onclick = runBenchmark;
$('#copyMd').onclick = () => copy(S.A.md, 'Report copied as Markdown');
$('#copyJson').onclick = () => copy(JSON.stringify(S.A.json, null, 2), 'JSON copied');
window.addEventListener('hashchange', route);

/* ---------- boot: open on a reviewed sample so every view has content ---------- */
drawSprites();
renderAgents();
$('#src').value = SAMPLE_V1;
fillPersp(['Customer', 'Vendor'], 'Customer');
run({instant: true});
