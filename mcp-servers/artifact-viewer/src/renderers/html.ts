import { isRich, saveArtifact, genFilename, RenderResult } from '../fallback.js';

export async function renderHtml(content: string, title = 'HTML'): Promise<RenderResult> {
  const fileUrl = saveArtifact(genFilename('html', 'html'), content);
  if (isRich()) {
    return { mode: 'rich', inlineText: title, fileUrl, richHtml: content };
  }
  const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const summary = text.slice(0, 500) + (text.length > 500 ? '…' : '');
  return { mode: 'fallback', inlineText: `HTML (${content.length} Bytes)\n${summary}`, fileUrl };
}
