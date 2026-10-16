'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { fetchSnapshot } = require('../catalog/base-client.cjs');
const { normalize } = require('../catalog/normalize.cjs');
const config = require('../catalog/config.json');
const dir = path.resolve('.catalog-private');
async function atomic(name, value) {
  await fs.writeFile(path.join(dir, name + '.tmp'), JSON.stringify(value, null, 2));
  await fs.rename(path.join(dir, name + '.tmp'), path.join(dir, name));
}
(async () => {
  await fs.mkdir(dir, {recursive: true});
  try {
    const raw = await fetchSnapshot({shopUrl: config.shopUrl});
    const data = normalize(raw, config);
    let old = {products: []};
    try { old = JSON.parse(await fs.readFile(path.join(dir, 'catalog.json'), 'utf8')); } catch {}
    const currentIds = new Set(data.products.map(p => p.id));
    const report = {
      fetchedAt: data.fetchedAt, total: data.products.length,
      public: data.products.filter(p => p.published).length,
      removedIds: old.products.filter(p => !currentIds.has(p.id)).map(p => p.id),
      changedIds: data.products.filter(p => old.products.find(o => o.id === p.id)?.fingerprint !== p.fingerprint).map(p => p.id),
      missing: data.products.map(p => ({id:p.id, fields:p.missing}))
    };
    await atomic('snapshot.json', raw);
    await atomic('catalog.json', data);
    await atomic('sync-report.json', report);
    await atomic('status.json', {ok:true, lastSuccessAt:data.fetchedAt});
    console.log(`BASE sync: ${report.total} items; ${report.public} published. Private snapshot saved.`);
  } catch (error) {
    // Never print request headers, tokens, response bodies, or customer information.
    const code = /^BASE_[A-Z0-9_]+$/.test(error.message) ? error.message : 'SYNC_FAILED';
    await atomic('status.json', {ok:false, attemptedAt:new Date().toISOString(), code});
    console.error(code); process.exitCode = 1;
  }
})();
