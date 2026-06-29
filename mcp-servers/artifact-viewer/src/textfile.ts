import { readFileSync, existsSync, statSync } from 'fs';

/** Max inline file size we read into memory (10 MB) — guards against huge files. */
export const MAX_TEXT_BYTES = 10 * 1024 * 1024;

/** Resolve tool input to text: inline `content` wins, otherwise read `source`. */
export function getText(p: { content?: string; source?: string }): string {
  if (p.content) return p.content;
  if (p.source) return readTextFile(p.source);
  throw new Error('Provide either "content" or "source".');
}

/** Read a UTF-8 text file with clear, actionable errors instead of raw throws. */
export function readTextFile(source: string): string {
  if (!existsSync(source)) throw new Error(`File not found: ${source}`);
  const st = statSync(source);
  if (!st.isFile()) throw new Error(`Not a regular file: ${source}`);
  if (st.size > MAX_TEXT_BYTES) {
    throw new Error(`File too large (${st.size} bytes > ${MAX_TEXT_BYTES}). Provide a path to an external viewer instead.`);
  }
  try {
    return readFileSync(source, 'utf8');
  } catch (e) {
    throw new Error(`Cannot read ${source}: ${(e as Error).message}`);
  }
}
