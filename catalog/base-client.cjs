'use strict';
const { createHash } = require('node:crypto');
const API = 'https://apiv2.thebase.com';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Only these two read endpoints are used. Never expose the PAT to the browser.
async function readJson(path, token, fetchImpl) {
  const response = await fetchImpl(API + path, {
    method: 'GET', redirect: 'error', signal: AbortSignal.timeout(12000),
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`BASE_HTTP_${response.status}`);
  return response.json();
}

async function scan(token, fetchImpl) {
  const items = [], ids = new Set();
  // No visible/category filter: a complete snapshot is required to handle removals.
  for (let offset = 0; offset <= 1000000; offset += 100) {
    const batch = await readJson(`/api/items?limit=100&offset=${offset}&order=created&sort=asc`, token, fetchImpl);
    if (!Array.isArray(batch) || batch.length > 100) throw new Error('BASE_INVALID_PAGE');
    for (const item of batch) {
      if (!Number.isSafeInteger(item.id) || item.id <= 0 || ids.has(String(item.id))) throw new Error('BASE_UNSTABLE_PAGINATION');
      ids.add(String(item.id)); items.push(item);
    }
    if (batch.length < 100) return items;
  }
  throw new Error('BASE_PAGINATION_LIMIT');
}

async function fetchSnapshot({ token = process.env.BASE_API_TOKEN, shopUrl = process.env.BASE_SHOP_URL,
  fetchImpl = fetch, now = () => new Date() } = {}) {
  if (!token) throw new Error('BASE_TOKEN_MISSING');
  if (!shopUrl) throw new Error('BASE_SHOP_URL_MISSING');
  const startedAt = now().toISOString();
  const user = await readJson('/api/user', token, fetchImpl);
  if (new URL(user.shop_url).origin !== new URL(shopUrl).origin) throw new Error('BASE_SHOP_MISMATCH');
  if (typeof user.able_to_business !== 'boolean') throw new Error('BASE_INVALID_SHOP');
  // Offset pagination has no transaction cursor. Two identical complete reads
  // prevent publishing a mixed snapshot or interpreting a partial read as deletion.
  const first = await scan(token, fetchImpl), second = await scan(token, fetchImpl);
  if (hash(first) !== hash(second)) throw new Error('BASE_CHANGED_DURING_SYNC');
  return { schemaVersion: 1, source: 'base-api-v2', complete: true, startedAt,
    fetchedAt: now().toISOString(), shopUrl: user.shop_url.replace(/\/$/, ''),
    shopVisible: user.able_to_business, items: second };
}

module.exports = { fetchSnapshot, hash };
