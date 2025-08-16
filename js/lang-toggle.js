/* ========================================
   Language Toggle Control
   ======================================== */

(function() {
  'use strict';

  // 設定
  const STORAGE_KEY = 'rs-lang';
  const DEFAULT_LANG = 'ja';
  
  // 言語切替の初期化
  function initLangToggle() {
    console.log('Language toggle initializing...');
    
    // 保存された言語設定を取得、またはデフォルト言語を使用
    const saved = localStorage.getItem(STORAGE_KEY);
    const initial = saved || (document.documentElement.lang || DEFAULT_LANG);
    
    // 初期言語を設定
    setLang(initial);
    
    // 言語切替ボタンにイベントリスナーを設定
    document.querySelectorAll('[data-lang-btn]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const lang = btn.getAttribute('data-lang-btn') === 'en' ? 'en' : 'ja';
        setLang(lang);
        console.log('Language changed to:', lang);
      });
    });
    
    // 初期化完了ログ
    console.log('Language toggle initialized with:', initial);
  }
  
  // 言語設定を適用
  function setLang(lang) {
    // HTMLのlang属性を更新
    document.documentElement.setAttribute('lang', lang);
    
    // localStorageに保存
    localStorage.setItem(STORAGE_KEY, lang);
    
    // 視覚状態の更新（アクティブ表示）
    document.querySelectorAll('[data-lang-btn]').forEach(btn => {
      const btnLang = btn.getAttribute('data-lang-btn');
      btn.classList.toggle('active', btnLang === lang);
      btn.setAttribute('aria-pressed', btnLang === lang);
    });
    
    // 言語切替後の表示状態を確認
    setTimeout(() => {
      validateVisibility(lang);
    }, 100);
  }
  
  // 表示状態の検証
  function validateVisibility(lang) {
    const aboutSection = document.getElementById('about');
    const brandsSection = document.getElementById('brands');
    
    if (aboutSection && brandsSection) {
      // 現在の言語で表示されるべき要素をチェック
      const shouldShowJa = lang === 'ja';
      const shouldShowEn = lang === 'en';
      
      // 端末判定
      const isMobile = window.innerWidth <= 767;
      const shouldShowPc = !isMobile;
      const shouldShowSp = isMobile;
      
      // 表示されるべき要素のクラス
      const targetClass = shouldShowJa ? 'only-ja' : 'only-en';
      const deviceClass = shouldShowPc ? 'only-pc' : 'only-sp';
      
      // 表示状態をログ出力
      console.log('Visibility validation:', {
        lang,
        device: isMobile ? 'mobile' : 'desktop',
        targetClass,
        deviceClass,
        aboutVisible: aboutSection.querySelector(`.${targetClass}.${deviceClass}`)?.style.display !== 'none',
        brandsVisible: brandsSection.querySelector(`.${targetClass}.${deviceClass}`)?.style.display !== 'none'
      });
    }
  }
  
  // ページ読み込み完了後に初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLangToggle);
  } else {
    initLangToggle();
  }
  
  // グローバル関数として公開（必要に応じて）
  window.initLangToggle = initLangToggle;
  window.setLang = setLang;
  
})(); 
