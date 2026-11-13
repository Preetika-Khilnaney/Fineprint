# Fineprint — Legal Contract Review Agent (PS-09)

A multi-agent legal assistant that reads a contract, splits it into clauses, compares each clause with a fair
standard, flags legal and financial risk, explains it in plain English, scores the contract and drafts the
redlines and negotiation asks you need.

> Fineprint is a legal assistant, not a lawyer. Use its findings to prepare for review by qualified counsel.

Everything runs in the browser. No contract text is sent to a server.

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

Other commands:

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server with hot reload |
| `npm test` | Run the engine tests (Node's built-in test runner) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run review -- samples/vendor-agreement-v1.txt --region IN` | Review a contract from the terminal and print the Markdown report |
| `npm run review -- samples/vendor-agreement-v1.txt --json` | Same, as structured JSON |

VS Code extras are in `.vscode/`: recommended extensions, a **Debug Fineprint in Chrome** launch profile
(start `npm run dev` first) and tasks for the dev server and tests.

---

## What it does

| Area | Features |
| --- | --- |
| **Ingest** | PDF (pdf.js), DOCX (mammoth) and plain text; drag and drop or paste |
| **Overview** | Risk score 0–100, high-risk count, compliance %, findings with explanation and recommendation, risk breakdown (financial / legal / operational), clause map, missing clauses, extracted key terms, risk by category |
| **Clauses** | Section outline, category filters, search, risk filter, plain-English rewrite, extracted values per clause, manual re-categorisation (re-scores instantly) |
| **Clause diff** | Standard clause, contract clause and risk side by side, with an optional word-level diff |
| **Redline** | Suggested replacement wording for every risky or missing clause; accept, reject or edit; live revised contract; re-run the review on the revised text |
| **Negotiate** | Must-have / should-have / nice-to-have asks with fallbacks, leverage points, a draft message (collaborative or firm), outcome tracking |
| **Versions** | Compare v1 and v2: score change, risks resolved and introduced, clause-by-clause changes |
| **Memory** | Past reviews stored in `localStorage`; similar clauses and their negotiation outcomes are matched automatically; success rate by issue |
| **Jurisdiction** | India, US, EU and UK notes (e.g. Indian Contract Act §27 and §74, MSMED Act 45-day rule, GDPR Art. 28, EU Late Payment Directive, UK UCTA) |
| **Report** | Executive summary, clause breakdown, risk analysis, recommendations, plain-language summary; copy as Markdown or JSON |

---

## Architecture

```
                   ┌───────────────────────────────┐
                   │   Agent 11 · Orchestrator     │
                   └──────────────┬────────────────┘
   raw text ─► 1 Document Parsing ─► 2 Clause Segmentation ─► 3 Clause Classification
            ─► 4 Information Extraction ─► 5 Template Comparison ─► 6 Risk Detection
            ─► 7 Legal Reasoning ─► 8 Plain Language ─► 9 Risk Scoring ─► 10 Report Generator
                                                                 │
                                    UI views: Overview · Clauses · Diff · Redline · Negotiate · Versions · Memory · Report
```

Each agent is a small module with the same shape:

```js
export const riskDetectionAgent = {
  key: 'detect',
  name: 'Risk Detection',
  description: 'Flags high, medium and low risks',
  run(A) { /* reads and writes the shared analysis object A */ return 'summary for the UI'; },
};
```

The orchestrator (`src/engine/agents/11-orchestrator.js`) runs them in order over one shared analysis object
and reports progress after each step, which is what the pipeline panel shows.

### Project structure

```
fineprint-app/
├── index.html                    App shell markup (sidebar, top bar, views)
├── src/
│   ├── main.js                   Routing, running the pipeline, event wiring
│   ├── styles.css                Design tokens + all styles (light and dark)
│   ├── data/samples.js           Sample contracts (v1 one-sided, v2 negotiated)
│   ├── engine/                   Framework-free review engine (runs in browser and Node)
│   │   ├── index.js              Public API
│   │   ├── agents/01…11-*.js     The eleven agents
│   │   ├── parsing.js            Section/clause parsing, classification, extraction
│   │   ├── rules.js              22 risk rules with explanation, fix, ask and fallback
│   │   ├── plainLanguage.js      Legalese → plain English
│   │   ├── report.js             Markdown / JSON report builders
│   │   ├── utils.js              Number words, money, similarity, word diff
│   │   └── knowledge/
│   │       ├── categories.js     18 clause categories + required clauses
│   │       ├── templates.js      Standard "ideal" clauses
│   │       └── jurisdictions.js  Region notes for IN / US / EU / UK
│   └── ui/
│       ├── dom.js, state.js      Helpers, icons, shared state
│       ├── memory.js             Legal memory (localStorage)
│       ├── pixel.js              Pixel-art legal sprites (scales, gavel, scroll, quill, courthouse, briefcase)
│       ├── fileReaders.js        PDF / DOCX / text readers (lazy-loaded)
│       └── views/*.js            One module per screen
├── scripts/review-cli.js         Command-line reviewer
├── samples/*.txt                 Sample contracts as files
└── tests/engine.test.js          Engine tests
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

`x.us` and `x.them` are the party names from your perspective; the rule then appears in findings, the diff,
redline, negotiation plan and report automatically. Add a test in `tests/engine.test.js`.

---

## Limitations

- Agents use rules and pattern matching rather than a language model. They are fast, private and explainable,
  but can miss risks phrased in unusual ways. A natural next step is to call an LLM inside agents 3, 6 and 7
  while keeping the rules as a safety net.
- Scanned PDFs need OCR first. Old `.doc` files must be saved as `.docx` or PDF.
- Jurisdiction notes are general information current to mid-2026, not legal advice.
