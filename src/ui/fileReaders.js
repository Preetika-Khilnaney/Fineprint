// Reads PDF, DOCX and text files into plain text. Heavy libraries load only when needed.
export async function readFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'pdf') {
    const pdfjs = await import('pdfjs-dist');
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const pdf = await pdfjs.getDocument({data: await file.arrayBuffer()}).promise;
    return pdfToText(pdf);
  }
  if (ext === 'docx') {
    const mammoth = (await import('mammoth/mammoth.browser.js')).default;
    const r = await mammoth.extractRawText({arrayBuffer: await file.arrayBuffer()});
    return r.value;
  }
  if (ext === 'doc') throw new Error('Old .doc files are not supported. Save the file as .docx or PDF and upload again.');
  return file.text();
}

export async function pdfToText(pdf) {
  const pages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const tc = await (await pdf.getPage(p)).getTextContent();
    let lastY = null, line = '';
    const lines = [];
    tc.items.forEach(it => {
      const y = Math.round(it.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 3) { lines.push(line); line = ''; }
      line += it.str; lastY = y;
      if (it.hasEOL) { lines.push(line); line = ''; lastY = null; }
    });
    if (line) lines.push(line);
    pages.push(lines.join('\n'));
  }
  const text = pages.join('\n\n');
  if (text.replace(/\s/g, '').length < 50) throw new Error('This PDF has no selectable text. It may be a scan: run OCR first or paste the text.');
  return text;
}
