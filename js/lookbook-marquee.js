/* =========================================================
   Lookbook専用マーキー - CSSベース無限フロー
   汎用trackロジックから完全に独立
   ========================================================= */

(function() {
  'use strict';

  console.log('[Lookbook Marquee] スクリプト読み込み開始');

  /**
   * Lookbook専用の軽量初期化関数
   * 責務: 画像セットを複製して無限ループを成立させるのみ
   * アニメーション制御は一切行わない（CSSに完全に任せる）
   */
  async function initLookbookMarquee() {
    console.log('[Lookbook Marquee] 初期化開始');
    
    const track = document.querySelector('#lookbook .lookbook-track');
    console.log('[Lookbook Marquee] Lookbook track found:', track ? 'yes' : 'no');
    
    if (!track) {
      console.warn('[Lookbook Marquee] Lookbook track not found');
      return;
    }

    // 既に初期化済みの場合はスキップ（冪等性を担保）
    if (track.dataset.marqueeInitialized === 'true') {
      console.log('[Lookbook Marquee] 既に初期化済み');
      return;
    }
    track.dataset.marqueeInitialized = 'true';

    // Chrome初期表示問題対策: 画像読み込み待機
    const images = track.querySelectorAll('img');
    const imageLoadPromises = [];
    
    images.forEach(img => {
      const isLoaded = img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
      
      if (!isLoaded) {
        const promise = new Promise((resolve) => {
          let resolved = false;
          const resolveOnce = () => {
            if (!resolved) {
              resolved = true;
              resolve();
            }
          };
          
          img.addEventListener('load', resolveOnce, { once: true });
          img.addEventListener('error', resolveOnce, { once: true });
          
          setTimeout(() => {
            if (!resolved) {
              console.warn('[Lookbook Marquee] 画像読み込みタイムアウト:', img.src.substring(0, 50));
              resolveOnce();
            }
          }, 5000);
        });
        imageLoadPromises.push(promise);
      } else {
        // Chrome初期表示対策: 既に読み込み済みの場合もスタイルを設定
        img.style.display = 'block';
        img.style.visibility = 'visible';
        img.style.opacity = '1';
        img.style.width = 'auto';
        img.style.height = 'auto';
        img.style.flexShrink = '0';
        img.style.flexGrow = '0';
      }
    });

    if (imageLoadPromises.length > 0) {
      console.log(`[Lookbook Marquee] ${imageLoadPromises.length}個の画像の読み込みを待機中...`);
      await Promise.race([
        Promise.all(imageLoadPromises),
        new Promise(resolve => setTimeout(resolve, 5000))
      ]);
      console.log('[Lookbook Marquee] 画像の読み込み完了（またはタイムアウト）');
    }

    // 要素複製を実行
    await initMarqueeTrack(track);

    console.log('[Lookbook Marquee] 初期化完了');
  }

  /**
   * 単一のtrackを初期化（要素複製のみ）
   * アニメーション制御は一切行わない
   */
  async function initMarqueeTrack(track) {
    const children = Array.from(track.children);
    
    if (children.length === 0) {
      console.warn('[Lookbook Marquee] Track has no children');
      return;
    }

    // 元の幅を計算（リトライロジック）
    let originalWidth = 0;
    let attempts = 0;
    const maxAttempts = 5;

    while (originalWidth === 0 && attempts < maxAttempts) {
      originalWidth = children.reduce((width, child) => {
        const rect = child.getBoundingClientRect();
        return width + (rect.width || 300);
      }, 0);

      if (originalWidth === 0) {
        // Chrome初期表示対策: 画像の表示を強制
        children.forEach(child => {
          const img = child.querySelector('img');
          if (img) {
            img.style.display = 'block';
            img.style.visibility = 'visible';
            img.style.opacity = '1';
            img.style.width = 'auto';
            img.style.height = 'auto';
            img.style.flexShrink = '0';
            img.style.flexGrow = '0';
          }
        });
        attempts++;
        
        if (attempts < maxAttempts) {
          // リトライ前に少し待機
          await new Promise(resolve => setTimeout(resolve, 200));
          // 再帰的に呼び出し（リトライ）
          return await initMarqueeTrack(track);
        }
      }
    }

    // 元の幅を記録
    track._segmentWidth = originalWidth;

    // 画像のloading属性を削除（Chrome初期表示対策）
    children.forEach(child => {
      const img = child.querySelector('img');
      if (img) {
        if (img.hasAttribute('loading')) {
          img.removeAttribute('loading');
        }
        img.loading = 'eager';
        // Chrome初期表示対策: より積極的にスタイルを設定
        if (img.style.display !== 'block') {
          img.style.display = 'block';
        }
        if (img.style.visibility !== 'visible') {
          img.style.visibility = 'visible';
        }
        if (img.style.opacity !== '1') {
          img.style.opacity = '1';
        }
        img.style.width = 'auto';
        img.style.height = 'auto';
        img.style.flexShrink = '0';
        img.style.flexGrow = '0';
        // Chrome初期表示対策: 強制的にリフローを発生させる
        img.offsetHeight;
      }
    });

    // 無限ループのための要素複製
    const viewportWidth = window.innerWidth;
    const targetWidth = Math.max(originalWidth * 2, viewportWidth * 2);
    let currentWidth = originalWidth;
    let cloneCount = 0;
    const maxClones = 100;

    while (currentWidth < targetWidth && cloneCount < maxClones) {
      children.forEach(child => {
        if (cloneCount < maxClones) {
          const clone = child.cloneNode(true);
          
          // クローン画像のloading属性も削除
          clone.querySelectorAll('img').forEach((img) => {
            if (img.hasAttribute('loading')) {
              img.removeAttribute('loading');
            }
            img.loading = 'eager';
            img.style.display = 'block';
            img.style.visibility = 'visible';
            img.style.opacity = '1';
            img.style.width = 'auto';
            img.style.height = 'auto';
            img.style.flexShrink = '0';
            img.style.flexGrow = '0';
          });
          
          track.appendChild(clone);
          cloneCount++;
        }
      });

      currentWidth = Array.from(track.children).reduce((width, child) => {
        const rect = child.getBoundingClientRect();
        return width + (rect.width || 300);
      }, 0);

      if (cloneCount >= maxClones) {
        break;
      }
    }

    console.log(`[Lookbook Marquee] Track初期化完了: 元の幅=${originalWidth}px, 複製数=${cloneCount}`);
  }

  // DOMContentLoadedのみで初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initLookbookMarquee();
      // デバッグ: アニメーション状態を監視
      setupAnimationDebug('lookbook');
    });
  } else {
    initLookbookMarquee();
    // デバッグ: アニメーション状態を監視
    setupAnimationDebug('lookbook');
  }

  // デバッグ関数: アニメーション状態を監視
  function setupAnimationDebug(sectionId) {
    const track = document.querySelector(`#${sectionId} .${sectionId}-track`);
    if (!track) return;
    
    const logState = (label) => {
      const cs = getComputedStyle(track);
      console.log(`[DEBUG ${sectionId}][${label}] animationPlayState=${cs.animationPlayState}, opacity=${cs.opacity}, visibility=${cs.visibility}, transform=${cs.transform.substring(0, 50)}`);
    };
    
    logState('init');
    
    // スクロール、pageshow、visibilitychangeイベントで状態を監視
    ['scroll', 'pageshow', 'visibilitychange'].forEach(evt => {
      window.addEventListener(evt, () => {
        setTimeout(() => logState(evt), 100); // 少し遅延させて状態変化を確認
      }, { passive: true });
    });
  }

})();

