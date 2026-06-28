import { writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { randomBytes } from 'crypto';

export const ARTIFACTS_DIR = process.env.VIEWER_OUT ?? '.copilot/state/artifacts';

export function ensureArtifactsDir(): void {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

export function saveArtifact(filename: string, content: Buffer | string): string {
  ensureArtifactsDir();
  const filePath = join(ARTIFACTS_DIR, filename);
  writeFileSync(filePath, content);
  return `file://${resolve(filePath)}`;
}

export function genFilename(ext: string, prefix = 'artifact'): string {
  return `${prefix}-${randomBytes(4).toString('hex')}.${ext}`;
}

export function isRich(): boolean {
  return (process.env.VIEWER_RICH ?? 'auto') !== 'off';
}

export interface RenderResult {
  mode: 'rich' | 'fallback';
  inlineText: string;
  fileUrl: string;
  richHtml?: string;
}

type TextContent = { type: 'text'; text: string };
type ResourceContent = { type: 'resource'; resource: { uri: string; mimeType: string; text: string } };
export type ContentItem = TextContent | ResourceContent;

export function toContent(result: RenderResult): ContentItem[] {
  const items: ContentItem[] = [];
  if (result.mode === 'rich' && result.richHtml) {
    items.push({
      type: 'resource',
      resource: { uri: result.fileUrl, mimeType: 'text/html', text: result.richHtml },
    });
  }
  items.push({ type: 'text', text: `${result.inlineText}\n\n📄 ${result.fileUrl}` });
  return items;
}
