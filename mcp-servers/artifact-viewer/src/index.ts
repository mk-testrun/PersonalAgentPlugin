#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getText } from './textfile.js';
import { toContent } from './fallback.js';
import { renderMarkdown } from './renderers/markdown.js';
import { renderHtml } from './renderers/html.js';
import { renderMermaid } from './renderers/mermaid.js';
import { renderQr } from './renderers/qr.js';
import { renderImage } from './renderers/image.js';
import { renderPdf } from './renderers/pdf.js';
import { renderDocx } from './renderers/docx.js';
import { render3d } from './renderers/threed.js';
import { renderAudio, renderVideo } from './renderers/media.js';

const server = new McpServer({ name: 'artifact-viewer', version: '1.0.0' });

const TextParams = {
  content: z.string().optional().describe('Inline text content'),
  source: z.string().optional().describe('File path to read (UTF-8)'),
  title: z.string().optional().describe('Optional title'),
};

const FileParams = {
  source: z.string().describe('Absolute or relative path to the file'),
  title: z.string().optional().describe('Optional title'),
};

server.tool('render_markdown',
  'Render Markdown. Rich: HTML webview. Fallback: text inline + file:// link.',
  TextParams,
  async (p) => ({ content: toContent(await renderMarkdown(getText(p), p.title)) }));

server.tool('render_html',
  'Render HTML. Rich: webview. Fallback: text summary + file:// link.',
  TextParams,
  async (p) => ({ content: toContent(await renderHtml(getText(p), p.title)) }));

server.tool('render_mermaid',
  'Render Mermaid diagram. Rich: HTML+mermaid.js webview. Fallback: source inline + file:// link.',
  TextParams,
  async (p) => ({ content: toContent(await renderMermaid(getText(p), p.title)) }));

server.tool('render_diagram',
  'Render diagram — alias for render_mermaid. Accepts Mermaid syntax.',
  TextParams,
  async (p) => ({ content: toContent(await renderMermaid(getText(p), p.title)) }));

server.tool('render_qr',
  'Render QR code. Rich: SVG webview. Fallback: Unicode block inline + PNG file:// link.',
  { content: z.string().describe('Text or URL to encode'), title: z.string().optional() },
  async (p) => ({ content: toContent(await renderQr(p.content, p.title)) }));

server.tool('render_image',
  'Render image. Rich: image in webview. Fallback: metadata + file:// link.',
  FileParams,
  async (p) => ({ content: toContent(await renderImage(p.source, p.title)) }));

server.tool('render_pdf',
  'Render PDF. Rich: iframe embed. Fallback: page count + text extract + file:// link.',
  FileParams,
  async (p) => ({ content: toContent(await renderPdf(p.source, p.title)) }));

server.tool('render_docx',
  'Render DOCX. Rich: HTML via mammoth. Fallback: plain text extract + file:// link.',
  FileParams,
  async (p) => ({ content: toContent(await renderDocx(p.source, p.title)) }));

server.tool('render_3d',
  'Render 3D model (glTF/GLB). Rich: <model-viewer> webview. Fallback: metadata + file:// link.',
  FileParams,
  async (p) => ({ content: toContent(await render3d(p.source, p.title)) }));

server.tool('play_audio',
  'Play audio. Rich: <audio> webview. Fallback: metadata + file:// link (default OS player).',
  FileParams,
  async (p) => ({ content: toContent(await renderAudio(p.source, p.title)) }));

server.tool('play_video',
  'Play video. Rich: <video> webview. Fallback: metadata + file:// link (default OS player).',
  FileParams,
  async (p) => ({ content: toContent(await renderVideo(p.source, p.title)) }));

const transport = new StdioServerTransport();
await server.connect(transport);
