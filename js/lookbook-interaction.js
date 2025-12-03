/* =========================================================
   Lookbook Interaction Handler 2025-01-18
   ========================================================= */

// 重複読み込み防止
if (typeof window.initLookbookTracks === 'function') {
  // 既に読み込まれている場合は再初期化のみ実行
  console.log('[Lookbook] 既に読み込まれているため、再初期化を実行');
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    window.initLookbookTracks();
  }
} else {

// Lookbook トラックでも Collection と同様の無限スクロールとクリック/ドラッグ判定を実装
function initLookbookTracks() {
  const tracks = document.querySelectorAll('.lookbook-track');
  
  console.log(`[Lookbook] initLookbookTracks: ${tracks.length} tracks found`);
  
  tracks.forEach((track, index) => {
    // 既に初期化されている場合はスキップ
    if (track._lookbookInitialized) {
      console.log(`[Lookbook] Track ${index + 1}: 既に初期化済み`);
      return;
    }
    
    console.log(`[Lookbook] Track ${index + 1}: 初期化開始`);
    // 初期化処理
    initTrack(track);
    track._lookbookInitialized = true;
  });
}

// グローバルに公開（init-sections.jsから呼び出せるように）
window.initLookbookTracks = initLookbookTracks;

// startAutoScroll関数もグローバルに公開（init-sections.jsから呼び出せるように）
window.startLookbookAutoScroll = startAutoScroll;

// initTrack関数もグローバルに公開（init-sections.jsから呼び出せるように）
window.initLookbookTrack = initTrack;

// 関数を削除 - CSSで完全に制御するため不要
// Lookbook速度はCSSで120sに統一されているため、JavaScriptでは設定しない

// .lookbook-track ごとに初期化処理
function initTrack(track) {
  // 初期化時にdraggingクラスを確実に削除
  track.isDragging = false;
  track.classList.remove('dragging');
  
  // data-seg で画像枚数を取得
  const segmentCount = parseInt(track.dataset.seg) || 8;
  
  // 子要素を複製して segmentWidth を計算
  ensureInfiniteLoop(track, segmentCount);
  
  // マウスポインタのダウン・ムーブ・アップイベントを拾い、クリックとドラッグを区別
  attachTrackControls(track); // スクロール機能を有効化
  
  // オートスクロール開始（左方向）
  startAutoScroll(track);
}

// 無限ループのための要素複製（安全な実装）
function ensureInfiniteLoop(track, segmentCount) {
  const children = Array.from(track.children);
  
  // 安全チェック
  if (children.length === 0) {
    console.warn('Lookbook track has no children');
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
      return width + (rect.width || 300); // フォールバック値
    }, 0);
    
    if (originalWidth === 0) {
      // WRITE all style properties after reads
      children.forEach(child => {
        const img = child.querySelector('img');
        if (img) {
          // 画像の表示を強制（サイズはCSSで制御するため、インラインスタイルは設定しない）
          img.style.display = 'block';
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
  
  // 安全な複製処理（ループ完璧性を確保）
  const viewportWidth = window.innerWidth;
  const targetWidth = Math.max(originalWidth * 4, viewportWidth * 4); // 4倍に増加して完璧なループを確保
  let currentWidth = originalWidth;
  let cloneCount = 0;
  const maxClones = 150; // 最大複製数を増加（Lookbook）
  
  // 無限ループ防止のための安全なwhile文
  while (currentWidth < targetWidth && cloneCount < maxClones) {
    // WRITE all DOM modifications first
    children.forEach(child => {
      if (cloneCount < maxClones) {
        const clone = child.cloneNode(true);
        // 複製された画像のサイズも統一
        const clonedImg = clone.querySelector('img');
        if (clonedImg) {
          // サイズはCSSで制御するため、インラインスタイルは設定しない
          clonedImg.style.objectFit = 'contain';
        }
        track.appendChild(clone);
        cloneCount++;
      }
    });
    
    // READ layout properties after all writes
    currentWidth = Array.from(track.children).reduce((width, child) => {
      const rect = child.getBoundingClientRect();
      return width + (rect.width || 300);
    }, 0);
    
    // 進捗がない場合は安全のため終了
    if (cloneCount >= maxClones) {
      if (window.__QA_MEASURE_LOGS__) {
        console.log('Lookbook track clone limit reached');
      }
      break;
    }
  }
}

// トラックコントロールの実装
function attachTrackControls(track) {
  let startX = 0;
  let startTx = 0;
  let isDragging = false;
  let moved = 0;
  let longPressTimer = null;
  
  const onDown = (e) => {
    // PC版ではマウスイベントを無視（タッチのみ対応）
    if (e.type === 'mousedown' || e.type === 'pointerdown') {
      // タッチデバイスでない場合はスキップ
      if (!('ontouchstart' in window)) {
        return;
      }
    }
    
    // リンク要素がクリックされた場合は即座にナビゲーションを許可
    if (e.target.closest('a')) {
      return;
    }
    
    startX = e.clientX || e.touches[0].clientX;
    startTx = getCurrentTranslateX(track);
    moved = 0;
    
    // 長押しタイマーを開始（500msに延長してより明確に識別）
    longPressTimer = setTimeout(() => {
      isDragging = true;
      track.isDragging = true;
      track.classList.add('dragging');
      // ドラッグ中は自動スクロールを一時停止
      track.style.animationPlayState = 'paused';
    }, 500);
    
    // リンク要素の場合はpreventDefaultを避ける
    if (!e.target.closest('a')) {
      e.preventDefault();
    }
  };
  
  const onMove = (e) => {
    // PC版ではマウスイベントを完全に無視
    if (e.type === 'mousemove' || e.type === 'pointermove') {
      if (!('ontouchstart' in window)) {
        return;
      }
    }
    
    const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const dx = currentX - startX;
    moved += Math.abs(dx);
    
    // 10px以上移動したらドラッグ開始（より明確な識別）
    if (!isDragging && moved > 10) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      isDragging = true;
      track.isDragging = true;
      track.classList.add('dragging');
      // ドラッグ中は自動スクロールを一時停止
      track.style.animationPlayState = 'paused';
    }
    
    // 要件④: ドラッグ中はtransformでトラックを移動
    if (isDragging) {
      track.style.transform = `translateX(${startTx + dx}px)`;
      e.preventDefault();
    }
  };
  
  const onUp = (e) => {
    // PC版ではマウスイベントを完全に無視
    if (e.type === 'mouseup' || e.type === 'pointerup') {
      return;
    }
    
    // 長押しタイマーをクリア
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    
    if (!isDragging) {
      // ドラッグしていない場合、クリックとして処理
      const link = e.target.closest('a');
      if (link) {
        const href = link.getAttribute('href')?.trim().toLowerCase() || '';
        if (href && href !== '#' && !href.startsWith('javascript')) {
          // 通常のリンクの場合はそのまま遷移
          return;
        }
      }
      // 移動量をリセット
      moved = 0;
      return;
    }
    
    isDragging = false;
    track.isDragging = false;
    track.classList.remove('dragging');
    
    // 5px未満=クリック：リンク遷移
    if (moved < 5) {
      const link = e.target.closest('a');
      if (link) {
        const href = link.getAttribute('href')?.trim().toLowerCase() || '';
        if (href && href !== '#' && !href.startsWith('javascript')) {
          // 通常のリンクの場合はそのまま遷移
          return;
        }
      }
      // クリックの場合は元の位置から再開
      track.style.removeProperty('transform');
      // アニメーションを再開（現在位置から）
      const segmentWidth = track._segmentWidth || 0;
      if (segmentWidth > 0) {
        const currentTx = getCurrentTranslateX(track);
        const normalizedTx = ((currentTx % segmentWidth) + segmentWidth) % segmentWidth;
        const progress = normalizedTx / segmentWidth;
        const computedStyle = getComputedStyle(track);
        const animationDuration = computedStyle.animationDuration;
        let duration = 120;
        if (animationDuration) {
          duration = parseFloat(animationDuration) * (animationDuration.includes('ms') ? 1 : 1000);
        }
        const delay = -progress * duration;
        track.style.animationPlayState = 'paused';
        track.style.animationDelay = `${delay}ms`;
        track.style.animationPlayState = 'running';
      }
      moved = 0;
      return;
    }
    
    // 要件④: 8px以上=ドラッグ：離した位置から自動スクロールを再開
    e.preventDefault();
    e.stopPropagation();
    
    // 現在位置から再開するための負の animation-delay を計算
    const segmentWidth = track._segmentWidth || 0;
    if (segmentWidth > 0) {
      const currentTx = getCurrentTranslateX(track);
      const normalizedTx = ((currentTx % segmentWidth) + segmentWidth) % segmentWidth;
      const progress = normalizedTx / segmentWidth;
      
      // Lookbookのアニメーション速度を取得（CSSから）
      const computedStyle = getComputedStyle(track);
      const animationDuration = computedStyle.animationDuration;
      let duration = 120; // デフォルト値（Lookbookは120s）
      
      if (animationDuration) {
        duration = parseFloat(animationDuration) * (animationDuration.includes('ms') ? 1 : 1000);
      }
      
      const delay = -progress * duration;
      
      // アニメーションを一時停止してから、新しいdelayで再開
      track.style.animationPlayState = 'paused';
      track.style.animationDelay = `${delay}ms`;
      track.style.animationPlayState = 'running';
      
      console.log(`[Lookbook Interaction] アニメーション再開: delay=${delay}ms, progress=${progress.toFixed(2)}`);
    }
  };
  
  // イベントリスナーを追加
  // パフォーマンス最適化: passive listeners when enabled
  const usePassive = window.__PERF_FLAGS?.passiveListeners !== false;
  
  track.addEventListener('pointerdown', onDown);
  track.addEventListener('pointermove', onMove);
  track.addEventListener('pointerup', onUp);
  track.addEventListener('touchstart', onDown, { passive: usePassive ? true : false });
  track.addEventListener('touchmove', onMove, { passive: usePassive ? true : false });
  track.addEventListener('touchend', onUp);
}

// 現在の translateX 値を取得
function getCurrentTranslateX(track) {
  const transform = getComputedStyle(track).transform;
  if (transform === 'none') return 0;
  const matrix = new DOMMatrix(transform);
  return matrix.m41;
}

// オートスクロール開始（左方向）
function startAutoScroll(track) {
  // CSSで完全に制御するため、速度設定は削除
  // Lookbook速度はCSSで120sに統一されているため、JavaScriptでは設定しない

  // Collection/LookbookともにCSSベースで常時runningとするため、
  // スタイル操作は削除
  // アニメーション状態を触らないようにする
  
  // Collection/LookbookともにCSSベースで常時runningとするため、
  // requestAnimationFrame内のスタイル操作は削除
  // アニメーション状態を触らないようにする
  
  // Collection/LookbookともにCSSベースで常時runningとするため、
  // animationiterationイベントでのスタイル操作は削除
  // アニメーション状態を触らないようにする
  
  // Collection/LookbookともにCSSベースで常時runningとするため、
  // forceResumeLookbookAnimation関数は削除
  // アニメーション状態を触らないようにする
  
  // より確実なスマホ判定（画面幅またはユーザーエージェント）
  const isMobileDevice = window.innerWidth <= 900 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // デバッグログ（常に出力）
  console.log('Lookbook track初期化:', { 
    isMobileDevice, 
    windowWidth: window.innerWidth,
    userAgent: navigator.userAgent.substring(0, 50)
  });
  
  // Collection/LookbookともにCSSベースで常時runningとするため、
  // 初期化時のスタイル操作は削除
  // アニメーション状態を触らないようにする
  
  // Collectionと同様に、LookbookもCSSベースで常時runningとする
  // IntersectionObserver、visibilitychange、scrollイベントでのpause/resumeを削除
  // CSSでanimation-play-state: running !importantが設定されているため、JSでの制御は不要
  track._visibilityObserver = null;
  track._visibilityHandler = null;
  track._scrollHandler = null;
  
  console.log('[Lookbook] CSSベースで常時running - イベントハンドラなし');
}

// 開始位置の調整（画像が常に表示されるよう、初期表示で look1.webp が左端に配置）
// Collection/LookbookともにCSSベースで常時runningとするため、
// alignTrackStart関数は削除（初期位置合わせは不要）
// アニメーション状態を触らないようにする
function alignTrackStart(track) {
  // Collection/LookbookともにCSSベースで常時runningとするため、
  // animationDelayの操作は削除
  // アニメーション状態を触らないようにする
}

// Collection/LookbookともにCSSベースで常時runningとするため、
// ドラッグ中のアニメーション停止用CSSは削除
// アニメーション状態を触らないようにする

// 初期化（外部サイトからの遷移時も確実に実行されるように強化）
function initializeLookbook() {
  if (typeof window.initLookbookTracks === 'function') {
    initLookbookTracks();
  }
}

// DOMContentLoadedとwindow.loadの両方で初期化（外部サイトからの遷移時も確実に実行）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeLookbook);
} else {
  initializeLookbook();
}

// Collection/LookbookともにCSSベースで常時runningとするため、
// loadイベントでのスタイル操作は削除
// アニメーション状態を触らないようにする

// Instagram WebView検出と特別な処理
const isInstagramWebView = /Instagram/i.test(navigator.userAgent) || 
                           /FBAN|FBAV/i.test(navigator.userAgent) ||
                           (window.navigator.standalone === false && /iPhone|iPad|iPod/i.test(navigator.userAgent));

if (isInstagramWebView) {
  console.log('[Lookbook] Instagram WebView検出 - 特別な処理を実行');
  // bodyにクラスを追加してCSSで検出できるようにする
  document.body.classList.add('instagram-webview');
  
  // Collection/LookbookともにCSSベースで常時runningとするため、
  // Instagram WebView向けの遅延初期化も削除
  // アニメーション状態を触らないようにする
  
  // Collection/LookbookともにCSSベースで常時runningとするため、
  // visibilitychangeとスクロールイベントでの再初期化は削除
  // アニメーション状態を触らないようにする
}

} // 重複読み込み防止の閉じ括弧
