import mammoth from 'mammoth';
import { resolve } from 'path';
import { isRich, saveArtifact, genFilename, RenderResult } from '../fallback.js';

export async function renderDocx(source: string, title = 'Document'): Promise<RenderResult> {
  const absPath = resolve(source);
  const sourceUrl = `file://${absPath}`;

  try {
    const htmlResult = await mammoth.convertToHtml({ path: source });
    const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.6}</style>
</head><body>${htmlResult.value}</body></html>`;
    const fileUrl = saveArtifact(genFilename('html', 'docx'), html);

    if (isRich()) {
      return { mode: 'rich', inlineText: title, fileUrl, richHtml: html };
    }

    const textResult = await mammoth.extractRawText({ path: source });
    const excerpt = textResult.value.slice(0, 800) + (textResult.value.length > 800 ? '\n…' : '');
    return { mode: 'fallback', inlineText: `DOCX: ${title}\n\n${excerpt}`, fileUrl };
  } catch (err) {
    return {
      mode: 'fallback',
      inlineText: `DOCX: ${title}\nError: ${err instanceof Error ? err.message : 'Could not parse'}\nFile: ${sourceUrl}`,
      fileUrl: sourceUrl,
    };
  }
}
