import QRCode from 'qrcode';
import { isRich, saveArtifact, genFilename, RenderResult, escapeHtml } from '../fallback.js';

export async function renderQr(content: string, title = 'QR Code'): Promise<RenderResult> {
  const pngBuffer = await QRCode.toBuffer(content, { type: 'png', width: 256, margin: 2 });
  const fileUrl = saveArtifact(genFilename('png', 'qr'), pngBuffer);

  const unicode = await QRCode.toString(content, { type: 'terminal', small: true });

  if (isRich()) {
    const svg = await QRCode.toString(content, { type: 'svg' });
    const html = `<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title></head>
<body style="display:flex;flex-direction:column;align-items:center;padding:2rem;font-family:system-ui,sans-serif">
${svg}
<p style="margin-top:1rem;font-size:0.9rem;color:#555;word-break:break-all;max-width:300px;text-align:center">${content}</p>
</body></html>`;
    return { mode: 'rich', inlineText: unicode, fileUrl, richHtml: html };
  }

  return { mode: 'fallback', inlineText: unicode, fileUrl };
}
