// Agent 1 · Document Parsing
// Turns raw contract text into a section tree and identifies the parties and whose side we review from.
import {parse, findParties} from '../parsing.js';

const CUSTOMER_ROLES = /^(Customer|Client|Buyer|Licensee|Purchaser|Company|Recipient|Receiving Party)$/i;

export const documentParsingAgent = {
  key: 'parse',
  name: 'Document Parsing',
  description: 'Extracts text and detects sections',
  run(A) {
    const P = parse(A.raw);
    A.title = P.title; A.preamble = P.preamble; A.sections = P.sections;
    const pp = findParties(A.title + ' ' + A.preamble + ' ' + A.raw.slice(0, 3000));
    const C = pp.roles.find(r => CUSTOMER_ROLES.test(r)) || pp.roles[1];
    const V = pp.roles.find(r => r !== C) || pp.roles[0];
    const us = A.persp && pp.roles.includes(A.persp) ? A.persp : C;
    const them = pp.roles.find(r => r !== us) || V;
    A.ctx = {us, them, C, V, juris: A.juris, parties: pp.roles.map((r, i) => ({role: r, legal: pp.legal[i]}))};
    return `${A.sections.length} sections`;
  },
};
