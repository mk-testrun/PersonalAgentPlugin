import { readFileSync, existsSync, statSync, Stats } from 'fs';

/** Max inline file size we read into memory (10 MB) — guards against huge files. */
export const MAX_TEXT_BYTES = 10 * 1024 * 1024;

/** catch(e) may receive any value — normalize to a safe string. */
function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Resolve tool input to text: inline `content` wins (even if empty), otherwise read `source`. */
export function getText(p: { content?: string; source?: string }): string {
  if (p.content !== undefined) return p.content;
  if (p.source) return readTextFile(p.source);
  throw new Error('Provide either "content" or "source".');
}

/** Read a UTF-8 text file with clear, actionable errors instead of raw throws. */
export function readTextFile(source: string): string {
  if (!existsSync(source)) throw new Error(`File not found: ${source}`);
  let st: Stats;
  try {
    st = statSync(source);
  } catch (e) {
    throw new Error(`Cannot stat ${source}: ${errMsg(e)}`);
  }
  if (!st.isFile()) throw new Error(`Not a regular file: ${source}`);
  if (st.size > MAX_TEXT_BYTES) {
    throw new Error(`File too large (${st.size} bytes > ${MAX_TEXT_BYTES}). Provide a path to an external viewer instead.`);
  }
  try {
    return readFileSync(source, 'utf8');
  } catch (e) {
    throw new Error(`Cannot read ${source}: ${errMsg(e)}`);
  }
}
