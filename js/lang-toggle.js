/* ========================================
   Language Toggle Control
   ======================================== */

export function initLangToggle() {
  // 既存保存値 → なければ現在の <html lang> → それもなければ 'ja'
  const saved = localStorage.getItem('rs-lang');
  const initial = saved || document.documentElement.lang || 'ja';
  setLang(initial);

  // ヘッダーの JA/EN ボタンに data-lang-btn="ja|en" を付与しておく
  document.querySelectorAll('[data-lang-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = (btn.getAttribute('data-lang-btn') === 'en') ? 'en' : 'ja';
      setLang(target);
    });
  });

  function setLang(lang) {
    document.documentElement.setAttribute('lang', lang);
    localStorage.setItem('rs-lang', lang);
    // 見た目のアクティブ表示（任意）
    document.querySelectorAll('[data-lang-btn]').forEach(b => {
      b.toggleAttribute('data-active', b.getAttribute('data-lang-btn') === lang);
    });
  }
}

// ページ読み込み完了後に初期化
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLangToggle);
  } else {
    initLangToggle();
  }
} 
