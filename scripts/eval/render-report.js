// Renders docs/EVALUATION.md from the evaluation results object.
const pct = x => (x * 100).toFixed(1) + '%';
const f = x => x.toFixed(3);

export function render(E) {
  const C = E.classification, S = E.signals, P = E.pipeline, V = E.verification;
  const L = [];
  L.push('# Fineprint · Evaluation Report', '', `_Generated ${E.meta.generated.slice(0, 16).replace('T', ' ')} UTC by \`npm run eval\` · Node ${E.meta.node} · ${E.meta.cpu} (${E.meta.cores} cores) · run time ${E.meta.durationSec}s_`, '');
  L.push('## 1. Dataset and protocol', '', `**Dataset:** ${E.meta.dataset}.`, '', `**Protocol:** ${E.meta.protocol}`, '');
  L.push('| Split | Contracts | Annotated spans | Use |', '|---|---:|---:|---|');
  L.push(`| Train | ${E.dataset.splits.train.contracts} | ${E.dataset.splits.train.spans} | Fit Naive Bayes models, calibrate rule patterns |`);
  L.push(`| Validation | ${E.dataset.splits.val.contracts} | ${E.dataset.splits.val.spans} | Select hyper-parameters, blend weight, thresholds |`);
  L.push(`| Test (official CUAD test split) | ${E.dataset.splits.test.contracts} | ${E.dataset.splits.test.spans} | Report results (never used for tuning) |`, '');
  L.push(`Test contracts have a median length of ${E.dataset.testWords.median.toLocaleString()} words (max ${E.dataset.testWords.max.toLocaleString()}). CUAD's 41 categories are mapped to Fineprint's taxonomy in \`src/engine/ml/cuadMapping.js\`; metadata categories (parties, dates, document name) are evaluated through extraction, not classification.`, '');

  L.push('## 2. Clause classification', '', `Task: assign each annotated clause (plus sampled un-annotated sentences as *General*) to one of ${C.confusion.labels.length} classes. Test items: ${C.items.test}. Predictions outside the CUAD label space are projected to *General*.`, '');
  L.push('| System | Accuracy (95% CI) | Macro-P | Macro-R | Macro-F1 (95% CI) | Weighted-F1 | ms / clause |', '|---|---|---:|---:|---|---:|---:|');
  for (const [k, n] of [['rules', 'Keyword rules only'], ['model', 'Naive Bayes only'], ['hybrid', '**Hybrid (deployed)**']]) {
    const x = C[k]; L.push(`| ${n} | ${f(x.accuracy)} (${x.accuracyCI.map(f).join('–')}) | ${f(x.macro.p)} | ${f(x.macro.r)} | ${f(x.macro.f1)} (${x.macroF1CI.map(f).join('–')}) | ${f(x.weightedF1)} | ${x.msPerClause} |`);
  }
  L.push('', `McNemar's test, hybrid vs rules: χ² = ${C.mcnemar.chi2} (${C.mcnemar.significant ? 'significant, p < 0.001' : 'not significant at p < 0.001'}); ${C.mcnemar.hybridOnlyCorrect} items only the hybrid got right, ${C.mcnemar.rulesOnlyCorrect} only the rules got right. Confidence intervals: 500-sample percentile bootstrap.`, '');
  L.push('**Per-class results (hybrid)**', '', '| Class | Precision | Recall | F1 | Support |', '|---|---:|---:|---:|---:|');
  C.hybrid.perClass.forEach(x => L.push(`| ${x.label} | ${f(x.p)} | ${f(x.r)} | ${f(x.f1)} | ${x.n} |`));
  L.push('', '**Confusion matrix (hybrid; rows = gold, columns = predicted)**', '', '| | ' + C.confusion.labels.map(l => l.split(' ')[0]).join(' | ') + ' |', '|---|' + C.confusion.labels.map(() => '---:').join('|') + '|');
  C.confusion.matrix.forEach((row, i) => L.push(`| ${C.confusion.labels[i]} | ${row.join(' | ')} |`));

  L.push('', '## 3. Risk-signal detection', '', 'Ten perspective-neutral signals are scored against the matching CUAD categories at two granularities: **contract level** (does the contract contain the clause?) and **span level** (recall over annotated spans, precision over flagged sentences).', '');
  L.push('| Signal | CUAD category | Contract P | Contract R | Contract F1 | Span F1 | Pattern-only contract F1 |', '|---|---|---:|---:|---:|---:|---:|');
  S.perSignal.forEach(s => L.push(`| ${s.label} | ${s.cuad} | ${f(s.hybrid.contract.p)} | ${f(s.hybrid.contract.r)} | ${f(s.hybrid.contract.f1)} | ${f(s.hybrid.span.f1)} | ${f(s.pattern.contract.f1)} |`));
  L.push(`| **Macro average** | | ${f(S.macro.hybrid.contractP)} | ${f(S.macro.hybrid.contractR)} | **${f(S.macro.hybrid.contractF1)}** | ${f(S.macro.hybrid.spanF1)} | ${f(S.macro.pattern.contractF1)} |`, '');

  L.push('## 4. Efficiency', '', `Full 12-agent pipeline on all ${P.contracts} test contracts (single thread, after JIT warm-up).`, '');
  L.push('| Metric | Value |', '|---|---:|');
  L.push(`| Latency p50 / p90 / p95 / p99 | ${P.latencyMs.p50} / ${P.latencyMs.p90} / ${P.latencyMs.p95} / ${P.latencyMs.p99} ms |`, `| Latency max | ${P.latencyMs.max} ms |`,
    `| Throughput | ${P.throughput.wordsPerSec.toLocaleString()} words/s · ${P.throughput.clausesPerSec.toLocaleString()} clauses/s |`,
    `| Scaling (least squares) | ${P.scaling.msPerThousandWords} ms per 1,000 words + ${P.scaling.interceptMs} ms (R² = ${P.scaling.r2}) |`);
  if (E.web.appJsKB) L.push(`| App bundle | ${E.web.appJsKB.raw} KB JS (${E.web.appJsKB.gzip} KB gzip) + ${E.web.cssKB.raw} KB CSS (${E.web.cssKB.gzip} KB gzip) |`, `| Lazy-loaded readers | ${E.web.lazyKB.raw} KB (${E.web.lazyKB.gzip} KB gzip), only when a PDF/DOCX is uploaded |`);
  L.push('', '## 5. Hallucination safeguards', '', '**In production (real findings on the test contracts)**', '', '| Check | Passed | Total | Rate |', '|---|---:|---:|---:|');
  V.production.checks.forEach(k => L.push(`| ${k.name} | ${k.passed} | ${k.total} | ${pct(k.rate)} |`));
  L.push('', `Findings: ${V.production.findings} · verified ${V.production.verified} · flagged for review ${V.production.review} · suppressed ${V.production.suppressed}. Documents flagged as low-confidence reviews: ${V.production.lowConfidenceDocs}.`, '');
  L.push('**Mutation testing (injected hallucinations)**', '', 'Known faults were injected into real analyses of every test contract, then the verifier was run.', '', '| Injected fault | Injected | Caught | Catch rate |', '|---|---:|---:|---:|');
  V.mutation.types.forEach(m => L.push(`| ${m.name} | ${m.injected} | ${m.caught} | ${pct(m.rate)} |`));
  L.push(`| **Overall** | ${V.mutation.injected} | ${V.mutation.caught} | **${pct(V.mutation.rate)}** |`, '');
  L.push('## 6. Robustness', '', `Hybrid classifier macro-F1 on perturbed test clauses (baseline ${f(E.robustness.base)}).`, '', '| Perturbation | Macro-F1 | Δ |', '|---|---:|---:|');
  E.robustness.perturbations.forEach(p => L.push(`| ${p.id.replace(/_/g, ' ')} | ${f(p.macroF1)} | ${p.delta >= 0 ? '+' : ''}${f(p.delta)} |`));
  L.push('', '## 7. Reliability', '', `- Determinism: ${E.reliability.determinism.identical}/${E.reliability.determinism.runs} test contracts produced byte-identical findings on a second run.`,
    `- Parse coverage (share of contract words inside analysed clauses): median ${pct(P.coverage.median)}, 10th percentile ${pct(P.coverage.p10)}; ${P.coverage.below80} contracts below 80% are flagged as low-confidence.`,
    `- Regression samples: one-sided v1 scores ${E.reliability.regression.sampleV1.score}/100 with ${E.reliability.regression.sampleV1.high} high risks; negotiated v2 scores ${E.reliability.regression.sampleV2.score}/100.`, '');
  L.push('## 8. Limitations of this evaluation', '', '- CUAD has no Confidentiality, Indemnity, Data Protection, Force Majeure or Dispute Resolution categories, so those classes are only covered by unit tests and the bundled samples.',
    '- Span-level scores are bounded by annotation granularity: CUAD spans often cover only part of a sentence, or several sentences.',
    '- Risk severity (high/medium/low) is a policy choice and is not scored against CUAD, which labels clause presence, not risk.',
    '- CUAD contracts are US SEC filings; performance on Indian, EU or UK drafting styles has not been measured on a public benchmark.');
  const weak = [...S.perSignal].sort((a, b) => a.hybrid.contract.f1 - b.hybrid.contract.f1)[0];
  L.push(`- The weakest signal is *${weak.label}* (contract F1 ${weak.hybrid.contract.f1.toFixed(3)} on only ${weak.hybrid.positives} positive test contracts). CUAD marks it through carve-outs from a liability cap, which are often spread over several sentences; small positive counts also make per-signal scores noisy.`, '');
  L.push('---', '_Citation: Hendrycks, D., Burns, C., Chen, A., & Ball, S. (2021). CUAD: An Expert-Annotated NLP Dataset for Legal Contract Review. NeurIPS Datasets and Benchmarks. Data licensed CC BY 4.0 by The Atticus Project._');
  return L.join('\n') + '\n';
}
