# Fineprint · Evaluation Report

_Generated 2026-11-16 13:09 UTC by `npm run eval` · Node v22.23.4 · Intel(R) Xeon(R) Processor @ 2.10GHz (2 cores) · run time 68.464s_

## 1. Dataset and protocol

**Dataset:** CUAD v1 — Contract Understanding Atticus Dataset (Hendrycks et al., NeurIPS 2021), CC BY 4.0.

**Protocol:** All tuning on TRAIN/VAL; every number below is computed on the held-out TEST split (102 contracts) unless stated.

| Split | Contracts | Annotated spans | Use |
|---|---:|---:|---|
| Train | 351 | 9828 | Fit Naive Bayes models, calibrate rule patterns |
| Validation | 57 | 1352 | Select hyper-parameters, blend weight, thresholds |
| Test (official CUAD test split) | 102 | 2643 | Report results (never used for tuning) |

Test contracts have a median length of 3,910.5 words (max 47,733). CUAD's 41 categories are mapped to Fineprint's taxonomy in `src/engine/ml/cuadMapping.js`; metadata categories (parties, dates, document name) are evaluated through extraction, not classification.

## 2. Clause classification

Task: assign each annotated clause (plus sampled un-annotated sentences as *General*) to one of 10 classes. Test items: 1943. Predictions outside the CUAD label space are projected to *General*.

| System | Accuracy (95% CI) | Macro-P | Macro-R | Macro-F1 (95% CI) | Weighted-F1 | ms / clause |
|---|---|---:|---:|---|---:|---:|
| Keyword rules only | 0.565 (0.541–0.587) | 0.570 | 0.583 | 0.568 (0.537–0.595) | 0.572 | 0.148 |
| Naive Bayes only | 0.781 (0.763–0.801) | 0.779 | 0.801 | 0.787 (0.760–0.811) | 0.782 | 0.163 |
| **Hybrid (deployed)** | 0.786 (0.768–0.805) | 0.788 | 0.797 | 0.790 (0.765–0.813) | 0.787 | 0.15 |

McNemar's test, hybrid vs rules: χ² = 289.358 (significant, p < 0.001); 535 items only the hybrid got right, 104 only the rules got right. Confidence intervals: 500-sample percentile bootstrap.

**Per-class results (hybrid)**

| Class | Precision | Recall | F1 | Support |
|---|---:|---:|---:|---:|
| Governing Law | 0.906 | 0.978 | 0.941 | 89 |
| Liability | 0.888 | 0.787 | 0.835 | 141 |
| Termination | 0.624 | 0.682 | 0.652 | 107 |
| Term & Renewal | 0.821 | 0.902 | 0.860 | 112 |
| Non-Compete | 0.742 | 0.804 | 0.772 | 143 |
| Assignment | 0.852 | 0.804 | 0.828 | 179 |
| IP Ownership | 0.696 | 0.829 | 0.757 | 216 |
| Warranties | 0.800 | 0.667 | 0.727 | 18 |
| Payment Terms | 0.733 | 0.766 | 0.749 | 197 |
| General | 0.816 | 0.749 | 0.781 | 741 |

**Confusion matrix (hybrid; rows = gold, columns = predicted)**

| | Governing | Liability | Termination | Term | Non-Compete | Assignment | IP | Warranties | Payment | General |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Governing Law | 87 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| Liability | 0 | 111 | 7 | 1 | 0 | 0 | 1 | 0 | 6 | 15 |
| Termination | 0 | 0 | 73 | 4 | 3 | 1 | 2 | 0 | 4 | 20 |
| Term & Renewal | 0 | 0 | 5 | 101 | 0 | 2 | 0 | 0 | 2 | 2 |
| Non-Compete | 0 | 2 | 0 | 1 | 115 | 2 | 14 | 0 | 1 | 8 |
| Assignment | 0 | 0 | 9 | 1 | 3 | 144 | 5 | 0 | 0 | 17 |
| IP Ownership | 0 | 0 | 3 | 0 | 4 | 7 | 179 | 0 | 1 | 22 |
| Warranties | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 12 | 1 | 3 |
| Payment Terms | 0 | 1 | 1 | 1 | 4 | 1 | 2 | 0 | 151 | 36 |
| General | 9 | 10 | 18 | 14 | 26 | 12 | 54 | 3 | 40 | 555 |

## 3. Risk-signal detection

Ten perspective-neutral signals are scored against the matching CUAD categories at two granularities: **contract level** (does the contract contain the clause?) and **span level** (recall over annotated spans, precision over flagged sentences).

| Signal | CUAD category | Contract P | Contract R | Contract F1 | Span F1 | Pattern-only contract F1 |
|---|---|---:|---:|---:|---:|---:|
| Uncapped liability | Uncapped Liability | 0.364 | 0.308 | 0.333 | 0.250 | 0.333 |
| Liability cap | Cap On Liability | 0.837 | 0.932 | 0.882 | 0.608 | 0.657 |
| Termination for convenience | Termination For Convenience | 0.545 | 0.414 | 0.471 | 0.330 | 0.471 |
| Automatic renewal | Renewal Term | 0.933 | 0.538 | 0.683 | 0.556 | 0.683 |
| Non-compete | Non-Compete | 0.826 | 0.826 | 0.826 | 0.368 | 0.826 |
| Exclusivity | Exclusivity | 0.765 | 0.788 | 0.776 | 0.303 | 0.776 |
| Perpetual or irrevocable licence | Irrevocable Or Perpetual License | 0.786 | 0.846 | 0.815 | 0.756 | 0.833 |
| IP ownership transfer | Ip Ownership Assignment | 0.629 | 0.957 | 0.759 | 0.367 | 0.759 |
| Restriction on assignment | Anti-Assignment | 0.970 | 0.903 | 0.935 | 0.631 | 0.935 |
| Change of control | Change Of Control | 0.630 | 0.654 | 0.642 | 0.455 | 0.642 |
| **Macro average** | | 0.729 | 0.717 | **0.712** | 0.462 | 0.692 |

## 4. Efficiency

Full 12-agent pipeline on all 102 test contracts (single thread, after JIT warm-up).

| Metric | Value |
|---|---:|
| Latency p50 / p90 / p95 / p99 | 34.725 / 134.459 / 174.201 / 336.336 ms |
| Latency max | 350.755 ms |
| Throughput | 121,577 words/s · 1,885 clauses/s |
| Scaling (least squares) | 7.293 ms per 1,000 words + 6.641 ms (R² = 0.895) |
| App bundle | 588 KB JS (112 KB gzip) + 25 KB CSS (6 KB gzip) |
| Lazy-loaded readers | 2125 KB (601 KB gzip), only when a PDF/DOCX is uploaded |

## 5. Hallucination safeguards

**In production (real findings on the test contracts)**

| Check | Passed | Total | Rate |
|---|---:|---:|---:|
| Evidence grounded in contract text | 182 | 182 | 100.0% |
| Figures traceable to the contract or statute | 648 | 648 | 100.0% |
| Rule corroborated by independent detector | 17 | 19 | 89.5% |
| Consistent with extracted facts | 648 | 648 | 100.0% |
| Missing clauses confirmed by full-text scan | 319 | 466 | 68.5% |
| Clauses classified with confidence ≥ 50% | 10307 | 11267 | 91.5% |
| Document recognised as a two-party contract | 99 | 102 | 97.1% |

Findings: 648 · verified 499 · flagged for review 149 · suppressed 0. Documents flagged as low-confidence reviews: 5.

**Mutation testing (injected hallucinations)**

Known faults were injected into real analyses of every test contract, then the verifier was run.

| Injected fault | Injected | Caught | Catch rate |
|---|---:|---:|---:|
| Finding cites text that is not in the contract | 99 | 99 | 100.0% |
| Explanation contains an invented figure | 99 | 99 | 100.0% |
| Rule finding attached to an unrelated clause | 99 | 99 | 100.0% |
| Finding contradicts extracted facts | 92 | 92 | 100.0% |
| Claims a clause is missing when it is present | 84 | 80 | 95.2% |
| **Overall** | 473 | 469 | **99.2%** |

## 6. Robustness

Hybrid classifier macro-F1 on perturbed test clauses (baseline 0.790).

| Perturbation | Macro-F1 | Δ |
|---|---:|---:|
| lowercase | 0.790 | +0.000 |
| uppercase | 0.790 | +0.000 |
| whitespace | 0.790 | +0.000 |
| ocr noise 2pct | 0.772 | -0.018 |
| truncated 60pct | 0.760 | -0.030 |

## 7. Reliability

- Determinism: 102/102 test contracts produced byte-identical findings on a second run.
- Parse coverage (share of contract words inside analysed clauses): median 99.7%, 10th percentile 98.3%; 2 contracts below 80% are flagged as low-confidence.
- Regression samples: one-sided v1 scores 95/100 with 10 high risks; negotiated v2 scores 35/100.

## 8. Limitations of this evaluation

- CUAD has no Confidentiality, Indemnity, Data Protection, Force Majeure or Dispute Resolution categories, so those classes are only covered by unit tests and the bundled samples.
- Span-level scores are bounded by annotation granularity: CUAD spans often cover only part of a sentence, or several sentences.
- Risk severity (high/medium/low) is a policy choice and is not scored against CUAD, which labels clause presence, not risk.
- CUAD contracts are US SEC filings; performance on Indian, EU or UK drafting styles has not been measured on a public benchmark.
- The weakest signal is *Uncapped liability* (contract F1 0.333 on only 13 positive test contracts). CUAD marks it through carve-outs from a liability cap, which are often spread over several sentences; small positive counts also make per-signal scores noisy.

---
_Citation: Hendrycks, D., Burns, C., Chen, A., & Ball, S. (2021). CUAD: An Expert-Annotated NLP Dataset for Legal Contract Review. NeurIPS Datasets and Benchmarks. Data licensed CC BY 4.0 by The Atticus Project._
