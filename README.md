# Fineprint — Legal Contract Review Agent (PS-09)

A multi-agent legal assistant that reads a contract, splits it into clauses, classifies each clause, compares it
with a fair standard, flags legal and financial risk, **checks every finding against the contract text**,
explains it in plain English, scores the contract and drafts the redlines and negotiation asks you need.

> Fineprint is a legal assistant, not a lawyer. Use its findings to prepare for review by qualified counsel.

Everything runs in the browser. No contract text is sent to a server.

| | |
|---|---|
| **Dataset** | CUAD v1 — 510 expert-annotated commercial contracts (NeurIPS 2021, CC BY 4.0) |
| **Clause classification** | macro-F1 **0.790** (95% CI 0.765–0.813) on the held-out CUAD test split, vs 0.568 for keyword rules alone (McNemar p < 0.001) |
| **Risk-signal detection** | contract-level macro-F1 **0.712** across 10 signals |
| **Hallucination control** | 100% of findings grounded in verbatim contract text; **99.2%** of 473 injected faults caught |
| **Speed** | p50 **35 ms**, p95 174 ms per contract · ~120,000 words/s · deterministic |

Full results: [`docs/EVALUATION.md`](docs/EVALUATION.md), also shown in the app under **Evaluation**.

---

## Quick start (VS Code)

Requirements: **Node.js 18 or newer** (check with `node -v`).

1. Unzip the project and open the folder in VS Code (**File → Open Folder…**).
2. Open the terminal (**Terminal → New Terminal**) and run:

   ```bash
   npm install
   npm run dev
   ```

3. Your browser opens at **http://localhost:5173**. The app starts with a sample vendor agreement already reviewed.

The trained models are committed, so the app and the tests work without downloading the dataset.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server with hot reload |
| `npm test` | Run the unit tests (engine, classifier, signals, verifier) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run review -- samples/vendor-agreement-v1.txt --region IN` | Review a contract from the terminal and print the Markdown report |
| `npm run review -- samples/vendor-agreement-v1.txt --json` | Same, as structured JSON |
| `npm run data:cuad` | Download CUAD v1 into `data/cuad/raw` |
| `npm run data:prepare` | Build the train / validation / test splits |
| `npm run train` | Train and tune the clause classifier → `src/engine/ml/model.js` |
| `npm run train:signals` | Train and tune the signal detectors → `src/engine/ml/signalModels.js` |
| `npm run eval` | Run the full evaluation → `src/data/evaluation.json`, `docs/EVALUATION.md` |
| `npm run reproduce` | All of the above, end to end (about 3 minutes after download) |

VS Code extras are in `.vscode/`: recommended extensions, a **Debug Fineprint in Chrome** launch profile
(start `npm run dev` first) and tasks for the dev server and tests.

---

## What it does

| Area | Features |
| --- | --- |
| **Ingest** | PDF (pdf.js), DOCX (mammoth) and plain text; drag and drop or paste |
| **Overview** | Risk score 0–100, clause and risk counts, compliance %, verification status, findings with evidence, explanation and recommendation, risk breakdown, clause map, missing clauses |
| **Clauses** | Section outline, category filters, search, risk filter, plain-English rewrite, classifier confidence, extracted values, manual re-categorisation (re-scores instantly) |
| **Clause diff** | Standard clause, contract clause and risk side by side, with an optional word-level diff |
| **Redline** | Suggested replacement wording for every risky or missing clause; accept, reject or edit; live revised contract; re-run the review on the revised text |
| **Negotiate** | Must-have / should-have / nice-to-have asks with fallbacks, leverage points, a draft message, outcome tracking |
| **Versions** | Compare v1 and v2: score change, risks resolved and introduced, clause-by-clause changes |
| **Memory** | Past reviews stored in `localStorage`; similar clauses and their negotiation outcomes are matched automatically |
| **Evaluation** | Benchmark results on CUAD: ablation, confusion matrix, per-class F1, signal detection, hallucination tests, latency scaling, robustness, plus a live in-browser benchmark |
| **Jurisdiction** | India, US, EU and UK notes (e.g. Indian Contract Act §27 and §74, MSMED Act 45-day rule, GDPR Art. 28, EU Late Payment Directive, UK UCTA) |
| **Report** | Executive summary, clause breakdown, risk analysis with evidence, verification summary, recommendations; copy as Markdown or JSON |

---

## Architecture

Twelve agents run in order over one shared analysis object (a blackboard). Each reads what earlier agents
wrote and adds its own results.

```
                         ┌────────────────────────────────┐
                         │      Agent 12 · Orchestrator   │
                         └───────────────┬────────────────┘
 raw text ─► 1 Document Parsing ─► 2 Clause Segmentation ─► 3 Clause Classification (rules + Naive Bayes)
          ─► 4 Information Extraction ─► 5 Template Comparison ─► 6 Risk Detection (22 rules + 10 signals)
          ─► 7 Legal Reasoning ─► 8 Verification ─► 9 Plain Language ─► 10 Risk Scoring ─► 11 Report
```

| # | Agent | Job |
|---|---|---|
| 1 | Document Parsing | Normalise text, detect title, parties, dates and perspective |
| 2 | Clause Segmentation | Split into sections and numbered clauses, with character offsets |
| 3 | Clause Classification | Hybrid keyword rules + CUAD-trained Naive Bayes, with heading anchor and scope guard |
| 4 | Information Extraction | Fees, notice periods, caps, interest, term, renewal, governing law |
| 5 | Template Comparison | Compare each clause with a fair standard clause |
| 6 | Risk Detection | 22 explainable rules plus 10 independent risk-signal detectors |
| 7 | Legal Reasoning | Missing clauses and jurisdiction-specific issues |
| 8 | **Verification** | Eight checks on every finding (below); suppresses or flags unsupported findings |
| 9 | Plain Language | Legalese → plain English |
| 10 | Risk Scoring | Score 0–100 and financial / legal / operational levels |
| 11 | Report Generator | Executive summary, Markdown and JSON reports |
| 12 | Orchestrator | Runs the pipeline and reports progress to the UI |

### Hallucination safeguards (Agent 8)

Every finding passes through these checks before it reaches the score or the screen:

1. **Evidence grounding** — the quoted evidence must exist verbatim in the contract. Findings that fail are suppressed.
2. **Numeric fidelity** — every figure in an explanation must appear in the contract, the extracted facts or the cited statute, or be recomputable from contract figures.
3. **Dual-detector agreement** — a rule finding is corroborated by an independent signal detector (different method).
4. **Cross-agent consistency** — findings must agree with what extraction found (e.g. no "uncapped liability" if a cap was extracted).
5. **Absence verification** — "missing clause" claims are confirmed by an independent full-text scan.
6. **Coverage** — the share of the document inside analysed clauses; low coverage marks the review as low-confidence.
7. **Classification confidence** — clauses classified with low confidence lower the finding's confidence.
8. **Structure sanity** — the document must be recognised as a two-party contract.

Each finding gets a confidence score and a status: **Verified**, **Needs review** or **Suppressed**. The UI shows
the status, the highlighted evidence and the checks it passed. Mutation testing injects five kinds of
hallucination into real analyses of all 102 test contracts; the verifier catches 99.2% of them.

### Dataset and training

- **CUAD v1** (Hendrycks et al., NeurIPS 2021; CC BY 4.0): 510 contracts, 41 categories, 13,000+ expert labels.
  The 41 categories are mapped to Fineprint's taxonomy in `src/engine/ml/cuadMapping.js`.
- **Splits:** 351 train · 57 validation (15% hash-based hold-out from the official train split) · 102 test
  (official CUAD test split, used only for reporting). See `data/cuad/README.md`.
- **Classifier:** Multinomial Naive Bayes on unigrams and bigrams with chi-square feature selection and Laplace
  smoothing, blended with keyword rules. The smoothing, feature count, blend weight and scope-guard threshold
  are chosen by grid search on the validation split.
- **Signal detectors:** regex patterns with context guards, plus binary Naive Bayes detectors whose thresholds are
  tuned on validation under precision floors. A learned detector is kept only if it beats its patterns on validation.

### Performance evaluation

`npm run eval` measures four areas on the held-out test split. See [`docs/EVALUATION.md`](docs/EVALUATION.md).

| Area | Metrics |
|---|---|
| Effectiveness | Accuracy, macro / weighted precision, recall and F1 with bootstrap 95% CIs; per-class F1; confusion matrix; McNemar's test for the rules vs hybrid ablation; contract- and span-level F1 for signals |
| Faithfulness | Grounding, numeric fidelity, agreement and consistency rates on real findings; mutation-testing catch rate |
| Efficiency | Latency p50 / p90 / p95 / p99, throughput, least-squares scaling with contract length, bundle size |
| Robustness and reliability | Macro-F1 under case, whitespace, OCR noise and truncation; determinism; parse coverage; regression samples |

### Project structure

```
fineprint/
├── index.html                    App shell markup
├── src/
│   ├── main.js                   Routing, running the pipeline, event wiring
│   ├── styles.css                Design tokens and all styles (light and dark)
│   ├── data/samples.js           Sample contracts (v1 one-sided, v2 negotiated)
│   ├── data/evaluation.json      Benchmark results shown on the Evaluation page
│   ├── engine/                   Framework-free review engine (browser and Node)
│   │   ├── index.js              Public API
│   │   ├── agents/01…12-*.js     The twelve agents
│   │   ├── classifier.js         Hybrid rules + Naive Bayes clause classifier
│   │   ├── signals.js            10 risk-signal detectors
│   │   ├── verification.js       Hallucination checks (Agent 8)
│   │   ├── ml/                   Naive Bayes, CUAD mapping, trained models
│   │   ├── parsing.js            Section and clause parsing, extraction
│   │   ├── rules.js              22 risk rules with explanation, fix, ask and fallback
│   │   ├── plainLanguage.js      Legalese → plain English
│   │   ├── report.js             Markdown / JSON report builders
│   │   └── knowledge/            Categories, standard clauses, jurisdiction notes
│   └── ui/                       Views, pixel sprites, file readers, memory
├── scripts/
│   ├── data/                     Download and prepare CUAD
│   ├── ml/                       Train the classifier and signal detectors
│   ├── eval/                     Evaluation harness and report renderer
│   └── review-cli.js             Command-line reviewer
├── data/cuad/                    Dataset README and split manifest (raw data is downloaded)
├── docs/EVALUATION.md            Generated evaluation report
├── samples/*.txt                 Sample contracts
└── tests/                        Unit tests
```

### Risk scoring

Each finding adds points: high 14, medium 6, low 2. The score is `100 × (1 − e^(−points / 70))`, so it rises
quickly with the first serious issues and approaches 100 without exceeding it. Financial, legal and operational
levels use the same points split by dimension. Compliance is the share of ten standard clauses that are present
and free of high-risk wording.

### Adding a risk rule

Add an object to `RULES` in `src/engine/rules.js`:

```js
{id: 'audit_rights', level: 'medium', dim: 'operational', issue: 'Unlimited audit rights',
 test: (c, x) => /audit/i.test(c.text) && /at any time/i.test(c.text),
 why: x => `${x.them} can audit ${x.us} at any time, without notice or limits.`,
 rec: () => 'Limit audits to once a year, with 30 days\' notice, during business hours.',
 fix: () => 'Either party may audit compliance once per year on thirty (30) days\' written notice, during normal business hours.',
 ask: () => 'Limit audits to once a year with notice.', fallback: 'Accept twice a year.'}
```

The rule then appears in findings, the diff, redline, negotiation plan and report automatically, and passes
through the verifier. To have it corroborated by a signal detector, map it in `RULE_SIGNAL` in
`src/engine/verification.js`. Add a test in `tests/`.

---

## Limitations

- CUAD has no Confidentiality, Indemnity, Data Protection, Force Majeure or Dispute Resolution categories; those
  are covered by rules, unit tests and the bundled samples, not by the benchmark.
- CUAD contracts are US SEC filings. Indian, EU and UK drafting has not been measured on a public benchmark.
- The weakest signal is uncapped liability (test F1 0.33 on 13 positive contracts).
- Risk severity is a policy choice; CUAD labels clause presence, not risk.
- Scanned PDFs need OCR first. Old `.doc` files must be saved as `.docx` or PDF.
- Jurisdiction notes are general information current to mid-2026, not legal advice.

## Citation

Hendrycks, D., Burns, C., Chen, A., & Ball, S. (2021). *CUAD: An Expert-Annotated NLP Dataset for Legal Contract
Review.* NeurIPS Datasets and Benchmarks. Data licensed CC BY 4.0 by The Atticus Project.
