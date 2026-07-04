import { isRich, saveArtifact, genFilename, RenderResult, escapeHtml } from '../fallback.js';

export async function renderMermaid(content: string, title = 'Diagram'): Promise<RenderResult> {
  const escaped = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<script type="module">import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';mermaid.initialize({startOnLoad:true,theme:'default'});</script>
<style>body{display:flex;justify-content:center;padding:2rem;font-family:system-ui,sans-serif}</style>
</head><body><div class="mermaid">${escaped}</div></body></html>`;
  const fileUrl = saveArtifact(genFilename('html', 'mermaid'), html);
  if (isRich()) {
    return { mode: 'rich', inlineText: content, fileUrl, richHtml: html };
  }
  return { mode: 'fallback', inlineText: `\`\`\`mermaid\n${content}\n\`\`\``, fileUrl };
}
