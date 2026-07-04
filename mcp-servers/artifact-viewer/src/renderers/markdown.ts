import { marked } from 'marked';
import { isRich, saveArtifact, genFilename, RenderResult, escapeHtml } from '../fallback.js';

export async function renderMarkdown(content: string, title = 'Markdown'): Promise<RenderResult> {
  const bodyHtml = await marked.parse(content);
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.6}pre{background:#f6f8fa;padding:1rem;border-radius:4px;overflow-x:auto}</style>
</head><body>${bodyHtml}</body></html>`;
  const fileUrl = saveArtifact(genFilename('html', 'markdown'), html);
  const rich = isRich();
  return {
    mode: rich ? 'rich' : 'fallback',
    inlineText: rich ? title : content.slice(0, 500) + (content.length > 500 ? '\n…' : ''),
    fileUrl,
    richHtml: rich ? html : undefined,
  };
}
