/**
 * Dünner Azure-DevOps-REST-Client (PAT-Auth, api-version 7.1).
 * Bewusst OHNE Delete-Methode — die Extension kann konstruktionsbedingt nicht löschen.
 */
const API_VERSION = '7.1';

export class AdoClient {
  constructor({ organizationUrl, pat }) {
    this.base = String(organizationUrl).replace(/\/+$/, '');
    this.authHeader = 'Basic ' + Buffer.from(`:${pat}`).toString('base64');
  }

  async #request(method, path, { body, contentType = 'application/json' } = {}) {
    const url = `${this.base}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': contentType } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      let detail = text;
      try {
        detail = JSON.parse(text).message ?? text;
      } catch {
        /* Rohtext behalten */
      }
      throw new Error(`Azure DevOps ${method} ${path} → HTTP ${res.status}: ${detail}`);
    }
    return text ? JSON.parse(text) : null;
  }

  listProjects() {
    return this.#request('GET', `/_apis/projects?api-version=${API_VERSION}&$top=500`);
  }

  getWorkItem(id, { expand = 'all' } = {}) {
    return this.#request(
      'GET',
      `/_apis/wit/workitems/${encodeURIComponent(id)}?api-version=${API_VERSION}&$expand=${expand}`
    );
  }

  queryWiql(wiql, { top = 50 } = {}) {
    return this.#request('POST', `/_apis/wit/wiql?api-version=${API_VERSION}&$top=${top}`, {
      body: { query: wiql },
    });
  }

  getWorkItemsBatch(ids, fields) {
    return this.#request('POST', `/_apis/wit/workitemsbatch?api-version=${API_VERSION}`, {
      body: { ids, fields },
    });
  }

  createWorkItem(project, type, patchOps) {
    return this.#request(
      'POST',
      `/${encodeURIComponent(project)}/_apis/wit/workitems/$${encodeURIComponent(type)}?api-version=${API_VERSION}`,
      { body: patchOps, contentType: 'application/json-patch+json' }
    );
  }

  updateWorkItem(id, patchOps) {
    return this.#request(
      'PATCH',
      `/_apis/wit/workitems/${encodeURIComponent(id)}?api-version=${API_VERSION}`,
      { body: patchOps, contentType: 'application/json-patch+json' }
    );
  }
}
