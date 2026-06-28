import { readFileSync, statSync } from 'fs';
import { resolve } from 'path';
import { isRich, saveArtifact, genFilename, RenderResult } from '../fallback.js';

export async function renderPdf(source: string, title = 'PDF'): Promise<RenderResult> {
  const stats = statSync(source);
  const absPath = resolve(source);
  const sourceUrl = `file://${absPath}`;

  if (isRich()) {
    const html = `<!DOCTYPE html><html><head><title>${title}</title></head>
<body style="margin:0"><iframe src="${sourceUrl}" width="100%" style="border:none;height:100vh"></iframe>
</body></html>`;
    const fileUrl = saveArtifact(genFilename('html', 'pdf'), html);
    return { mode: 'rich', inlineText: title, fileUrl, richHtml: html };
  }

  let pageCount: number | string = '?';
  try {
    const buf = readFileSync(source);
    const matches = buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g);
    if (matches) pageCount = matches.length;
  } catch { /* best effort */ }

  return {
    mode: 'fallback',
    inlineText: `PDF: ${title}\nPages: ${pageCount}\nSize: ${stats.size} bytes\nOpen: ${sourceUrl}`,
    fileUrl: sourceUrl,
  };
}
