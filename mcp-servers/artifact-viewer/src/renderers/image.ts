import { statSync } from 'fs';
import { resolve, extname } from 'path';
import { isRich, saveArtifact, genFilename, RenderResult, escapeHtml } from '../fallback.js';

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
  bmp: 'image/bmp', ico: 'image/x-icon',
};

export async function renderImage(source: string, title = 'Image'): Promise<RenderResult> {
  const stats = statSync(source);
  const absPath = resolve(source);
  const sourceUrl = `file://${absPath}`;
  const ext = extname(source).slice(1).toLowerCase();
  const mimeType = MIME[ext] ?? 'image/*';

  if (isRich()) {
    const html = `<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#111;display:flex;justify-content:center;align-items:center;min-height:100vh">
<img src="${sourceUrl}" alt="${escapeHtml(title)}" style="max-width:100%;max-height:100vh;object-fit:contain">
</body></html>`;
    const fileUrl = saveArtifact(genFilename('html', 'image'), html);
    return { mode: 'rich', inlineText: title, fileUrl, richHtml: html };
  }

  return {
    mode: 'fallback',
    inlineText: `Image: ${title}\nFormat: ${ext.toUpperCase()} (${mimeType})\nSize: ${stats.size} bytes\nPath: ${sourceUrl}`,
    fileUrl: sourceUrl,
  };
}
