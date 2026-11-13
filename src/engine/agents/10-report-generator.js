// Agent 10 · Report Generator
import {buildMarkdown, buildJson} from '../report.js';

export const reportGeneratorAgent = {
  key: 'report',
  name: 'Report Generator',
  description: 'Assembles the structured report',
  run(A) { A.md = buildMarkdown(A); A.json = buildJson(A); return `${A.md.split('\n').length} lines`; },
};
