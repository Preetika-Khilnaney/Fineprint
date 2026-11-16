// Perspective-neutral risk signals: high-precision detectors for clause features that matter in review.
// They answer "does this clause contain X?" without deciding who is harmed; the risk rules then apply the
// reader's perspective. Patterns were calibrated on the CUAD training split only (see EVALUATION.md).
// Each signal: re = alternative patterns (any may match); need = context that must also be present;
// not = context that vetoes the match.
export const SIGNALS = {
  uncapped_liability: {label: 'Uncapped liability',
    need: /liab|damages|indemnif/i,
    re: [/(?:limitation|limitations|cap|caps|exclusion|exclusions|foregoing)\b[^.;]{0,160}(?:shall|will) not (?:apply|limit|be available)/i,
      /nothing in this (?:section|article|agreement|clause)[^.;]{0,120}(?:shall|will|is intended to)[^.;]{0,30}(?:exclude|limit|restrict)/i,
      /(?:shall|will) not (?:exclude|limit|restrict)[^.;]{0,60}(?:liabilit|indemnif|obligation|damages)/i,
      /^(?:notwithstanding[^.;]{0,100})?except\b[^.;]{0,300}(?:liable|liabilit)/i,
      /\bexcept\b[^.;]{0,200}(?:indemnif|confidential|gross negligence|wil+ful misconduct|infringement|fraud)[^.;]{0,300}(?:liable|liabilit)/i,
      /(?:liable|liability) for any and all/i, /without (?:any )?limit(?:ation)?\b[^.;]{0,20}(?:liability|amount)/i, /unlimited liability/i]},
  liability_cap: {label: 'Liability cap',
    re: [/(?:total|aggregate|cumulative|maximum|entire)[^.;]{0,60}liabilit[^.;]{0,200}(?:exceed|limited to|capped)/i,
      /liabilit[^.;]{0,120}(?:shall|will)? ?(?:be )?(?:limited to|capped at|not exceed)/i,
      /(?:shall not|will not|in no event shall)[^.;]{0,80}be liable[^.;]{0,160}(?:indirect|consequential|special|incidental|punitive|exemplary|lost profits|loss of profit)/i,
      /(?:not|no party shall) be liable[^.;]{0,40}(?:for|to)[^.;]{0,80}(?:indirect|consequential|special|incidental|punitive)/i,
      /(?:claim|action)[^.;]{0,80}(?:must|shall) be (?:brought|commenced|filed) within/i]},
  termination_convenience: {label: 'Termination for convenience',
    not: /breach|default|insolven|bankrupt|cure/i,
    re: [/(?:may|shall have the right to|is entitled to|right to)\s+terminate[^.;]{0,140}(?:for convenience|without cause|for any reason|at any time|for no reason|in its sole discretion)/i,
      /(?:may|right to)\s+terminate[^.;]{0,120}(?:upon|by giving|with|on)\s+(?:at least\s+)?(?:\w+\s+)?(?:\(\d+\)\s+)?(?:days|months)/i,
      /terminated by (?:either party|any party|the \w+|\w+)[^.;]{0,40}(?:upon|by giving|with|on)[^.;]{0,40}(?:days|months)[^.;]{0,30}notice/i,
      /(?:for convenience|without cause)[^.;]{0,60}terminat/i]},
  auto_renewal: {label: 'Automatic renewal',
    re: [/automatic(?:ally)?[^.;]{0,30}(?:renew|extend)/i, /(?:renew|extend)\w*[^.;]{0,40}automatic/i,
      /(?:shall|will) (?:be )?(?:renewed|extended|continue)[^.;]{0,100}(?:successive|additional|further|subsequent)[^.;]{0,60}(?:period|term|year)/i,
      /unless[^.;]{0,100}notice[^.;]{0,140}(?:renew|extend)/i, /(?:renew|extend)\w*[^.;]{0,160}unless[^.;]{0,100}notice/i,
      /continue (?:on a |from )(?:month[- ]to[- ]month|year[- ]to[- ]year)/i]},
  non_compete: {label: 'Non-compete',
    not: /non-?competitive product|non-?disclosure and non-?compet/i,
    re: [/(?:shall|will|agrees? to|agrees? that it will|covenants? (?:that it will|not to)) not[^.;]{0,100}(?:compete|competitive|competing|competitor)/i, /\bnon-?compet/i,
      /(?:shall|will|may) not[^.;]{0,40}directly or indirectly[^.;]{0,160}(?:engage|own|manage|operate|sell|distribut|manufactur|market|participat|invest)/i,
      /(?:shall|will|may) not[^.;]{0,80}(?:engage|participate|invest)[^.;]{0,140}(?:business|products?|services?)[^.;]{0,100}(?:similar|compet|same)/i,
      /covenants?[^.;]{0,40}(?:during|for a period)[^.;]{0,160}(?:not|refrain)[^.;]{0,100}(?:engage|compet|sell|distribut|manufactur|own)/i]},
  exclusivity: {label: 'Exclusivity',
    re: [/(?<!non-?)\bexclusive\s+(?:right|rights|license|licence|distributor|supplier|provider|basis|agent|reseller|dealer|manufacturer|partner|territory|sponsor|endorse)/i,
      /on an exclusive basis/i, /(?<!non-?)\bexclusively\s+(?:from|to|with|through|for)/i,
      /(?:shall|will) not[^.;]{0,60}(?:purchase|order|buy|obtain|source)[^.;]{0,80}(?:from any (?:other )?(?:source|person|third party|supplier)|other than)/i,
      /appoints?[^.;]{0,60}(?:as )?(?:its |the |an )?(?:sole and )?exclusive/i]},
  perpetual_licence: {label: 'Perpetual or irrevocable licence',
    not: /option to purchase|perpetual duration/i,
    re: [/(?:perpetual|irrevocable)[^.;]{0,80}(?:licen[cs]e|right to use|right to (?:reproduce|copy|distribute))/i, /licen[cs]e[^.;]{0,60}(?:perpetual|irrevocable)/i, /fully paid[- ]up[^.;]{0,40}licen[cs]e/i]},
  ip_assignment: {label: 'IP ownership transfer',
    need: /intellectual property|invention|work product|deliverable|copyright|patent|know-how|improvement|development|proprietary|customer list|trademark|right,? title|materials|results/i,
    re: [/(?:hereby )?\b(?:assigns?|transfers?|conveys?)\b[^.;]{0,120}(?:right,? title,? and interest|intellectual property|ownership|all rights)/i,
      /(?:shall|will) (?:be|become|remain) the (?:sole |exclusive )?property of/i, /\b(?:vest|vests|vested)\b[^.;]{0,60}\bin\b/i,
      /(?:shall|will) (?:solely |exclusively )?own\b[^.;]{0,100}/i, /works? made for hire/i, /(?:sole|exclusive) (?:owner|ownership)/i]},
  anti_assignment: {label: 'Restriction on assignment',
    re: [/(?:may|shall|will) not[^.;]{0,60}(?:assign|transfer|delegate)/i, /(?:assign|transfer)\w*[^.;]{0,160}without[^.;]{0,60}(?:prior )?(?:written )?(?:consent|approval)/i,
      /no (?:party|assignment)[^.;]{0,80}(?:assign|transfer|shall be (?:made|valid))[^.;]{0,80}without/i, /not (?:be )?assignable/i]},
  change_of_control: {label: 'Change of control',
    re: [/change (?:of|in) (?:control|ownership)/i, /(?:merger|consolidation|acquisition|reorganization)[^.;]{0,100}(?:deemed|constitute|treated as)[^.;]{0,30}(?:an? )?(?:assign|transfer)/i,
      /(?:sale|transfer) of (?:all or )?substantially all[^.;]{0,40}(?:assets|business|stock)/i, /(?:acquires?|acquisition of)[^.;]{0,60}(?:majority|more than (?:fifty|50))/i]},
};

import SIGNAL_MODELS from './ml/signalModels.js';
import {predict} from './ml/naiveBayes.js';

const norm = t => t.replace(/\s+/g, ' ');

export function hasSignal(id, text) {
  const s = SIGNALS[id], t = norm(text);
  if (s.need && !s.need.test(t)) return null;
  if (s.not && s.not.test(t)) return null;
  for (const re of s.re) { const m = t.match(re); if (m) return m[0]; }
  return null;
}

/** Learned detector probability for one signal (null when the signal is pattern-only). */
export function signalProbability(id, text) {
  const m = SIGNAL_MODELS?.[id];
  if (!m || !m.model) return null;
  return predict(m.model, norm(text)).probs.pos;
}

/**
 * Signals present in a piece of text. A signal fires when its calibrated pattern matches (source
 * 'pattern', evidence = matched words) or, for signals with a learned detector, when the model
 * probability reaches the validated threshold (source 'model', evidence = the sentence itself).
 */
export function detectSignals(text, {learned = true} = {}) {
  const out = [];
  for (const id of Object.keys(SIGNALS)) {
    const ev = hasSignal(id, text);
    if (ev) { out.push({id, label: SIGNALS[id].label, evidence: ev, source: 'pattern'}); continue; }
    if (!learned) continue;
    const m = SIGNAL_MODELS?.[id];
    if (!m?.model) continue;
    for (const sent of norm(text).split(/(?<=[.;])\s+/)) {
      const p = predict(m.model, sent).probs.pos;
      if (p >= m.threshold) { out.push({id, label: SIGNALS[id].label, evidence: sent, source: 'model', probability: +p.toFixed(3)}); break; }
    }
  }
  return out;
}
