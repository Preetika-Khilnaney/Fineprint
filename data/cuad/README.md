# CUAD v1 — training and validation data

Fineprint's clause classifier and risk-signal detectors are trained and evaluated on **CUAD v1**, the
Contract Understanding Atticus Dataset.

- 510 commercial contracts from SEC EDGAR filings
- 41 clause categories, more than 13,000 expert annotations
- Hendrycks, D., Burns, C., Chen, A., & Ball, S. (2021). *CUAD: An Expert-Annotated NLP Dataset for Legal
  Contract Review.* NeurIPS Datasets and Benchmarks Track.
- Licence: **CC BY 4.0**, The Atticus Project — https://www.atticusprojectai.org/cuad

## Splits

| Split | Contracts | Source |
|---|---:|---|
| Train | 351 | CUAD official train split, minus the validation hold-out |
| Validation | 57 | 15% of the official train split, chosen by a stable hash of the contract title |
| Test | 102 | CUAD official test split — used only for reporting |

`splits.json` lists the contract titles in each split, so the split is reproducible exactly.

## Getting the data

The raw data (≈80 MB) is not committed. To rebuild everything:

```bash
npm run data:cuad       # download and extract data.zip from github.com/TheAtticusProject/cuad
npm run data:prepare    # write processed/{train,val,test}.json
npm run train           # fit the clause classifier  → src/engine/ml/model.js
npm run train:signals   # fit the signal detectors   → src/engine/ml/signalModels.js
npm run build           # needed for the bundle-size section
npm run eval            # → src/data/evaluation.json and docs/EVALUATION.md
```

If the download is blocked on your network, download `data.zip` manually from the CUAD repository and run
`npm run data:cuad -- path/to/data.zip`.

The trained models are committed, so the app and `npm test` work without downloading the dataset.
