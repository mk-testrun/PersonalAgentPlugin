import { statSync } from 'fs';
import { resolve, extname } from 'path';
import { isRich, saveArtifact, genFilename, RenderResult } from '../fallback.js';

export async function renderAudio(source: string, title = 'Audio'): Promise<RenderResult> {
  const stats = statSync(source);
  const absPath = resolve(source);
  const sourceUrl = `file://${absPath}`;
  const ext = extname(source).slice(1).toLowerCase();

  if (isRich()) {
    const html = `<!DOCTYPE html><html><head><title>${title}</title></head>
<body style="margin:2rem;font-family:system-ui,sans-serif;background:#111;color:#eee">
<h2 style="margin-bottom:1rem">${title}</h2>
<audio controls style="width:100%;margin-bottom:1rem"><source src="${sourceUrl}">Browser unterstützt kein Audio.</audio>
<p style="font-size:0.8rem;color:#999">Format: ${ext.toUpperCase()} · ${stats.size} bytes · ${sourceUrl}</p>
</body></html>`;
    const fileUrl = saveArtifact(genFilename('html', 'audio'), html);
    return { mode: 'rich', inlineText: title, fileUrl, richHtml: html };
  }

  return {
    mode: 'fallback',
    inlineText: `Audio: ${title}\nFormat: ${ext.toUpperCase()}\nSize: ${stats.size} bytes\nPlay: ${sourceUrl}`,
    fileUrl: sourceUrl,
  };
}

export async function renderVideo(source: string, title = 'Video'): Promise<RenderResult> {
  const stats = statSync(source);
  const absPath = resolve(source);
  const sourceUrl = `file://${absPath}`;
  const ext = extname(source).slice(1).toLowerCase();

  if (isRich()) {
    const html = `<!DOCTYPE html><html><head><title>${title}</title></head>
<body style="margin:0;background:#000;display:flex;justify-content:center;align-items:center;min-height:100vh">
<video controls style="max-width:100%;max-height:100vh"><source src="${sourceUrl}">Browser unterstützt kein Video.</video>
</body></html>`;
    const fileUrl = saveArtifact(genFilename('html', 'video'), html);
    return { mode: 'rich', inlineText: title, fileUrl, richHtml: html };
  }

  return {
    mode: 'fallback',
    inlineText: `Video: ${title}\nFormat: ${ext.toUpperCase()}\nSize: ${stats.size} bytes\nPlay: ${sourceUrl}`,
    fileUrl: sourceUrl,
  };
}
