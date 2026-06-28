import { statSync } from 'fs';
import { resolve, extname } from 'path';
import { isRich, saveArtifact, genFilename, RenderResult } from '../fallback.js';

export async function render3d(source: string, title = '3D Model'): Promise<RenderResult> {
  const stats = statSync(source);
  const absPath = resolve(source);
  const sourceUrl = `file://${absPath}`;
  const ext = extname(source).slice(1).toUpperCase() || 'GLB';

  if (isRich()) {
    // @google/model-viewer via CDN (optional peer, client-side only)
    const html = `<!DOCTYPE html><html><head><title>${title}</title>
<script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
<style>body{margin:0;background:#1a1a2e}model-viewer{width:100%;height:100vh;--progress-bar-color:#00ffcc}</style>
</head><body>
<model-viewer src="${sourceUrl}" alt="${title}" auto-rotate camera-controls shadow-intensity="1">
</model-viewer>
</body></html>`;
    const fileUrl = saveArtifact(genFilename('html', '3d'), html);
    return { mode: 'rich', inlineText: `${title} (${ext})`, fileUrl, richHtml: html };
  }

  return {
    mode: 'fallback',
    inlineText: `3D Model: ${title}\nFormat: ${ext} (glTF/GLB)\nSize: ${stats.size} bytes\nFile: ${sourceUrl}`,
    fileUrl: sourceUrl,
  };
}
