/* =========================================================
   Collection専用マーキー - CSSベース無限フロー
   汎用trackロジックから完全に独立
   ========================================================= */

(function() {
  'use strict';

  console.log('[Collection Marquee] スクリプト読み込み開始');

  /**
   * Collection専用の軽量初期化関数
   * 責務: 画像セットを複製して無限ループを成立させるのみ
   * アニメーション制御は一切行わない（CSSに完全に任せる）
   */
  async function initCollectionMarquee() {
    console.log('[Collection Marquee] 初期化開始');
    
    const tracks = document.querySelectorAll('#collection .collection-track');
    console.log('[Collection Marquee] Collection tracks found:', tracks.length);
    
    if (tracks.length === 0) {
      console.warn('[Collection Marquee] Collection tracks not found');
      return;
    }

    // Chrome初期表示問題対策: 画像読み込み待機
    const imageLoadPromises = [];
    tracks.forEach(track => {
      const images = track.querySelectorAll('img');
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
                console.warn('[Collection Marquee] 画像読み込みタイムアウト:', img.src.substring(0, 50));
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
          // Instagram WebView対策: flex-shrinkとflex-growを設定
          img.style.flexShrink = '0';
          img.style.flexGrow = '0';
        }
      });
    });

    if (imageLoadPromises.length > 0) {
      console.log(`[Collection Marquee] ${imageLoadPromises.length}個の画像の読み込みを待機中...`);
      await Promise.race([
        Promise.all(imageLoadPromises),
        new Promise(resolve => setTimeout(resolve, 5000))
      ]);
      console.log('[Collection Marquee] 画像の読み込み完了（またはタイムアウト）');
    }

    // 各trackを初期化（要素複製のみ）
    for (let index = 0; index < tracks.length; index++) {
      const track = tracks[index];
      console.log(`[Collection Marquee] Track ${index + 1} 初期化開始`);
      await initMarqueeTrack(track);
      console.log(`[Collection Marquee] Track ${index + 1} 初期化完了`);
    }

    console.log('[Collection Marquee] 初期化完了');
  }

  /**
   * 単一のtrackを初期化（要素複製のみ）
   * アニメーション制御は一切行わない
   */
  async function initMarqueeTrack(track) {
    const children = Array.from(track.children);
    
    if (children.length === 0) {
      console.warn('[Collection Marquee] Track has no children');
      return;
    }

    // 元の幅を計算（リトライロジック）
    let originalWidth = 0;
    let attempts = 0;
    const maxAttempts = 5;

    while (originalWidth === 0 && attempts < maxAttempts) {
      originalWidth = children.reduce((width, child) => {
        const rect = child.getBoundingClientRect();
        return width + (rect.width || 200);
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
            // Instagram WebView対策: flex-shrinkとflex-growを設定
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
        // Instagram WebView対策: flex-shrinkとflex-growを設定
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
            // Instagram WebView対策: flex-shrinkとflex-growを設定
            img.style.flexShrink = '0';
            img.style.flexGrow = '0';
          });
          
          track.appendChild(clone);
          cloneCount++;
        }
      });

      currentWidth = Array.from(track.children).reduce((width, child) => {
        const rect = child.getBoundingClientRect();
        return width + (rect.width || 200);
      }, 0);

      if (cloneCount >= maxClones) {
        break;
      }
    }

    console.log(`[Collection Marquee] Track初期化完了: 元の幅=${originalWidth}px, 複製数=${cloneCount}`);
  }

  // グローバルに公開（init-sections.jsから呼び出せるように）
  window.initCollectionMarquee = initCollectionMarquee;

  // DOMContentLoadedのみで初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initCollectionMarquee();
    });
  } else {
    initCollectionMarquee();
  }

})();

