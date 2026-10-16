'use strict';
const { hash } = require('./base-client.cjs');
const verifiedFacts = require('./verified-facts.json');
const string = value => typeof value === 'string' && value.trim() ? value.trim() : null;
const integer = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
const FIELDS = {
  brand: ['ブランド'], itemCode: ['品番'], category: ['カテゴリ', 'カテゴリー'],
  color: ['カラー', '色'], size: ['サイズ'], material: ['素材'],
  origin: ['原産国', '生産国', '製造国'], measurements: ['採寸', 'サイズスペック', '実寸']
};
function labelledFacts(description) {
  const facts = {}, provenance = {};
  const lines = description.split(/\r?\n/);
  // Explicit label/value pairs only. Conflicting values are not silently resolved.
  for (const [field, labels] of Object.entries(FIELDS)) {
    const evidence = lines.filter(line => new RegExp(`^[\\s・●■\\-]*(${labels.join('|')})[：:]`).test(line));
    const values = [...new Set(evidence.map(line => line.replace(/^[^：:]+[：:]\s*/, '').trim().replace(/。$/, '')).filter(Boolean))];
    facts[field] = values.length === 1 ? values[0] : null;
    provenance[field] = { source: 'BASE description: explicit label', evidence, conflict: values.length > 1 };
  }
  return { facts, provenance };
}
function imageUrl(value) {
  if (!value) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password) return null;
    return u.href;
  } catch { return null; }
}
function slugFor(id, registry = {}) {
  const slug = registry[id] || `base-${id}`;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('INVALID_SLUG');
  return slug;
}
function normalize(snapshot, config = {}) {
  if (!Array.isArray(snapshot.items) || !Number.isFinite(Date.parse(snapshot.fetchedAt))) throw new Error('INVALID_SNAPSHOT');
  const ids = new Set(), paths = new Set();
  const products = snapshot.items.map(item => {
    const id = String(item.id);
    if (!/^[1-9]\d*$/.test(id) || ids.has(id) || !string(item.name)) throw new Error('INVALID_PRODUCT_ID_OR_NAME');
    ids.add(id);
    const description = typeof item.detail === 'string' ? item.detail : '';
    const { facts, provenance } = labelledFacts(description);
    for (const [field, reviewed] of Object.entries(verifiedFacts[id] || {})) {
      // Evidence must still exist verbatim after every sync; never retain an old
      // curated fact when BASE's description changes underneath it.
      if (Object.hasOwn(FIELDS,field) && description.split(/\r?\n/).some(line=>line.trim()===reviewed.evidence)) {
        facts[field]=reviewed.value;
        provenance[field]={source:'Reviewed explicit BASE description',evidence:[reviewed.evidence],conflict:false};
      }
    }
    const slug = slugFor(id, config.slugs), url = `/products/${slug}/`;
    if (paths.has(url)) throw new Error('DUPLICATE_SLUG');
    paths.add(url);
    const images = (item.images || []).map((img, position) => {
      const original = imageUrl(img.url);
      if (!original) throw new Error('INVALID_IMAGE_URL');
      return { id: img.id == null ? null : String(img.id), position, url: original,
        preview: imageUrl(img.scaled_url) || original };
    });
    const variants = (item.variations || []).map(v => ({ id: String(v.id), name: string(v.name),
      stock: integer(v.stock), identifier: string(v.identifier), barcode: string(v.barcode) }));
    const categories = (item.categories || []).map(c => ({id: String(c.id), name: c.name, parent: c.parent || null}));
    const price = integer(item.price), stock = integer(item.stock);
    return {
      id, slug, url, baseUrl: `${snapshot.shopUrl.replace(/\/$/, '')}/items/${id}`, name: item.name,
      description, ...facts, identifier: string(item.identifier),
      // The merchant's inventory identifier need not be the manufacturer's model number.
      itemCode: facts.itemCode, categories, images, variants, options: item.options || [],
      price, currency: 'JPY', stock, visible: item.visible === true,
      saleStatus: string(item.sales_status), type: string(item.type),
      published: snapshot.shopVisible === true && item.visible === true && item.type === 'normal',
      modifiedAt: item.modified_at || null, fetchedAt: snapshot.fetchedAt,
      source: snapshot.source, provenance,
      publicAvailability: item.publicAvailability || null,
      modelGroup: null, // No title-based grouping, even for identical names or codes.
      missing: Object.keys(FIELDS).filter(field => facts[field] == null),
      fingerprint: hash(item)
    };
  });
  return { schemaVersion: 1, source: snapshot.source, complete: snapshot.complete === true,
    fetchedAt: snapshot.fetchedAt, shopUrl: snapshot.shopUrl, products };
}
function availability(p) {
  if (p.saleStatus === 'item_waiting_for_sale') return '販売開始前';
  if (p.saleStatus === 'item_end_of_sale') return '販売終了';
  if (p.stock === 0) return '売り切れ';
  if (p.stock > 0 && p.saleStatus === 'item_now_on_sale') return '在庫あり';
  return '在庫はBASEでご確認ください';
}
function isFresh(catalog, now = Date.now()) {
  const age = now - Date.parse(catalog.fetchedAt);
  return catalog.source === 'base-api-v2' && catalog.complete && age >= 0 && age < 60000;
}
module.exports = { normalize, labelledFacts, availability, isFresh, imageUrl };
