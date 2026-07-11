/**
 * Dünner Confluence-Cloud-REST-Client (v2-API + v1-Suche), Basic-Auth mit API-Token.
 * Bewusst OHNE Publish- und Delete-Methoden: Schreiben geht ausschließlich über
 * createDraft/updateDraft, die beide den status "draft" erzwingen (assertDraftPayload).
 */
import { assertDraftPayload } from './guards.mjs';

export class ConfluenceClient {
  constructor({ baseUrl, email, apiToken }) {
    this.base = String(baseUrl).replace(/\/+$/, '');
    this.authHeader = 'Basic ' + Buffer.from(`${email}:${apiToken}`).toString('base64');
  }

  async #request(method, path, body) {
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      let detail = text;
      try {
        const parsed = JSON.parse(text);
        detail = parsed.errors?.[0]?.title ?? parsed.message ?? text;
      } catch {
        /* Rohtext behalten */
      }
      throw new Error(`Confluence ${method} ${path} → HTTP ${res.status}: ${detail}`);
    }
    return text ? JSON.parse(text) : null;
  }

  /** Löst Space-Keys in Space-Objekte auf (nur für die Whitelist verwendet). */
  async spacesByKeys(keys) {
    const query = keys.map(encodeURIComponent).join(',');
    const res = await this.#request('GET', `/api/v2/spaces?keys=${query}&limit=250`);
    return res.results ?? [];
  }

  getPage(id, { bodyFormat = 'storage' } = {}) {
    return this.#request(
      'GET',
      `/api/v2/pages/${encodeURIComponent(id)}?body-format=${bodyFormat}&get-draft=true`
    );
  }

  /** Erstellt IMMER einen Entwurf — status ist fest auf "draft" verdrahtet. */
  createDraft({ spaceId, title, bodyStorage, parentId }) {
    const payload = {
      spaceId: String(spaceId),
      status: 'draft',
      title,
      ...(parentId ? { parentId: String(parentId) } : {}),
      body: { representation: 'storage', value: bodyStorage ?? '' },
    };
    assertDraftPayload(payload);
    return this.#request('POST', '/api/v2/pages', payload);
  }

  /** Aktualisiert einen Entwurf — status bleibt fest "draft", Publish unmöglich. */
  updateDraft({ id, title, bodyStorage, versionNumber }) {
    const payload = {
      id: String(id),
      status: 'draft',
      title,
      body: { representation: 'storage', value: bodyStorage ?? '' },
      version: { number: versionNumber, message: 'AI draft update' },
    };
    assertDraftPayload(payload);
    return this.#request('PUT', `/api/v2/pages/${encodeURIComponent(id)}`, payload);
  }

  search(cql, { limit = 25 } = {}) {
    return this.#request(
      'GET',
      `/rest/api/search?cql=${encodeURIComponent(cql)}&limit=${limit}`
    );
  }
}
