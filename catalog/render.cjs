'use strict';
const { availability, isFresh } = require('./normalize.cjs');
const {header,footer}=require('./site-shell.cjs');
const brandProfiles=require('./brand-profiles.json');
const {responsive}=require('./responsive-images.cjs');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = value => JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
const money = n => `¥${n.toLocaleString('ja-JP')}`;
const stamp = value => new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
// Navigation alias only: preserve each product's original BASE brand spelling.
const brandKey = name => name==='ERIBÉ（エリベ）'?'ERIBE':name;
const brandPath = name => `/brands/${encodeURIComponent(brandKey(name))}/`;
const categoryPath = name => `/categories/${encodeURIComponent(name)}/`;
const categoriesOf = p => [...new Set([...p.categories.map(c=>c.name),p.category].filter(Boolean))];
const visible = catalog => catalog.products.filter(p=>p.published);
const publicRecent = (p,now=Date.now()) => p.source==='base-public-store' && now-Date.parse(p.fetchedAt)>=0 && now-Date.parse(p.fetchedAt)<86400000;
const publicStock = p => publicRecent(p)&&p.publicAvailability==='sold-out'?'売り切れ':'在庫はBASEでご確認ください';
function picture(p, index = 0, eager = false, thumb = false) {
  const img = p.images[index];
  if (!img) return '<span class="image-missing">画像を準備しています</span>';
  const sizing=responsive(img.url,thumb==='thumbnail'?'64px':thumb?'(max-width: 760px) 46vw, (max-width: 1100px) 30vw, 23vw':'(max-width: 760px) 92vw, (max-width: 1100px) 44vw, 600px',thumb==='thumbnail'?[96,192]:[320,480,640,960,1280]);
  const image = `<img src="${esc(thumb ? img.preview : img.url)}" ${sizing} alt="${esc(p.name)} — 画像 ${index+1}" loading="${eager?'eager':'lazy'}" ${eager?'fetchpriority="high"':''} decoding="async">`;
  return !sizing&&!thumb&&img.preview!==img.url?`<picture><source media="(max-width: 760px)" srcset="${esc(img.preview)}">${image}</picture>`:image;
}
function descriptionHtml(text) {
  return text.split(/\r?\n/).filter(line=>line.trim()).map(line=>/^・/.test(line.trim())?`<h3>${esc(line.trim().replace(/^・/,''))}</h3>`:`<p>${esc(line)}</p>`).join('');
}
function price(p, fresh, preview) {
  if ((fresh || preview || p.source==='base-public-store') && p.price !== null) return `${money(p.price)} <small>税込</small>`;
  return '価格はBASEでご確認ください';
}
function card(p, fresh, preview, eager = false) {
  const stock=fresh?availability(p):publicStock(p);
  return `<article class="product-card"><a class="product-card-image" href="${esc(p.url)}">${picture(p,0,eager,true)}</a>
    <div class="product-card-copy">${p.brand?`<a class="eyebrow" href="${brandPath(p.brand)}">${esc(p.brand)}</a>`:''}
    <h2><a href="${esc(p.url)}">${esc(p.name)}</a></h2><p class="price" data-volatile>${price(p,fresh,preview)}</p>
    ${stock==='在庫はBASEでご確認ください'?'':`<p class="stock" data-volatile data-stock-fallback="hide" ${publicRecent(p)?`data-stock-expires="${Date.parse(p.fetchedAt)+86400000}"`:""}>${stock}</p>`}</div></article>`;
}
function breadcrumb(parts, siteUrl, root='Products') {
  const values = [{name:'ホーム',url:'/'},{name:root,url:root==='Brands'?'/brands/':'/products/'},...parts];
  return {html:`<nav class="breadcrumbs" aria-label="パンくずリスト"><ol>${values.map((p,i)=>`<li>${i===values.length-1?`<span aria-current="page">${esc(p.name)}</span>`:`<a href="${esc(p.url)}">${esc(p.name)}</a>`}</li>`).join('')}</ol></nav>`,
    data:{'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:values.map((p,i)=>({'@type':'ListItem',position:i+1,name:p.name,item:siteUrl+p.url}))}};
}
function layout({title,description,path,body,siteUrl,ogImage,schema=[],preview=false,noindex=false,expiresAt=null}) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script>document.documentElement.classList.add('rs-menu-ready')</script>
<title>${esc(title)} | ReStandard</title><meta name="description" content="${esc(description)}">
<meta name="robots" content="${preview||noindex?'noindex,follow':'index,follow,max-image-preview:large'}">
<link rel="canonical" href="${esc(siteUrl+path)}"><meta property="og:type" content="website"><meta property="og:site_name" content="ReStandard">
<meta property="og:title" content="${esc(title)} | ReStandard"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(siteUrl+path)}">
${ogImage?`<meta property="og:image" content="${esc(ogImage)}">`:''}
<link rel="stylesheet" href="/css/catalog.css?v=20261019-1"><link rel="stylesheet" href="/css/discovery.css?v=20261021-transparent-assets"><link rel="stylesheet" href="/css/language.css?v=20261018-2"><script src="/js/lang-toggle.js?v=20261019-2" defer></script><script src="/js/catalog.js?v=20261019-1" defer></script>
${schema.map(s=>`<script type="application/ld+json">${json(s)}</script>`).join('\n')}<link rel="stylesheet" href="/css/site-shell.css?v=20261019-2"><script src="/js/editorial.js?v=20261018-3" defer></script><link rel="stylesheet" href="/css/cursor.css?v=20261018-1"></head>
<body ${expiresAt?`data-offer-expires="${expiresAt}"`:''}><a class="skip-link" href="#main">本文へ</a>
${header}
${preview?'<aside class="preview-notice">確認用ページ・公開前 / 商品情報は公開ページの取得時点の内容です。価格・在庫はBASEでご確認ください。</aside>':''}
<main id="main">${body}</main>${footer}</body></html>`;
}
function productPage(p, catalog, {siteUrl,preview=false,now=Date.now()}) {
  const fresh = isFresh(catalog,now), crumb = breadcrumb(p.brand?[{name:p.brand,url:brandPath(p.brand)},{name:p.name,url:p.url}]:[{name:p.name,url:p.url}],siteUrl);
  const description = `${p.name}。${[p.color&&`カラー：${p.color}`,p.material&&`素材：${p.material}`,p.size&&`サイズ：${p.size}`].filter(Boolean).join('。')}。全${p.images.length}枚の画像と商品詳細を確認し、BASEで購入できます。`.replace(/。+/g,'。');
  const product = {'@context':'https://schema.org','@type':'Product','@id':siteUrl+p.url+'#product',name:p.name,url:siteUrl+p.url,description,image:p.images.map(img=>img.url)};
  if (p.brand) product.brand = {'@type':'Brand',name:p.brand};
  if (p.identifier) product.sku = p.identifier;
  if (p.color) product.color = p.color;
  if (p.material) product.material = p.material;
  if (p.size) product.size = p.size;
  // Only confirmed, currently on-sale normal items receive an Offer. No fake
  // ratings, manufacturer identifiers, ProductGroup, shipping or return policies.
  if (fresh && p.price !== null && p.stock !== null && p.saleStatus === 'item_now_on_sale') {
    product.offers = {'@type':'Offer',url:p.baseUrl,price:p.price,priceCurrency:'JPY',
      availability:`https://schema.org/${p.stock===0?'OutOfStock':'InStock'}`};
  }
  const fields = [['品番',p.itemCode],['商品コード',p.identifier],['カラー',p.color],['サイズ',p.size],['素材',p.material],['原産国',p.origin],['採寸',p.measurements]];
  const related = visible(catalog).filter(other=>other.id!==p.id && ((p.brand&&other.brand===p.brand)||categoriesOf(p).some(c=>categoriesOf(other).includes(c))))
    .sort((a,b)=>Number(b.brand===p.brand)-Number(a.brand===p.brand)).slice(0,4);
  const body = `${crumb.html}<div class="product-layout"><section class="gallery" aria-label="商品画像">
<div class="gallery-track" tabindex="0" aria-label="商品画像。左右にスクロールできます">${p.images.map((img,i)=>`<a class="gallery-slide" id="image-${i+1}" href="${esc(img.url)}" data-zoom aria-label="画像 ${i+1} を拡大">${picture(p,i,i===0)}</a>`).join('')}</div>
<div class="gallery-controls" hidden><button type="button" data-prev aria-label="前の画像">←</button><span data-position translate="no">1 / ${p.images.length}</span><button type="button" data-next aria-label="次の画像">→</button><button type="button" data-gallery-pause aria-label="自動切り替えを停止" aria-pressed="false">Ⅱ</button></div>
<nav class="thumbnails" aria-label="画像を選ぶ">${p.images.map((img,i)=>`<a href="#image-${i+1}" data-image-index="${i}" aria-label="画像 ${i+1}" ${i===0?'aria-current="true"':''}>${picture(p,i,false,'thumbnail')}</a>`).join('')}</nav><p class="caption">左右にスワイプ / 画像をタップして拡大</p></section>
<section class="product-info">${p.brand?`<a class="eyebrow" href="${brandPath(p.brand)}">${esc(p.brand)}</a>`:''}<h1>${esc(p.name)}</h1>
<p class="price" data-volatile>${price(p,fresh,preview)}</p><p class="stock" data-volatile ${publicRecent(p)?`data-stock-expires="${Date.parse(p.fetchedAt)+86400000}"`:""}>${fresh?availability(p):publicStock(p)}</p>

<a class="purchase-link" href="${esc(p.baseUrl)}">${(fresh&&p.stock===0)||(publicRecent(p)&&p.publicAvailability==='sold-out')?'BASEで再入荷・掲載状況を確認する':'BASEで購入する'} <span aria-hidden="true">↗</span></a>
<p class="purchase-note">${p.variants.length?'種類・サイズなどの選択は購入先で行えます。':''}</p>
<dl class="specs">${fields.filter(([,value])=>value).map(([name,value])=>`<div><dt>${name}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>
${p.variants.length?`<section class="variants"><h2>BASEに登録された種類</h2><ul>${p.variants.map(v=>`<li>${esc(v.name||'種類名未登録')}${v.identifier?` / ${esc(v.identifier)}`:''}${fresh&&v.stock!==null?` <span data-volatile>— ${v.stock===0?'売り切れ':'在庫あり'}</span>`:''}</li>`).join('')}</ul><p>サイズ・カラーなどの種類はBASEで選択できます。</p></section>`:''}
<div class="category-links">${categoriesOf(p).map(c=>`<a href="${categoryPath(c)}">${esc(c)}</a>`).join('')}</div>
</section></div><section class="description-section"><h2>商品について</h2><div class="original-description">${descriptionHtml(p.description)}</div></section>
${related.length?`<section class="related"><h2>あわせて見る</h2><p>同じブランド・カテゴリーの商品</p><div class="product-grid">${related.map(r=>card(r,fresh,preview)).join('')}</div></section>`:''}
<dialog class="zoom-dialog" aria-label="商品画像の拡大"><button type="button" data-close-zoom aria-label="拡大画像を閉じる">閉じる ×</button><img alt=""><a data-original-link>元の画像を開く ↗</a></dialog>`;
  return layout({title:p.name,description,path:p.url,body,siteUrl,ogImage:p.images[0]?.url,schema:[product,crumb.data],preview,expiresAt:fresh?Date.parse(catalog.fetchedAt)+60000:null});
}
function listPage(catalog,{siteUrl,preview=false,path='/products/',brand=null,category=null,params=new URLSearchParams(),now=Date.now()}) {
  const fresh = isFresh(catalog,now), all = visible(catalog);
  const profile=brandProfiles.find(p=>p.name===brandKey(brand));
  const brandHasProducts=all.some(p=>brandKey(p.brand)===brandKey(brand));
  const selectedBrand = brand || params.get('brand') || '', selectedCategory=category || params.get('category') || '';
  const stock = params.get('stock') || '', sort = params.get('sort') || 'default';
  let items = all.filter(p=>(!selectedBrand||brandKey(p.brand)===brandKey(selectedBrand))&&(!selectedCategory||categoriesOf(p).includes(selectedCategory)));
  if (stock==='available') items=items.filter(p=>fresh&&p.stock>0&&p.saleStatus==='item_now_on_sale');
  if (stock==='sold-out') items=items.filter(p=>fresh?p.stock===0:publicRecent(p)&&p.publicAvailability==='sold-out');
  if (sort==='price-asc'||sort==='price-desc') items.sort((a,b)=>a.price===null?1:b.price===null?-1:(a.price-b.price)*(sort==='price-desc'?-1:1));
  const title = brand || category || 'Products';
  const options = (values,selected) => [...new Set(values.filter(Boolean))].sort().map(v=>`<option value="${esc(v)}"${v===selected?' selected':''}>${esc(v)}</option>`).join('');
  const crumb = breadcrumb(brand||category?[{name:title,url:path}]:[],siteUrl,brand?'Brands':'Products');
  const brandIntro=profile?`<section class="brand-intro"><div class="brand-intro-logo"><img src="${esc(profile.logo)}" alt="${esc(profile.name)}" width="320" height="220"></div><div><p class="eyebrow">${esc(profile.category)}</p><h1>${esc(title)}</h1><p class="brand-description">${esc(profile.description)}</p><nav class="discovery-actions" aria-label="ブランド紹介">${brandHasProducts?'<a href="#brand-products">取扱商品 ↓</a>':''}<a href="/contact.html#wholesale">このブランドのお取引を相談する ↗</a></nav><div class="brand-references">${profile.article?`<a href="${esc(profile.article)}">ブランドの記事を読む ↗</a>`:''}<a href="${esc(profile.official)}" target="_blank" rel="noopener noreferrer">ブランド公式サイト ↗</a></div></div></section>${brandHasProducts?`<section class="brand-selection-heading" id="brand-products"><h2>取扱商品</h2><p>${brandHasProducts?'BASEに掲載中の商品を紹介しています。お取引のご相談は、ブランド名・品番とともにお問い合わせください。':''}</p></section>`:''}`:'';
  const body = `${crumb.html}${brandIntro||`<section class="collection-heading"><p class="eyebrow">ReStandard / Products</p><h1>${esc(title)}</h1><p>一枚ずつ、ディテールまで。</p></section>`}
${!profile||brandHasProducts?`<form class="catalog-filters" method="get" action="${esc(path)}">
${brand?'':`<label>ブランド<select name="brand"><option value="">すべてのブランド</option>${options(all.map(p=>brandKey(p.brand)),brandKey(selectedBrand))}</select></label>`}
${category?'':`<label>カテゴリー<select name="category"><option value="">すべてのカテゴリー</option>${options(all.flatMap(categoriesOf),selectedCategory)}</select></label>`}
<label>販売状況<select name="stock"><option value="">すべて</option>${fresh?`<option value="available"${stock==='available'?' selected':''}>在庫あり</option>`:''}<option value="sold-out"${stock==='sold-out'?' selected':''}>売り切れ</option></select></label>
<label>並び順<select name="sort"><option value="default">掲載順</option><option value="price-asc"${sort==='price-asc'?' selected':''}>価格の低い順</option><option value="price-desc"${sort==='price-desc'?' selected':''}>価格の高い順</option></select></label><button type="submit">絞り込む</button></form>
<p class="results-count">${items.length} items</p>`:''}
<div class="product-grid">${items.map((p,i)=>card(p,fresh,preview,i===0)).join('')}</div>
${!items.length&&(!profile||brandHasProducts)?'<p class="empty-state">条件に一致する商品がありません。<a href="/products/">すべての商品を見る</a></p>':''}
${profile?'<aside class="brand-enquiry"><div><h2>取扱いのご相談</h2><p>ご希望のブランド名をフォームのお問い合わせ内容にご記入ください。</p></div><a href="/contact.html#wholesale">お取引の相談をする ↗</a></aside>':''}
<nav class="browse-links" aria-label="ブランドから探す"><h2>Brands</h2>${[...new Set(all.map(p=>brandKey(p.brand)).filter(Boolean))].map(b=>`<a href="${brandPath(b)}">${esc(b)}</a>`).join('')}</nav>`;
  return layout({title,description:profile?`${title} — ブランド紹介・取扱商品`: `ReStandardの${brand||category||'商品'}一覧。写真と商品詳細を確認し、BASEオンラインストアで購入できます。`,path,body,siteUrl,ogImage:profile?siteUrl+profile.logo:undefined,preview,noindex:[...params].length>0,schema:[crumb.data,...(profile?[{'@context':'https://schema.org','@type':'Brand',name:profile.name,url:siteUrl+path,sameAs:profile.official,description:profile.description}]:[])],expiresAt:fresh?Date.parse(catalog.fetchedAt)+60000:null});
}
function directoryPage(catalog,{siteUrl,preview=false,kind='brands'}) {
  const brands=kind==='brands',title=brands?'Brands':'Categories',path=`/${kind}/`;
  const names=[...new Set([...(brands?brandProfiles.map(p=>p.name):[]),...visible(catalog).flatMap(p=>brands?[brandKey(p.brand)]:categoriesOf(p)).filter(Boolean)])];
  return layout({title,description:`ReStandardの商品を${brands?'ブランド':'カテゴリー'}から探す。`,path,siteUrl,preview,
    body:`<section class="collection-heading"><p class="eyebrow">ReStandard / ${brands?'Brands':'Products'}</p><h1>${title}</h1>${brands?'<p>ブランドの背景から、一枚との出会いへ。</p>':''}</section><nav class="${brands?'brand-directory':'directory'}">${names.map(n=>{const p=brands&&brandProfiles.find(p=>p.name===n);return `<a href="${brands?brandPath(n):categoryPath(n)}">${p?`<div class="brand-directory-logo"><img src="${esc(p.logo)}" alt="" width="240" height="160" loading="lazy"></div><p class="eyebrow">${esc(p.category)}</p>`:''}<span class="brand-directory-name">${esc(n)} <span>→</span></span></a>`}).join('')}</nav>`});
}
function errorPage(status,siteUrl) {
  return layout({title:status===404?'商品が見つかりません':'商品情報を確認しています',description:'ReStandardの商品一覧またはBASEオンラインストアをご利用ください。',path:'/products/',siteUrl,noindex:true,
    body:`<section class="empty-state"><p>${status}</p><h1>${status===404?'商品が見つかりません':'現在、商品情報を確認できません'}</h1><p>${status===404?'公開が終了したか、URLが変更された可能性があります。':'時間をおいて再度お試しください。最新の商品情報はBASEでご確認いただけます。'}</p><a href="/products/">Productsへ</a> <a href="https://restandard.base.ec/">BASEオンラインストアへ ↗</a></section>`});
}
function sitemap(catalog,siteUrl) {
  const all=visible(catalog),urls=['/products/','/brands/','/categories/',...all.map(p=>p.url),...[...new Set([...brandProfiles.map(p=>p.name),...all.map(p=>brandKey(p.brand)).filter(Boolean)])].map(brandPath),...[...new Set(all.flatMap(categoriesOf))].map(categoryPath)];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url=>`<url><loc>${esc(siteUrl+url)}</loc></url>`).join('')}</urlset>`;
}
module.exports={productPage,listPage,directoryPage,errorPage,sitemap,brandPath,brandKey,categoryPath,categoriesOf,esc,visible};
