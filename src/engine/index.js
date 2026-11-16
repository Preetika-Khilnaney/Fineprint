// Public entry point for the contract review engine.
export {AGENTS, newAnalysis, runAll, runPipeline} from './agents/12-orchestrator.js';
export {verify} from './verification.js';
export {detectSignals, SIGNALS} from './signals.js';
export {classifyText, MODEL_INFO} from './classifier.js';
export {wordDiff, jaccard, hash, fmtMoney} from './utils.js';
export {CATS, REQUIRED} from './knowledge/categories.js';
export {STD, GOOD_RE, RISKY_RE, fillStd} from './knowledge/templates.js';
export {REGION} from './knowledge/jurisdictions.js';
export {execSummary, plainSummary} from './report.js';
