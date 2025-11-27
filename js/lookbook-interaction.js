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
    // PC版ではマウスイベントを完全に無視してアニメーションを継続
    if (e.type === 'mousedown' || e.type === 'pointerdown' || e.type === 'mouseenter' || e.type === 'mouseleave') {
      return;
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
      return;
    }
    
    const currentX = e.clientX || e.touches[0].clientX;
    const dx = currentX - startX;
    moved += Math.abs(dx);
    
    // 10px以上移動したらドラッグ開始（より明確な識別）
    if (!isDragging && moved > 10) {
      isDragging = true;
      track.isDragging = true;
      track.classList.add('dragging');
      track.style.animationPlayState = 'paused';
    }
    
    if (isDragging) {
      // ドラッグ中は track._tx を更新してスクロール位置を変更
      track._tx = startTx + dx;
      track.style.transform = `translateX(${track._tx}px)`;
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
    track.isDragging = false; // グローバルフラグもリセット
    track.classList.remove('dragging');
    track.style.removeProperty('transform');
    
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
      // LookbookはCSSで制御するため、インラインスタイルは削除
      track.style.removeProperty('animation-play-state');
      moved = 0;
      return;
    }
    
    // 8px以上=ドラッグ：離した位置から自動スクロールを再開
    e.preventDefault();
    e.stopPropagation();
    
    // アニメーションを即座に再開（LookbookはCSSで制御するため、インラインスタイルは削除）
    track.style.removeProperty('animation-play-state');
    
    // 現在位置から再開するための負の animation-delay を計算
    const segmentWidth = track._segmentWidth;
    const currentTx = getCurrentTranslateX(track);
    const normalizedTx = ((currentTx % segmentWidth) + segmentWidth) % segmentWidth;
    const progress = normalizedTx / segmentWidth;
    const duration = 120; // CSSで120sに統一されているため、120sを使用
    const delay = -progress * duration;
    
    // アニメーション再開（CSSで制御するため、インラインスタイルは削除）
    track.style.removeProperty('animation');
    track.style.animationDelay = `${delay}s`;
    track.style.removeProperty('animation-play-state');
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

  // 開始位置の調整
  alignTrackStart(track);
  
  // アニメーション開始（CSSで制御するため、インラインスタイルは削除）
  // 複数回実行して確実に削除
  track.style.removeProperty('animation');
  track.style.removeProperty('animation-play-state');
  track.style.removeProperty('animation-duration');
  track.style.removeProperty('animation-name');
  track.style.removeProperty('animation-timing-function');
  track.style.removeProperty('animation-iteration-count');
  
  // リフローを強制してCSSアニメーションを再適用
  track.offsetHeight;
  
  requestAnimationFrame(() => {
    track.style.removeProperty('animation');
    track.style.removeProperty('animation-play-state');
    track.style.removeProperty('animation-duration');
    track.style.removeProperty('animation-name');
    track.style.removeProperty('animation-timing-function');
    track.style.removeProperty('animation-iteration-count');
    track.offsetHeight;
  });
  
  // スクロール後の継続性を確保（CSSで制御）
  track.addEventListener('animationiteration', function() {
    if (!track.isDragging && !track.classList.contains('dragging')) {
      track.style.removeProperty('animation-play-state');
    }
  });
  
  // Lookbookの可視性チェックとアニメーション復帰（強化版）
  // CSSアニメーションを強制的に再開するヘルパー関数
  const forceResumeLookbookAnimation = () => {
    // 実際にドラッグ中でない場合は、draggingクラスを強制的に削除
    if (!track.isDragging) {
      track.isDragging = false;
      track.classList.remove('dragging');
      console.log('Lookbook: draggingクラスを強制削除');
    }
    
    // 実際にドラッグ中の場合は再開をスキップ
    if (track.isDragging) {
      console.log('Lookbook: 実際にドラッグ中なので再開をスキップ');
      return;
    }
    
    console.log('Lookbook: アニメーション強制再開開始');
    
    // 現在のアニメーション状態を確認
    const currentAnimation = getComputedStyle(track).animation;
    const currentPlayState = getComputedStyle(track).animationPlayState;
    const hasDraggingClass = track.classList.contains('dragging');
    console.log('Lookbook: 現在のアニメーション状態:', { 
      currentAnimation, 
      currentPlayState, 
      hasDraggingClass,
      isDragging: track.isDragging
    });
    
    // CSSアニメーションを強制的に再開するため、クラスとスタイルを確実にクリア
    track.isDragging = false;
    track.classList.remove('dragging');
    track.style.removeProperty('animation');
    track.style.removeProperty('animation-play-state');
    track.style.removeProperty('transform');
    
    // リフローを強制してCSSアニメーションを再適用
    track.offsetHeight;
    
    // 少し遅延してから再度確認（CSSアニメーションの適用を待つ）
    requestAnimationFrame(() => {
      // 再度draggingクラスを確認して削除
      if (track.classList.contains('dragging')) {
        track.classList.remove('dragging');
        track.isDragging = false;
        console.log('Lookbook: requestAnimationFrame内でdraggingクラスを削除');
      }
      
      track.style.removeProperty('animation');
      track.style.removeProperty('animation-play-state');
      
      // 再設定後の状態を確認
      setTimeout(() => {
        const newAnimation = getComputedStyle(track).animation;
        const newPlayState = getComputedStyle(track).animationPlayState;
        const stillHasDraggingClass = track.classList.contains('dragging');
        console.log('Lookbook: アニメーション再開完了:', { 
          newAnimation, 
          newPlayState,
          stillHasDraggingClass,
          isDragging: track.isDragging
        });
      }, 100);
    });
  };
  
  // より確実なスマホ判定（画面幅またはユーザーエージェント）
  const isMobileDevice = window.innerWidth <= 900 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // デバッグログ（常に出力）
  console.log('Lookbook track初期化:', { 
    isMobileDevice, 
    windowWidth: window.innerWidth,
    userAgent: navigator.userAgent.substring(0, 50)
  });
  
  // 初期化時にdraggingクラスを確実に削除
  track.isDragging = false;
  track.classList.remove('dragging');
  
  // アニメーションがpausedになっている場合は再設定
  const computedAnimation = getComputedStyle(track).animation;
  const computedPlayState = getComputedStyle(track).animationPlayState;
  if (computedPlayState === 'paused' || computedAnimation === 'paused' || track.classList.contains('dragging')) {
    console.log('Lookbook: アニメーションが停止しているため再設定');
    track.isDragging = false;
    track.classList.remove('dragging');
    track.style.removeProperty('animation');
    track.style.removeProperty('animation-play-state');
    track.style.removeProperty('transform');
    track.offsetHeight;
  }
  
  const visibilityObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      console.log('Lookbook IntersectionObserver:', { 
        isIntersecting: entry.isIntersecting, 
        intersectionRatio: entry.intersectionRatio,
        isDragging: track.isDragging,
        hasDraggingClass: track.classList.contains('dragging')
      });
      
      if (entry.isIntersecting) {
        // 画面内に入ったらdraggingクラスを確実に削除してアニメーションを再開
        if (track.classList.contains('dragging') && !track.isDragging) {
          track.classList.remove('dragging');
          track.isDragging = false;
          console.log('Lookbook: 画面内検知 - draggingクラスを削除');
        }
        
        if (!track.isDragging) {
          console.log('Lookbook: 画面内検知 - アニメーション再開');
          // 即座に再開
          forceResumeLookbookAnimation();
          // 追加のタイマーで確実に再開（複数回実行）
          setTimeout(() => {
            if (!track.isDragging && !track.classList.contains('dragging')) {
              forceResumeLookbookAnimation();
            }
          }, 50);
          setTimeout(() => {
            if (!track.isDragging && !track.classList.contains('dragging')) {
              forceResumeLookbookAnimation();
            }
          }, 150);
          setTimeout(() => {
            if (!track.isDragging && !track.classList.contains('dragging')) {
              forceResumeLookbookAnimation();
            }
          }, 300);
        }
      }
    });
  }, { threshold: 0.01, rootMargin: '100px' }); // 閾値を0.01に下げ、rootMarginを100pxに拡大してより敏感に反応
  
  visibilityObserver.observe(track);
  
  // ページ可視性変更時の処理（CSSで制御）
  const visibilityHandler = function() {
    if (!document.hidden) {
      // draggingクラスを確実に削除
      if (track.classList.contains('dragging') && !track.isDragging) {
        track.classList.remove('dragging');
        track.isDragging = false;
        console.log('Lookbook: visibilitychange - draggingクラスを削除');
      }
      
      if (!track.isDragging) {
        forceResumeLookbookAnimation();
      }
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);
  
  // クリーンアップ用の参照を保存
  track._visibilityHandler = visibilityHandler;
  track._visibilityObserver = visibilityObserver;
  
  // スクロール終了検知（スマホ/PC両対応 - 常に設定、強化版）
  {
    let scrollTimer;
    let lastScrollTop = 0;
    let scrollTimeoutId;
    const scrollHandler = function() {
      // 既存のタイマーをクリア
      clearTimeout(scrollTimer);
      clearTimeout(scrollTimeoutId);
      
      // 即座にdraggingクラスをチェックして削除
      if (track.classList.contains('dragging') && !track.isDragging) {
        track.classList.remove('dragging');
        track.isDragging = false;
        console.log('Lookbook: スクロール中 - draggingクラスを削除');
      }
      
      scrollTimer = setTimeout(function() {
        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollDirection = currentScrollTop > lastScrollTop ? 'down' : 'up';
        
        // Lookbookセクションが画面内にある場合、アニメーションを確実に再開
        const lookbookSection = document.getElementById('lookbook');
        if (lookbookSection) {
          const rect = lookbookSection.getBoundingClientRect();
          const isInViewport = rect.top < window.innerHeight + 100 && rect.bottom > -100; // マージンを追加してより敏感に反応
          
          console.log('Lookbook スクロール終了検知:', {
            scrollDirection,
            currentScrollTop,
            lastScrollTop,
            isInViewport,
            rectTop: rect.top,
            rectBottom: rect.bottom,
            windowHeight: window.innerHeight,
            isDragging: track.isDragging,
            hasDraggingClass: track.classList.contains('dragging')
          });
          
          if (isInViewport) {
            // draggingクラスを確実に削除
            if (track.classList.contains('dragging') && !track.isDragging) {
              track.classList.remove('dragging');
              track.isDragging = false;
              console.log('Lookbook: スクロール終了検知 - draggingクラスを削除');
            }
            
            if (!track.isDragging) {
              // CSSで制御するため、インラインスタイルを削除してCSSアニメーションを再開
              console.log('スクロール終了後、Lookbookアニメーション再開', { scrollDirection });
              forceResumeLookbookAnimation();
              // 複数回実行して確実に再開
              setTimeout(() => {
                if (!track.isDragging && !track.classList.contains('dragging')) {
                  forceResumeLookbookAnimation();
                }
              }, 50);
              setTimeout(() => {
                if (!track.isDragging && !track.classList.contains('dragging')) {
                  forceResumeLookbookAnimation();
                }
              }, 150);
            }
          }
        }
        
        lastScrollTop = currentScrollTop;
        
        // 追加のタイマーで確実に再開
        scrollTimeoutId = setTimeout(() => {
          if (!track.isDragging && !track.classList.contains('dragging')) {
            const lookbookSection = document.getElementById('lookbook');
            if (lookbookSection) {
              const rect = lookbookSection.getBoundingClientRect();
              const isInViewport = rect.top < window.innerHeight + 100 && rect.bottom > -100;
              if (isInViewport) {
                console.log('Lookbook: 追加タイマーでアニメーション再開');
                forceResumeLookbookAnimation();
              }
            }
          }
        }, 100);
      }, 100); // タイマーを150msから100msに短縮してより敏感に反応 // タイマーを150msに短縮してより敏感に反応
    };
    
    window.addEventListener('scroll', scrollHandler, { passive: true });
    
    // クリーンアップ用の参照を保存
    track._scrollHandler = scrollHandler;
  }
}

// 開始位置の調整（画像が常に表示されるよう、初期表示で look1.webp が左端に配置）
function alignTrackStart(track) {
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
  const duration = 120; // CSSで120sに統一されているため、120sを使用
  
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

// ドラッグ中のアニメーション停止用CSS
const style = document.createElement('style');
style.textContent = `
  .lookbook-track.dragging {
    animation-play-state: paused !important;
  }
`;
document.head.appendChild(style);

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

// window.loadでも再初期化（外部サイトからの遷移時にCSSが適用されるのを待つ）
window.addEventListener('load', () => {
  setTimeout(() => {
    initializeLookbook();
    // インラインスタイルを確実に削除
    document.querySelectorAll('#lookbook .lookbook-track').forEach(track => {
      track.style.removeProperty('animation');
      track.style.removeProperty('animation-play-state');
    });
    
    // Instagram WebViewでLookbookコンテナの高さを強制的に設定
    const isInstagramWebView = /Instagram/i.test(navigator.userAgent) || 
                               /FBAN|FBAV/i.test(navigator.userAgent);
    if (isInstagramWebView && window.innerWidth <= 480) {
      const container = document.querySelector('#lookbook .lookbook-container');
      if (container) {
        const expectedMinHeight = 373 + 32; // 固定値373px（画像のmax-height）+ 2rem = 32px = 405px
        container.style.setProperty('min-block-size', `${expectedMinHeight}px`, 'important');
        container.style.setProperty('min-height', `${expectedMinHeight}px`, 'important');
        console.log('[Lookbook] Instagram WebView: コンテナ高さを強制的に設定', {
          expectedMinHeight,
          windowWidth: window.innerWidth
        });
      }
    }
  }, 100);
});

// Instagram WebView検出と特別な処理
const isInstagramWebView = /Instagram/i.test(navigator.userAgent) || 
                           /FBAN|FBAV/i.test(navigator.userAgent) ||
                           (window.navigator.standalone === false && /iPhone|iPad|iPod/i.test(navigator.userAgent));

if (isInstagramWebView) {
  console.log('[Lookbook] Instagram WebView検出 - 特別な処理を実行');
  // bodyにクラスを追加してCSSで検出できるようにする
  document.body.classList.add('instagram-webview');
  
  // Instagram WebViewでは、loadイベント後にも確実に初期化を実行
  setTimeout(() => {
    console.log('[Lookbook] Instagram WebView: 遅延初期化を実行');
    try {
      initializeLookbook();
      // インラインスタイルを確実に削除
      document.querySelectorAll('#lookbook .lookbook-track').forEach(track => {
        track.style.removeProperty('animation');
        track.style.removeProperty('animation-play-state');
        // CSSで完全に制御するため、速度設定は削除
        // Lookbook速度はCSSで120sに統一されているため、JavaScriptでは設定しない
      });
      
      // Instagram WebViewでLookbookコンテナの高さを強制的に設定（固定値で統一）
      if (window.innerWidth <= 480) {
        const container = document.querySelector('#lookbook .lookbook-container');
        if (container) {
          const expectedMinHeight = 400 + 32; // 固定値400px（画像のmax-height）+ 2rem = 32px = 432px
          container.style.setProperty('min-block-size', `${expectedMinHeight}px`, 'important');
          container.style.setProperty('min-height', `${expectedMinHeight}px`, 'important');
          console.log('[Lookbook] Instagram WebView: コンテナ高さを強制的に設定', {
            expectedMinHeight,
            windowWidth: window.innerWidth
          });
        }
      }
    } catch (error) {
      console.error('[Lookbook] Instagram WebView: 遅延初期化エラー:', error);
    }
  }, 1000);
  
  // ページ可視性変更時にも再初期化
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      console.log('[Lookbook] Instagram WebView: visibilitychange - 再初期化');
      setTimeout(() => {
        try {
          initializeLookbook();
          // インラインスタイルを確実に削除
          document.querySelectorAll('#lookbook .lookbook-track').forEach(track => {
            track.style.removeProperty('animation');
            track.style.removeProperty('animation-play-state');
            // CSSで完全に制御するため、速度設定は削除
            // Lookbook速度はCSSで120sに統一されているため、JavaScriptでは設定しない
          });
        } catch (error) {
          console.error('[Lookbook] Instagram WebView: visibilitychange再初期化エラー:', error);
        }
      }, 500);
    }
  });
  
  // Instagram WebViewでは、スクロールイベントをより頻繁に監視
  let instagramScrollTimer;
  let lastScrollTop = 0;
  window.addEventListener('scroll', () => {
    const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollDirection = currentScrollTop > lastScrollTop ? 'down' : 'up';
    
    clearTimeout(instagramScrollTimer);
    instagramScrollTimer = setTimeout(() => {
      console.log('[Lookbook] Instagram WebView: スクロール終了検知 - 再初期化', { scrollDirection });
      
      // Lookbookセクションが画面内にある場合のみ再初期化
      const lookbookSection = document.getElementById('lookbook');
      if (lookbookSection) {
        const rect = lookbookSection.getBoundingClientRect();
        const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
        
        if (isInViewport) {
          try {
            initializeLookbook();
            // インラインスタイルを確実に削除
            document.querySelectorAll('#lookbook .lookbook-track').forEach(track => {
              track.isDragging = false;
              track.classList.remove('dragging');
              track.style.removeProperty('animation');
              track.style.removeProperty('animation-play-state');
              track.style.removeProperty('transform');
              // 速度を正しく設定（Instagram WebViewでも169s）
              // CSSで完全に制御するため、速度設定は削除
              // Lookbook速度はCSSで120sに統一されているため、JavaScriptでは設定しない
              // リフローを強制してCSSアニメーションを再適用
              track.offsetHeight;
            });
            
            // Instagram WebViewでLookbookコンテナの高さを強制的に設定
            if (window.innerWidth <= 480) {
              const container = document.querySelector('#lookbook .lookbook-container');
              if (container) {
                const expectedMinHeight = 400 + 32; // 固定値400px（画像のmax-height）+ 2rem = 32px = 432px
                container.style.setProperty('min-block-size', `${expectedMinHeight}px`, 'important');
                container.style.setProperty('min-height', `${expectedMinHeight}px`, 'important');
                console.log('[Lookbook] Instagram WebView: コンテナ高さを強制的に設定', {
                  expectedMinHeight,
                  windowWidth: window.innerWidth
                });
              }
            }
            
            console.log('[Lookbook] Instagram WebView: 再初期化完了');
          } catch (error) {
            console.error('[Lookbook] Instagram WebView: スクロール再初期化エラー:', error);
          }
        }
      }
      
      lastScrollTop = currentScrollTop;
    }, 300);
  }, { passive: true });
}

} // 重複読み込み防止の閉じ括弧
