// Agent 12 · Orchestrator
// Runs agents 1–11 in order over a shared analysis object, reporting progress after each step.
import {documentParsingAgent} from './01-document-parsing.js';
import {clauseSegmentationAgent} from './02-clause-segmentation.js';
import {clauseClassificationAgent} from './03-clause-classification.js';
import {informationExtractionAgent} from './04-information-extraction.js';
import {templateComparisonAgent} from './05-template-comparison.js';
import {riskDetectionAgent} from './06-risk-detection.js';
import {legalReasoningAgent} from './07-legal-reasoning.js';
import {verificationAgent} from './08-verification.js';
import {plainLanguageAgent} from './09-plain-language.js';
import {riskScoringAgent} from './10-risk-scoring.js';
import {reportGeneratorAgent} from './11-report-generator.js';

export const AGENTS = [documentParsingAgent, clauseSegmentationAgent, clauseClassificationAgent, informationExtractionAgent, templateComparisonAgent, riskDetectionAgent, legalReasoningAgent, verificationAgent, plainLanguageAgent, riskScoringAgent, reportGeneratorAgent];

export function newAnalysis(raw, opt = {}) {
  return {raw, name: opt.name || 'Untitled contract', juris: opt.juris || 'IN', persp: opt.persp || null, overrides: opt.overrides || {}, at: new Date().toISOString()};
}

/** Run every agent synchronously. */
export function runAll(raw, opt) {
  const A = newAnalysis(raw, opt);
  AGENTS.forEach(a => a.run(A));
  return A;
}

/**
 * Run agents one by one so a UI can show progress.
 * onStep(agent, status, output) is called with status 'run' then 'done' | 'error'.
 */
export async function runPipeline(A, {onStep = () => {}, delay = 0} = {}) {
  for (const agent of AGENTS) {
    onStep(agent, 'run', '');
    if (delay) await new Promise(r => setTimeout(r, delay + Math.random() * delay));
    try { onStep(agent, 'done', agent.run(A)); }
    catch (e) { console.error(agent.name, e); onStep(agent, 'error', 'error'); throw e; }
  }
  return A;
}
