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
    tracks.forEach((track, index) => {
      console.log(`[Collection Marquee] Track ${index + 1} 初期化開始`);
      initMarqueeTrack(track);
      console.log(`[Collection Marquee] Track ${index + 1} 初期化完了`);
    });

    console.log('[Collection Marquee] 初期化完了');
  }

  /**
   * 単一のtrackを初期化（要素複製のみ）
   * アニメーション制御は一切行わない
   */
  function initMarqueeTrack(track) {
    const children = Array.from(track.children);
    
    if (children.length === 0) {
      console.warn('[Collection Marquee] Track has no children');
      return;
    }

    // 元の幅を計算
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
          }
        });
        attempts++;
        
        if (attempts < maxAttempts) {
          return new Promise(resolve => {
            setTimeout(() => {
              initMarqueeTrack(track);
              resolve();
            }, 200);
          });
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
        img.style.display = 'block';
        img.style.visibility = 'visible';
        img.style.opacity = '1';
        img.style.width = 'auto';
        img.style.height = 'auto';
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

  // 即座に実行を試みる
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initCollectionMarquee();
    });
  } else {
    initCollectionMarquee();
  }

  // loadイベントでも実行（フォールバック）
  window.addEventListener('load', () => {
    // 既に初期化済みの場合はスキップ
    const tracks = document.querySelectorAll('#collection .collection-track');
    if (tracks.length > 0 && tracks[0].children.length > 0) {
      const firstTrack = tracks[0];
      const expectedChildren = parseInt(firstTrack.dataset.seg) || 16;
      if (firstTrack.children.length <= expectedChildren) {
        console.log('[Collection Marquee] loadイベント: 再初期化を実行');
        initCollectionMarquee();
      }
    }
  }, { once: true });

  // pageshowイベント（bfcache対応）
  window.addEventListener('pageshow', (event) => {
    console.log('[Collection Marquee] pageshowイベント - 再初期化を実行', { persisted: event.persisted });
    setTimeout(() => {
      initCollectionMarquee();
    }, 100);
  });

  // Instagram WebView検出と特別な処理
  const isInstagramWebView = /Instagram/i.test(navigator.userAgent) || 
                             /FBAN|FBAV/i.test(navigator.userAgent) ||
                             (window.navigator.standalone === false && /iPhone|iPad|iPod/i.test(navigator.userAgent));

  if (isInstagramWebView) {
    console.log('[Collection Marquee] Instagram WebView検出');
    document.body.classList.add('instagram-webview');
    
    // loadイベント後にも確実に初期化を実行
    setTimeout(() => {
      console.log('[Collection Marquee] Instagram WebView: 遅延初期化を実行');
      initCollectionMarquee();
    }, 1000);
  }

})();

