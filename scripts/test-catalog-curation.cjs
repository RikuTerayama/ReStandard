const test=require('node:test'),assert=require('node:assert/strict');
const snapshot=require('../catalog/public-snapshot.json'),home=require('../assets/base-products.json');
const byId=new Map(snapshot.items.map(p=>[String(p.id),p]));
test('every curated photo still belongs to its current BASE product',()=>{
 for(const p of home.products){
  const raw=byId.get(p.id);assert(raw,`Missing product ${p.id}`);assert.equal(p.name,raw.name);
  assert.equal(p.url,`https://restandard.base.ec/items/${p.id}`);
  for(const photo of Object.values(p.photos)){
   assert(raw.images.some(i=>i.url===photo.source),`Removed image ${p.id}: ${photo.source}`);
   assert(photo.width>0&&photo.height>0);
  }
 }
 for(const entry of [...home.collection.flat(),...home.lookbook])assert(home.products.find(p=>p.id===entry.id)?.photos[entry.photo]);
});
test('Lookbook has valid photographed products and separate real skirt links',()=>{
 for(const look of require('../assets/lookbook.json')){
  const top=byId.get(String(look.top)),skirt=byId.get(String(look.skirt));
  assert(top?.visible&&skirt?.visible);assert(top.images.some(i=>i.url===look.imageUrl));
  assert(require('../assets/lookbook-themes.json').some(t=>t.id===look.theme));
 }
});
test('reviewed contradictory colour fields are unknown while BASE descriptions remain intact',()=>{
 const catalog=require('../catalog/normalize.cjs').normalize(snapshot,require('../catalog/config.json'));
 for(const id of ['163800260','163688148']){
  const p=catalog.products.find(p=>p.id===id);assert.equal(p.color,null);assert(p.missing.includes('color'));
  assert.equal(p.description,byId.get(id).detail);
 }
});
