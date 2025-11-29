/* =========================================================
   Collection Interaction Handler 2025-01-18
   ========================================================= */

// スクリプト読み込み確認（最上部に配置）
console.log('[Collection] ===== スクリプト読み込み開始 =====');
console.log('[Collection] document.readyState:', document.readyState);
console.log('[Collection] window.initCollectionTracks:', typeof window.initCollectionTracks);

// 重複読み込み防止
if (typeof window.initCollectionTracks === 'function') {
  // 既に読み込まれている場合は何もしない
  console.log('[Collection] ⚠️ window.initCollectionTracksが既に定義されているため、スキップ');
  // 早期リターンではなく、既存の関数を実行
  try {
    console.log('[Collection] 既存のinitCollectionTracks関数を実行');
    window.initCollectionTracks();
  } catch (error) {
    console.error('[Collection] 既存のinitCollectionTracks関数実行エラー:', error);
  }
} else {
  console.log('[Collection] ✅ window.initCollectionTracksが未定義のため、初期化を実行');

// デバッグ用のヘルパー関数
window.__DEBUG_COLLECTION__ = true; // デバッグモードを有効化

function debugCollectionTap(e) {
  if (!window.__DEBUG_COLLECTION__) return;
  
  const x = e.clientX || e.touches?.[0]?.clientX;
  const y = e.clientY || e.touches?.[0]?.clientY;
  
  if (x && y) {
    const element = document.elementFromPoint(x, y);
    if (window.__QA_MEASURE_LOGS__) {
      console.log('=== Collection Tap Debug ===');
      console.log('Event type:', e.type);
      console.log('Coordinates:', { x, y });
      console.log('Hit element:', element);
      console.log('Is <a> tag:', element?.tagName === 'A');
      console.log('Closest <a>:', element?.closest('a'));
    }
    
    // CSS プロパティ確認
    const link = element?.closest('a');
    if (link) {
      const styles = getComputedStyle(link);
      if (window.__QA_MEASURE_LOGS__) {
        console.log('Link CSS properties:', {
          pointerEvents: styles.pointerEvents,
          zIndex: styles.zIndex,
        position: styles.position,
        transform: styles.transform,
        opacity: styles.opacity,
        visibility: styles.visibility
        });
      }
    }
  }
}

// 各 collection-track で無限スクロールのロジックを実装
async function initCollectionTracks() {
  console.log('[Collection] initCollectionTracks関数実行開始');
  const tracks = document.querySelectorAll('.collection-track');
  console.log('[Collection] Collection tracks found:', tracks.length);
  
  // Step 3: Chrome初期表示問題の修正 - 画像読み込み待機処理を改善
  // Chromeでは画像のcomplete判定が不正確な場合があるため、より確実な方法を使用
  const imageLoadPromises = [];
  tracks.forEach(track => {
    const images = track.querySelectorAll('img');
    images.forEach(img => {
      // Chrome対応: complete判定に加えて、naturalWidthとnaturalHeightも確認
      const isLoaded = img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
      
      if (!isLoaded) {
        // Chrome対応: loadイベントとerrorイベントの両方で確実に解決
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
          
          // Chrome対応: タイムアウトを追加（個別画像ごとに5秒）
          setTimeout(() => {
            if (!resolved) {
              console.warn('[Collection] 画像読み込みタイムアウト:', img.src.substring(0, 50));
              resolveOnce();
            }
          }, 5000);
        });
        imageLoadPromises.push(promise);
      }
    });
  });
  
  // すべての画像が読み込まれるか、タイムアウト（5秒）まで待つ
  if (imageLoadPromises.length > 0) {
    console.log(`[Collection] ${imageLoadPromises.length}個の画像の読み込みを待機中...`);
    await Promise.race([
      Promise.all(imageLoadPromises),
      new Promise(resolve => setTimeout(resolve, 5000)) // 5秒に延長（Chrome対応）
    ]);
    console.log('[Collection] 画像の読み込み完了（またはタイムアウト）');
  }
  
  tracks.forEach((track, index) => {
    console.log(`[Collection] Track ${index + 1} 初期化開始`);
    // 初期化処理
    initTrack(track);
    console.log(`[Collection] Track ${index + 1} 初期化完了`);
  });
  
  console.log('[Collection] initCollectionTracks関数実行完了');
}

// .collection-track ごとに初期化処理
function initTrack(track) {
  console.log('[Collection] initTrack関数実行開始:', {
    hasCollectionClass: track.classList.contains('collection-track'),
    datasetSpeed: track.dataset.speed,
    datasetDirection: track.dataset.direction
  });
  
  // ドラッグ機能は削除済みのため、draggingクラス関連の処理は不要
  
  // data-seg から元の子要素数を読み取り
  const segmentCount = parseInt(track.dataset.seg) || 16;
  
  // 子要素を複製して segmentWidth を計算
  ensureInfiniteLoop(track, segmentCount);
  
  // ドラッグ機能を削除（縦スクロールとの干渉を防ぐため）
  // attachTrackControls(track); // 削除: 縦スクロール中に誤ってdraggingクラスが付与される問題を解決
  
  // オートスクロール開始
  console.log('[Collection] startAutoScroll関数を呼び出し');
  startAutoScroll(track);
  console.log('[Collection] startAutoScroll関数呼び出し完了');
}

// 無限ループのための要素複製（安全な実装）
function ensureInfiniteLoop(track, segmentCount) {
  const children = Array.from(track.children);
  
  // 安全チェック
  if (children.length === 0) {
    console.warn('Collection track has no children');
return;
  }
  
  let originalWidth = 0;
  let attempts = 0;
  const maxAttempts = 5; // 試行回数を増加
  
  // 幅の計算を安全に実行
  while (originalWidth === 0 && attempts < maxAttempts) {
    // READ all layout properties first
    originalWidth = children.reduce((width, child) => {
      const rect = child.getBoundingClientRect();
      return width + (rect.width || 200); // フォールバック値
    }, 0);
    
    if (originalWidth === 0) {
      // WRITE all style properties after reads
      children.forEach(child => {
        const img = child.querySelector('img');
        if (img) {
          // 画像の表示を強制
          img.style.display = 'block';
          img.style.width = '200px';
          img.style.height = 'auto';
          img.style.visibility = 'visible';
          img.style.opacity = '1';
        }
      });
      attempts++;
      
      // DOM更新を待つ（時間を延長）
      if (attempts < maxAttempts) {
        return new Promise(resolve => {
          setTimeout(() => {
            ensureInfiniteLoop(track, segmentCount);
            resolve();
          }, 200); // 100msから200msに延長
        });
      }
    }
  }
  
  // オリジナル区間幅を記録
  track._segmentWidth = originalWidth;
  
  // Collection画像のloading属性を削除（元の画像にも適用）
  children.forEach(child => {
    const img = child.querySelector('img');
    if (img) {
      const isCollectionImage = img.closest('#collection') !== null;
      if (isCollectionImage) {
        // loading属性を完全に削除（HTML属性も含む）
        if (img.hasAttribute('loading')) {
          img.removeAttribute('loading');
        }
        // loading属性が設定されていないことを確認
        img.loading = 'eager'; // eagerに設定して確実に読み込む
        // Step 4: Chrome初期表示問題の修正 - 画像の表示を強制
        // Chromeでは画像が表示されない場合があるため、明示的にスタイルを設定
        img.style.display = 'block';
        img.style.visibility = 'visible';
        img.style.opacity = '1';
        // Chrome対応: widthとheightを明示的に設定しない（CSSで制御）
        // width: auto, height: autoを維持することで、CSSのobject-fit: containが正しく機能する
        img.style.width = 'auto';
        img.style.height = 'auto';
        // 画像の読み込み完了を待つ
        if (!img.complete) {
          img.addEventListener('load', function() {
            console.log('Collection: 画像読み込み完了', img.src);
            // Chrome対応: 読み込み完了後もスタイルを維持
            img.style.display = 'block';
            img.style.visibility = 'visible';
            img.style.opacity = '1';
            img.style.width = 'auto';
            img.style.height = 'auto';
          }, { once: true });
          img.addEventListener('error', function() {
            console.error('Collection: 画像読み込みエラー', img.src);
          }, { once: true });
        } else {
          // Chrome対応: 既に読み込み済みの場合もスタイルを設定
          img.style.display = 'block';
          img.style.visibility = 'visible';
          img.style.opacity = '1';
          img.style.width = 'auto';
          img.style.height = 'auto';
        }
      }
    }
  });
  
  // 安全な複製処理
  const viewportWidth = window.innerWidth;
  const targetWidth = Math.max(originalWidth * 2, viewportWidth * 2); // 3倍から2倍に削減
  let currentWidth = originalWidth;
  let cloneCount = 0;
  const maxClones = 100; // 最大複製数を増加
  
  // 無限ループ防止のための安全なwhile文
  while (currentWidth < targetWidth && cloneCount < maxClones) {
    // WRITE all DOM modifications first
    children.forEach(child => {
      if (cloneCount < maxClones) {
        const clone = child.cloneNode(true);
        // クローン画像のloading属性も削除
        clone.querySelectorAll('img').forEach((img) => {
          const isCollectionImage = img.closest('#collection') !== null;
          if (isCollectionImage) {
            // loading属性を完全に削除（HTML属性も含む）
            if (img.hasAttribute('loading')) {
              img.removeAttribute('loading');
            }
            // loading属性が設定されていないことを確認
            img.loading = 'eager'; // eagerに設定して確実に読み込む
            // Step 4: Chrome初期表示問題の修正 - クローン画像の表示も強制
            img.style.display = 'block';
            img.style.visibility = 'visible';
            img.style.opacity = '1';
            // Chrome対応: widthとheightを明示的に設定しない（CSSで制御）
            img.style.width = 'auto';
            img.style.height = 'auto';
          }
        });
        track.appendChild(clone);
        cloneCount++;
      }
    });
    
    // READ layout properties after all writes
    currentWidth = Array.from(track.children).reduce((width, child) => {
      const rect = child.getBoundingClientRect();
      return width + (rect.width || 200);
    }, 0);
    
    // 進捗がない場合は安全のため終了
    if (cloneCount >= maxClones) {
      if (window.__QA_MEASURE_LOGS__) {
        console.log('Collection track clone limit reached');
      }
      break;
    }
  }
}

// ドラッグ機能は完全に削除（自動スクロールのみで動作）

// 現在の translateX 値を取得
function getCurrentTranslateX(track) {
  const transform = getComputedStyle(track).transform;
  if (transform === 'none') return 0;
  const matrix = new DOMMatrix(transform);
  return matrix.m41;
}

// オートスクロール開始
function startAutoScroll(track) {
  // CSSで完全に制御するため、インラインスタイルは削除
  // Collection速度はCSSで50sに統一されているため、JavaScriptでは設定しない
  
  // reverse クラスが付いているトラックはスクロール方向を逆にして、21.JPG が右端になるよう初期化
  const isReverse = track.classList.contains('reverse');
  const scrollDirection = isReverse ? 'right' : 'left';
  
  // 開始位置の調整（CSSで速度が50sに統一されているため、50sを使用）
  alignTrackStart(track, scrollDirection);
  
  // インラインスタイルを確実に削除してCSSアニメーションを適用
  // 複数回実行して確実に適用（環境によってタイミングが異なるため）
  track.style.removeProperty('animation');
  track.style.removeProperty('animation-play-state');
  track.style.removeProperty('animation-duration');
  track.style.removeProperty('animation-name');
  track.style.removeProperty('animation-timing-function');
  track.style.removeProperty('animation-iteration-count');
  track.style.removeProperty('animation-delay');
  
  // リフローを強制してCSSアニメーションを再適用
  track.offsetHeight;
  
  // requestAnimationFrameで複数回実行して確実に適用
  requestAnimationFrame(() => {
    track.style.removeProperty('animation');
    track.style.removeProperty('animation-play-state');
    track.style.removeProperty('animation-duration');
    track.style.removeProperty('animation-name');
    track.style.removeProperty('animation-timing-function');
    track.style.removeProperty('animation-iteration-count');
    track.style.removeProperty('animation-delay');
    track.offsetHeight;
  });
  
  // 追加のタイマーで確実に適用（Google Chromeなどで必要）
  setTimeout(() => {
    track.style.removeProperty('animation');
    track.style.removeProperty('animation-play-state');
    track.style.removeProperty('animation-duration');
    track.style.removeProperty('animation-name');
    track.style.removeProperty('animation-timing-function');
    track.style.removeProperty('animation-iteration-count');
    track.style.removeProperty('animation-delay');
    track.offsetHeight;
  }, 50);
  
  // Step 3: animationiterationイベントでのanimationPlayState設定を削除
  // CSSでanimation-play-state: running !importantが設定されているため、JSでの設定は不要
  // インラインスタイルで設定すると、CSSの!importantルールと競合する可能性がある
  
  // 可視性チェックとアニメーション復帰（スマホ/PC両対応）
  // より確実なスマホ判定（画面幅またはユーザーエージェント）
  const isMobileDevice = window.innerWidth <= 900 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // デバッグログ（常に出力）
  console.log('Collection track初期化:', { 
    isMobileDevice, 
    windowWidth: window.innerWidth,
    userAgent: navigator.userAgent.substring(0, 50)
  });
  
  // Step 3: IntersectionObserverとvisibilitychangeイベントハンドラを完全に削除
  // CollectionアニメーションはCSSで常時runningとし、JSからは一切制御しない
  // 初期化時に一度だけインラインスタイルを削除し、その後はCSSに完全に任せる
  track._visibilityObserver = null; // Observerを完全に削除
  track._visibilityHandler = null; // visibilitychangeハンドラも削除
  
  console.log('[Collection] startAutoScroll: 初期化完了（イベントハンドラなし - CSSで完全制御）', {
    trackId: track.id || 'no-id',
    className: track.className
  });
  
  // CSSで完全に制御するため、インラインスタイルは削除
  // Collection速度はCSSで50sに統一されているため、JavaScriptでは設定しない
  track.style.removeProperty('animation');
  track.style.removeProperty('animation-play-state');
  track.style.removeProperty('animation-duration');
  track.offsetHeight; // リフローを強制してCSSアニメーションを適用
}

// 開始位置の調整
function alignTrackStart(track, direction) {
  const startImage = track.dataset.start;
  const align = track.dataset.align || 'left';
  
  if (!startImage) return;
  
  // 指定された画像を探す
  const images = track.querySelectorAll('img');
  const targetImage = Array.from(images).find(img => 
    img.src.toLowerCase().includes(startImage.toLowerCase())
  );
  
  if (!targetImage) return;
  
  // READ all layout properties first
  const imageLeft = targetImage.offsetLeft;
  const imageWidth = targetImage.getBoundingClientRect().width;
  const trackWidth = track.parentElement.offsetWidth;
  const segmentWidth = track._segmentWidth;
  const duration = 50; // CSSで50sに統一されているため、50sを使用
  
  // Calculate desired position
  let desiredTx;
  if (align === 'right') {
    // 画像の右端をトラックの右端に合わせる
    desiredTx = trackWidth - (imageLeft + imageWidth);
  } else {
    // 画像の左端をトラックの左端に合わせる
    desiredTx = -imageLeft;
  }
  
  // 負の animation-delay を計算
  const normalizedTx = ((desiredTx % segmentWidth) + segmentWidth) % segmentWidth;
  const progress = normalizedTx / segmentWidth;
  const delay = -progress * duration;
  
  // WRITE after all reads
  track.style.animationDelay = `${delay}s`;
}

// ドラッグ機能を削除したため、draggingクラス関連のCSSも削除
// const style = document.createElement('style');
// style.textContent = `
//   .collection-track.dragging {
//     animation-play-state: paused !important;
//   }
// `;
// document.head.appendChild(style);

// 初期化関数をグローバルに公開（重複読み込み防止のため）
window.initCollectionTracks = initCollectionTracks;

// startAutoScroll関数もグローバルに公開（init-sections.jsから呼び出せるように）
window.startCollectionAutoScroll = startAutoScroll;

// initTrack関数もグローバルに公開（init-sections.jsから呼び出せるように）
window.initCollectionTrack = initTrack;

// 初期化（DOMContentLoadedイベントがすでに発火済みの場合は即座に実行）
console.log('[Collection] スクリプト読み込み完了 - document.readyState:', document.readyState);
console.log('[Collection] initCollectionTracks関数を実行');

// 即座に実行を試みる
try {
  console.log('[Collection] initCollectionTracks関数を即座に実行');
  initCollectionTracks();
} catch (error) {
  console.error('[Collection] initCollectionTracks関数実行エラー:', error);
}

// DOMContentLoadedイベントでも実行（二重実行を防ぐため、フラグで制御）
let initCollectionTracksExecuted = false;
const initCollectionTracksOnce = () => {
  if (!initCollectionTracksExecuted) {
    initCollectionTracksExecuted = true;
    console.log('[Collection] DOMContentLoadedイベントでinitCollectionTracks関数を実行');
    try {
      initCollectionTracks();
    } catch (error) {
      console.error('[Collection] DOMContentLoadedイベントでのinitCollectionTracks関数実行エラー:', error);
    }
  }
};

if (document.readyState === 'loading') {
  // DOMContentLoadedイベントがまだ発火していない場合
  document.addEventListener('DOMContentLoaded', initCollectionTracksOnce);
  console.log('[Collection] DOMContentLoadedイベントリスナーを追加');
} else {
  // DOMContentLoadedイベントがすでに発火済みの場合
  console.log('[Collection] DOMContentLoadedイベントはすでに発火済み');
  initCollectionTracksOnce();
}

// loadイベントでも実行（フォールバック）
window.addEventListener('load', () => {
  console.log('[Collection] loadイベントでinitCollectionTracks関数を実行（フォールバック）');
  try {
    initCollectionTracks();
  } catch (error) {
    console.error('[Collection] loadイベントでのinitCollectionTracks関数実行エラー:', error);
  }
}, { once: true });

// pageshowイベントを処理（ページ遷移時の初期化問題を解決）
window.addEventListener('pageshow', (event) => {
  // event.persistedに関係なく、すべてのページ遷移で再初期化
  console.log('[Collection] pageshowイベント - 再初期化を実行', { persisted: event.persisted });
  
  // Step 4: pageshowイベントでの再初期化を簡素化
  // CollectionアニメーションはCSSで完全制御するため、スタイル操作は不要
  const reinitializeCollection = () => {
    try {
      // 画像の読み込み完了を待ってから再初期化
      initCollectionTracks();
      // draggingクラスのみ削除（念のため）
      document.querySelectorAll('.collection-track').forEach(track => {
        track.isDragging = false;
        track.classList.remove('dragging');
        // Step 4: startAutoScrollは再実行しない（CSSで完全制御するため不要）
        // 初期化時に一度だけ実行されれば、その後はCSSが自動的に制御する
      });
      console.log('[Collection] pageshowイベント: 再初期化完了（CSSで完全制御）');
    } catch (error) {
      console.error('[Collection] pageshowイベント: 再初期化エラー', error);
    }
  };
  
  // 画像の読み込み完了を待つ
  const images = document.querySelectorAll('#collection .collection-track img');
  let loadedCount = 0;
  const totalImages = images.length;
  
  if (totalImages === 0) {
    // 画像がない場合は即座に再初期化
    setTimeout(reinitializeCollection, 100);
    return;
  }
  
  images.forEach(img => {
    if (img.complete && img.naturalWidth > 0) {
      loadedCount++;
    } else {
      img.addEventListener('load', () => {
        loadedCount++;
        if (loadedCount === totalImages) {
          setTimeout(reinitializeCollection, 100);
        }
      }, { once: true });
      img.addEventListener('error', () => {
        loadedCount++;
        if (loadedCount === totalImages) {
          setTimeout(reinitializeCollection, 100);
        }
      }, { once: true });
    }
  });
  
  // タイムアウト処理（3秒以内に読み込まれない場合）
  setTimeout(() => {
    if (loadedCount < totalImages) {
      console.warn('[Collection] pageshowイベント: 画像の読み込みがタイムアウトしました。再初期化を実行します。');
      reinitializeCollection();
    }
  }, 3000);
});

// Instagram WebView検出と特別な処理
const isInstagramWebView = /Instagram/i.test(navigator.userAgent) || 
                           /FBAN|FBAV/i.test(navigator.userAgent) ||
                           (window.navigator.standalone === false && /iPhone|iPad|iPod/i.test(navigator.userAgent));

if (isInstagramWebView) {
  console.log('[Collection] Instagram WebView検出 - 特別な処理を実行');
  
  // bodyにクラスを追加してCSSで検出できるようにする
  document.body.classList.add('instagram-webview');
  
  // Step 4: Instagram WebViewでもCSSで完全制御するため、特別な再初期化は不要
  // loadイベント後にも確実に初期化を実行（画像読み込み待機のため）
  setTimeout(() => {
    console.log('[Collection] Instagram WebView: 遅延初期化を実行');
    try {
      initCollectionTracks();
    } catch (error) {
      console.error('[Collection] Instagram WebView: 遅延初期化エラー:', error);
    }
  }, 1000);
  
  // Step 4: visibilitychangeでの再初期化を削除（CSSで完全制御するため不要）
  // CollectionアニメーションはCSSで常時runningとし、JSからは一切制御しない
  // 再初期化によるスタイル操作が、アニメーション停止の原因になる可能性があるため削除
}

} // 重複読み込み防止の閉じ括弧
