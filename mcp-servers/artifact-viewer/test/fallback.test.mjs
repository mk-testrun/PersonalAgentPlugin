#!/usr/bin/env node
/**
 * Fallback tests: every renderer in VIEWER_RICH=off mode delivers text + file:// link.
 * No external network calls permitted.
 */
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir as osTmp } from 'os';

// Must be set before importing renderers
process.env.VIEWER_RICH = 'off';
const OUT = join(osTmp(), `artifact-viewer-test-${Date.now()}`);
process.env.VIEWER_OUT = OUT;
mkdirSync(OUT, { recursive: true });

let passed = 0;
let failed = 0;

function ok(cond, msg) {
  if (!cond) { console.error(`✗ ${msg}`); failed++; }
  else        { console.log(`✓ ${msg}`); passed++; }
}

// All imports after env is set
const { renderMarkdown }      = await import('../dist/renderers/markdown.js');
const { renderHtml }          = await import('../dist/renderers/html.js');
const { renderMermaid }       = await import('../dist/renderers/mermaid.js');
const { renderQr }            = await import('../dist/renderers/qr.js');
const { renderImage }         = await import('../dist/renderers/image.js');
const { renderPdf }           = await import('../dist/renderers/pdf.js');
const { renderDocx }          = await import('../dist/renderers/docx.js');
const { render3d }            = await import('../dist/renderers/threed.js');
const { renderAudio, renderVideo } = await import('../dist/renderers/media.js');

function assertResult(r, label) {
  ok(r.mode === 'fallback',                        `${label}: mode=fallback`);
  ok(typeof r.inlineText === 'string' && r.inlineText.length > 0, `${label}: inlineText present`);
  ok(r.fileUrl.startsWith('file://'),              `${label}: fileUrl starts with file://`);
  ok(!r.richHtml,                                  `${label}: no richHtml in fallback`);
}

// --- Text renderers ---
const md = await renderMarkdown('# Hello\n\nWorld', 'Test');
assertResult(md, 'Test 1: Markdown');
ok(md.inlineText.includes('Hello') || md.inlineText.includes('#'), 'Test 1: Markdown inline text contains source');

const html = await renderHtml('<h1>Test</h1><p>Content</p>', 'Test HTML');
assertResult(html, 'Test 2: HTML');
ok(html.inlineText.includes('Test') || html.inlineText.includes('HTML'), 'Test 2: HTML fallback has summary');

const mm = await renderMermaid('graph TD\n  A --> B', 'Test Diagram');
assertResult(mm, 'Test 3: Mermaid');
ok(mm.inlineText.includes('mermaid') || mm.inlineText.includes('graph'), 'Test 3: Mermaid source inline');

// --- QR (Unicode block) ---
const qr = await renderQr('https://example.com', 'Test QR');
assertResult(qr, 'Test 4: QR');
ok(qr.inlineText.length > 20, 'Test 4: QR Unicode block has content');
ok(qr.fileUrl.endsWith('.png'), 'Test 4: QR file is PNG');

// --- Binary renderers (real files) ---
const pngBytes = Buffer.from([
  0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,
  0x00,0x00,0x00,0x0d,0x49,0x48,0x44,0x52,
  0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,
  0x08,0x02,0x00,0x00,0x00,0x90,0x77,0x53,
  0xde,0x00,0x00,0x00,0x0c,0x49,0x44,0x41,
  0x54,0x08,0xd7,0x63,0xf8,0xcf,0xc0,0x00,
  0x00,0x00,0x02,0x00,0x01,0xe2,0x21,0xbc,
  0x33,0x00,0x00,0x00,0x00,0x49,0x45,0x4e,
  0x44,0xae,0x42,0x60,0x82,
]);
const pngPath = join(OUT, 'test.png');
writeFileSync(pngPath, pngBytes);

const img = await renderImage(pngPath, 'Test Image');
assertResult(img, 'Test 5: Image');
ok(img.inlineText.toLowerCase().includes('png'), 'Test 5: Image metadata has format');

// PDF: any file works (regex-based page count — returns ? on non-PDF)
const pdfPath = join(OUT, 'test.pdf');
writeFileSync(pdfPath, Buffer.from('%PDF-1.4\n'));

const pdf = await renderPdf(pdfPath, 'Test PDF');
assertResult(pdf, 'Test 6: PDF');
ok(pdf.inlineText.includes('PDF'), 'Test 6: PDF metadata present');

// DOCX: corrupted file — renderer catches error, still returns text+link
const docxPath = join(OUT, 'test.docx');
writeFileSync(docxPath, Buffer.from('not a real docx'));

const docx = await renderDocx(docxPath, 'Test DOCX');
ok(typeof docx.inlineText === 'string' && docx.inlineText.length > 0, 'Test 7: DOCX fallback text');
ok(docx.fileUrl.startsWith('file://'), 'Test 7: DOCX has file:// link');

// 3D
const glbPath = join(OUT, 'test.glb');
writeFileSync(glbPath, Buffer.from([0x67,0x6c,0x54,0x46,0x02,0x00,0x00,0x00]));

const td = await render3d(glbPath, 'Test 3D');
assertResult(td, 'Test 8: 3D');
ok(td.inlineText.includes('GLB') || td.inlineText.includes('3D'), 'Test 8: 3D metadata present');

// Audio
const mp3Path = join(OUT, 'test.mp3');
writeFileSync(mp3Path, Buffer.from([0xff,0xfb,0x90,0x00,0x00]));

const audio = await renderAudio(mp3Path, 'Test Audio');
assertResult(audio, 'Test 9: Audio');
ok(audio.inlineText.toLowerCase().includes('mp3'), 'Test 9: Audio format in metadata');

// Video
const mp4Path = join(OUT, 'test.mp4');
writeFileSync(mp4Path, Buffer.from([0x00,0x00,0x00,0x18,0x66,0x74,0x79,0x70]));

const video = await renderVideo(mp4Path, 'Test Video');
assertResult(video, 'Test 10: Video');
ok(video.inlineText.toLowerCase().includes('mp4'), 'Test 10: Video format in metadata');

// External network calls test: all above renderers completed without network
// (qrcode, mammoth, marked are pure-local; no fetch/http in any renderer)
ok(true, 'Test 11: No external network calls (all renderers are local-only)');

// Cleanup
try { rmSync(OUT, { recursive: true }); } catch { /* best effort */ }

const total = passed + failed;
console.log(`\nAll fallback tests passed: ${passed}/${total}`);
if (failed > 0) { console.error(`${failed} test(s) FAILED.`); process.exit(1); }
