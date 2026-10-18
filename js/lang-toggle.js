/* Local, reviewed English copy. No visitor data is sent to a translation service. */
(() => {
  'use strict';
  const key = 'rs-lang', version = '20261018-5';
  const japanese = /[\u3040-\u30ff\u3400-\u9fff]/;
  const norm = s => s.replace(/\s+/g, ' ').trim();
  const originals = new WeakMap();
  const excluded = 'script,style,noscript,svg,iframe,textarea,input,.ja-content,.en-content,.only-ja,.only-en,[translate="no"]';
  const attrs = ['alt','title','aria-label','placeholder'];
  let dictionary, matcher, loading, observer, language = 'ja', request = 0, initialized = false;
  const saved = () => { try { return localStorage.getItem(key) || localStorage.getItem('preferred-language'); } catch { return null; } };
  const persist = lang => { try { localStorage.setItem(key, lang); localStorage.setItem('preferred-language', lang); } catch { /* URL preserves the selection without storage. */ } };
  function translate(value) {
    if (!japanese.test(value)) return value;
    const text = norm(value);
    if (dictionary[text]) return value.replace(/\S[\s\S]*\S|\S/, () => dictionary[text]);
    return value.split('\n').map(translateLine).join('\n');
  }
  function translateLine(value) {
    const text = norm(value);
    if (dictionary[text]) return value.replace(/\S[\s\S]*\S|\S/, () => dictionary[text]);
    // Composition is limited to approved phrases; unmatched source copy stays intact.
    const result = value.replace(matcher, match => dictionary[match] + ' ')
      .replace(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/g, '$1/$2/$3')
      .replace(/画像\s*(\d+)\s*を拡大/g, 'Enlarge image $1')
      .replace(/画像\s*(\d+)/g, 'Image $1')
      .replace(/[ \t]{2,}/g, ' ');
    return japanese.test(result) ? value : result;
  }
  function applyNode(node, attribute) {
    const current = attribute ? node.getAttribute(attribute) : node.nodeValue;
    if (current == null) return;
    const id = attribute || '#text';
    let records = originals.get(node);
    if (!records) { records = {}; originals.set(node, records); }
    let record = records[id];
    if (!record || (current !== record.source && current !== record.result)) record = records[id] = { source: current, result: current };
    let next = language === 'en' ? translate(record.source) : record.source;
    if (!attribute && language === 'en' && next !== record.source) {
      if (node.previousSibling && node.previousSibling.nodeName !== 'BR') next = ' ' + next.trimStart();
      if (node.nextSibling && node.nextSibling.nodeName !== 'BR') next = next.trimEnd() + ' ';
    }
    record.result = next;
    if (current !== next) { if (attribute) node.setAttribute(attribute, next); else node.nodeValue = next; }
  }
  function connect() { observer?.observe(document.documentElement, { subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:[...attrs,'content'] }); }
  function render() {
    observer?.disconnect();
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) if (node.parentElement && !node.parentElement.closest(excluded)) applyNode(node);
    document.querySelectorAll(attrs.map(a => `[${a}]`).join(',')).forEach(el => {
      if (!el.closest(excluded)) attrs.forEach(attr => applyNode(el, attr));
    });
    document.querySelectorAll('meta[name="description"],meta[property="og:title"],meta[property="og:description"]').forEach(el => applyNode(el,'content'));
    document.documentElement.lang = language;
    document.querySelectorAll('[data-lang-btn]').forEach(btn => {
      const active = btn.dataset.langBtn === language;
      btn.classList.toggle('active', active); btn.setAttribute('aria-pressed', String(active));
      btn.closest('.language-switcher,.rs-language')?.removeAttribute('hidden');
    });
    document.querySelectorAll('a[href]').forEach(a => {
      const raw = a.getAttribute('href');
      if (!raw || raw.startsWith('#')) return;
      const url = new URL(raw, location.href);
      if (url.origin !== location.origin || /\.(pdf|xml|json|webp|png|jpe?g|svg|mp4)$/i.test(url.pathname)) return;
      if (language === 'en') url.searchParams.set('lang','en'); else url.searchParams.delete('lang');
      const next = url.pathname + url.search + url.hash;
      if (raw !== next) a.setAttribute('href',next);
    });
    document.querySelectorAll('form.catalog-filters').forEach(form => {
      let input = form.querySelector('input[name="lang"]');
      if (language === 'en' && !input) { input = document.createElement('input'); input.type='hidden'; input.name='lang'; input.value='en'; form.append(input); }
      else if (language === 'ja') input?.remove();
    });
    connect();
  }
  async function setLang(next, updateURL = true) {
    next = next === 'en' ? 'en' : 'ja';
    const ticket = ++request;
    document.querySelectorAll('[data-lang-btn]').forEach(btn => btn.setAttribute('aria-busy','true'));
    if (next === 'en' && !dictionary) {
      try {
        loading ||= fetch(`/assets/i18n/en.json?v=${version}`, {signal:AbortSignal.timeout(10000)}).then(response => {
          if (!response.ok) throw new Error('Translation unavailable');
          return response.json();
        }).then(data => {
          dictionary = data;
          matcher = new RegExp(Object.keys(data).sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
        });
        await loading;
      } catch {
        loading = null;
        if (ticket !== request) return;
        document.getElementById('language-status').textContent = 'English could not be loaded. Please try EN again.';
        document.getElementById('language-status').classList.add('language-error');
        document.documentElement.lang = language;
        document.querySelectorAll('[data-lang-btn]').forEach(btn=>btn.removeAttribute('aria-busy'));
        return;
      }
    }
    if (ticket !== request) return;
    language = next; persist(next); render();
    document.getElementById('language-status').classList.remove('language-error');
    if (updateURL) {
      const url = new URL(location.href);
      if (next === 'en') url.searchParams.set('lang','en'); else url.searchParams.delete('lang');
      history.replaceState(history.state,'',url);
    }
    document.querySelectorAll('[data-lang-btn]').forEach(btn=>btn.removeAttribute('aria-busy'));
    document.getElementById('language-status').textContent = next === 'en' ? 'English selected. Prices are in Japanese yen (JPY).' : '日本語に切り替えました。';
    document.dispatchEvent(new CustomEvent('rs:languagechange',{detail:{language}}));
  }
  function init() {
    if (initialized) return;
    initialized = true;
    const status = document.createElement('p'); status.id='language-status'; status.className='language-status'; status.setAttribute('role','status'); status.setAttribute('translate','no'); document.body.append(status);
    document.querySelectorAll('.language-switcher,.rs-language').forEach(el=>{el.removeAttribute('hidden');el.setAttribute('role','group');el.setAttribute('aria-label','Language / 言語');});
    document.querySelectorAll('[data-lang-btn]').forEach(btn=>btn.addEventListener('click',()=>setLang(btn.dataset.langBtn)));
    observer = new MutationObserver(()=>render());
    const query = new URLSearchParams(location.search).get('lang');
    setLang(query === 'en' || query === 'ja' ? query : saved() || 'ja',true);
  }
  window.setLang = setLang; window.initLangToggle = init; window.checkCSSChanges = () => {};
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded',init) : init();
})();
