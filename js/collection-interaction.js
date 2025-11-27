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
function initCollectionTracks() {
  console.log('[Collection] initCollectionTracks関数実行開始');
  const tracks = document.querySelectorAll('.collection-track');
  console.log('[Collection] Collection tracks found:', tracks.length);
  
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
  
  // 初期化時にdraggingクラスを確実に削除
  track.isDragging = false;
  track.classList.remove('dragging');
  
  // data-seg から元の子要素数を読み取り
  const segmentCount = parseInt(track.dataset.seg) || 16;
  
  // 子要素を複製して segmentWidth を計算
  ensureInfiniteLoop(track, segmentCount);
  
  // マウスポインタのダウン・ムーブ・アップイベントを拾い、クリックとドラッグを区別
  attachTrackControls(track); // タッチ操作後の継続アニメーション機能を有効化
  
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

// トラックコントロールの実装
function attachTrackControls(track) {
  let startX = 0;
  let startY = 0;
  let startTx = 0;
  let isPointerDown = false;
  let isDragging = false;
  let moved = 0;
  let longPressTimer = null;
  // スマホでのドラッグ判定閾値を調整
  const isMobile = window.innerWidth <= 900;
  const DRAG_THRESHOLD = isMobile ? 10 : 6; // スマホでは10px、PCでは6px
  
  const onDown = (e) => {
    // PC版ではマウスイベントを完全に無視してアニメーションを継続
    if (e.type === 'mousedown' || e.type === 'pointerdown' || e.type === 'mouseenter' || e.type === 'mouseleave') {
      return;
    }
    
    // リンク要素がクリックされた場合は即座にナビゲーションを許可
    if (e.target.closest('a')) {
      return;
    }
    
    // デバッグ情報を出力
    debugCollectionTap(e);
    
    startX = e.clientX || e.touches[0].clientX;
    startY = e.clientY || e.touches[0].clientY;
    startTx = getCurrentTranslateX(track);
    moved = 0;
    isPointerDown = true;
    isDragging = false;
    
    // スマホでの長押しタイマーを短縮（300ms）してより敏感に反応
    const isMobile = window.innerWidth <= 900;
    const longPressDelay = isMobile ? 300 : 500;
    
    longPressTimer = setTimeout(() => {
      isDragging = true;
      track.isDragging = true;
      track.classList.add('dragging');
      track.style.animationPlayState = 'paused';
    }, longPressDelay);
    
    // タップの場合はpreventDefaultしない（リンクナビゲーションを許可）
    // ドラッグ判定はonMoveで行う
  };
  
  const onMove = (e) => {
    // PC版ではマウスイベントを完全に無視
    if (e.type === 'mousemove' || e.type === 'pointermove') {
      return;
    }
    
    if (!isPointerDown) return;
    
    const currentX = e.clientX || e.touches[0].clientX;
    const currentY = e.clientY || e.touches[0].clientY;
    const dx = currentX - startX;
    const dy = currentY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 閾値を超えたらドラッグ開始
    if (!isDragging && distance > DRAG_THRESHOLD) {
      isDragging = true;
      track.isDragging = true;
      track.classList.add('dragging');
      track.style.animationPlayState = 'paused';
      
      // 長押しタイマーをクリア
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }
    
    if (isDragging) {
      // ドラッグ中は track._tx を更新してスクロール位置を変更
      track._tx = startTx + dx;
      track.style.transform = `translateX(${track._tx}px)`;
      e.preventDefault(); // ドラッグ時のみpreventDefault
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
    
    isPointerDown = false;
    
    if (!isDragging) {
      // ドラッグしていない場合、タップとして処理
      // ブラウザのデフォルトクリック動作を許可（リンクナビゲーション）
      if (window.__QA_MEASURE_LOGS__) {
        console.log('Collection tap detected - allowing default navigation');
      }
      return;
    }
    
    // ドラッグが発生していた場合の処理
    isDragging = false;
    track.isDragging = false;
    track.classList.remove('dragging');
    track.style.removeProperty('transform');
    
    // ドラッグ後のアニメーション再開処理
    e.preventDefault();
    e.stopPropagation();
    
    // アニメーションを即座に再開
    track.style.animationPlayState = 'running';
    
    // 現在位置から再開するための負の animation-delay を計算
    const segmentWidth = track._segmentWidth;
    const currentTx = getCurrentTranslateX(track);
    const normalizedTx = ((currentTx % segmentWidth) + segmentWidth) % segmentWidth;
    const progress = normalizedTx / segmentWidth;
    const duration = parseFloat(track.dataset.speed || 30);
    const delay = -progress * duration;
    
    // アニメーション再開
    const direction = track.dataset.direction || 'left';
    const key = direction === 'right' ? 'scroll-right' : 'scroll-left';
    track.style.animation = `${key} ${duration}s linear infinite`;
    track.style.animationDelay = `${delay}s`;
    track.style.animationPlayState = 'running';
  };
  
  // イベントリスナーを追加（スマホ対応強化）
  track.addEventListener('pointerdown', onDown);
  track.addEventListener('pointermove', onMove);
  track.addEventListener('pointerup', onUp);
  track.addEventListener('touchstart', onDown, { passive: false });
  track.addEventListener('touchmove', onMove, { passive: false });
  track.addEventListener('touchend', onUp);
  
  // スマホでの追加イベント処理
  if (isMobile) {
    track.addEventListener('touchcancel', onUp);
    track.addEventListener('touchend', onUp);
    
    // スマホでのスクロール終了時のアニメーション復帰
    let scrollEndTimer;
    track.addEventListener('touchmove', function() {
      clearTimeout(scrollEndTimer);
      scrollEndTimer = setTimeout(function() {
        if (!track.isDragging && !track.classList.contains('dragging')) {
          track.style.animationPlayState = 'running';
        }
      }, 150); // 150ms後にアニメーション復帰
    }, { passive: true });
  }
  
  // 画像のドラッグを無効化
  track.querySelectorAll('img').forEach(img => {
    img.setAttribute('draggable', 'false');
    img.style.userSelect = 'none';
    img.style.webkitUserDrag = 'none';
  });
  
  // リンクのクリック処理（念のため）
  track.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      // タップの場合はデフォルトナビゲーションを許可
      if (!isDragging) {
        if (window.__QA_MEASURE_LOGS__) {
          console.log('Collection link clicked - allowing navigation');
        }
        // preventDefaultしない
      }
    }, { passive: true });
  });
}

// 現在の translateX 値を取得
function getCurrentTranslateX(track) {
  const transform = getComputedStyle(track).transform;
  if (transform === 'none') return 0;
  const matrix = new DOMMatrix(transform);
  return matrix.m41;
}

// オートスクロール開始
function startAutoScroll(track) {
  // 速度を統一（すべての環境で150sに統一 - ゆっくり流れる）
  // HTMLのdata-speed属性は無視し、画面幅に応じた固定値を使用
  let speed;
  if (window.innerWidth <= 480) {
    speed = 150; // スマホ: 150s（ゆっくり流れる）
  } else if (window.innerWidth <= 1024) {
    speed = 150; // タブレット: 150s
  } else {
    speed = 150; // PC: 150s
  }
  
  // data-speed属性を更新（デバッグ用）
  track.dataset.speed = String(speed);
  track.dataset.baseSpeed = String(speed);

  // reverse クラスが付いているトラックはスクロール方向を逆にして、21.JPG が右端になるよう初期化
  const isReverse = track.classList.contains('reverse');
  const scrollDirection = isReverse ? 'right' : 'left';
  
  // 開始位置の調整
  alignTrackStart(track, scrollDirection);
  
  // アニメーション開始（インラインスタイルで確実に設定）
  track.style.animation = `scroll-${scrollDirection} ${speed}s linear infinite`;
  track.style.animationPlayState = 'running';
  track.style.animationDuration = `${speed}s`;
  
  // スクロール後の継続性を確保（スマホ対応強化）
  track.addEventListener('animationiteration', function() {
    if (!track.isDragging && !track.classList.contains('dragging')) {
      track.style.animationPlayState = 'running';
    }
  });
  
  // 可視性チェックとアニメーション復帰（スマホ/PC両対応）
  // より確実なスマホ判定（画面幅またはユーザーエージェント）
  const isMobileDevice = window.innerWidth <= 900 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // デバッグログ（常に出力）
  console.log('Collection track初期化:', { 
    isMobileDevice, 
    windowWidth: window.innerWidth,
    userAgent: navigator.userAgent.substring(0, 50)
  });
  
  // スマホ/PC両方でイベントハンドラを設定（常に設定）
  console.log('[Collection] startAutoScroll: イベントハンドラ設定開始');
  {
    // アニメーション再開のヘルパー関数
    const forceResumeAnimation = () => {
      // 実際にドラッグ中でない場合は、draggingクラスを強制的に削除
      if (!track.isDragging) {
        track.isDragging = false;
        track.classList.remove('dragging');
        console.log('Collection: draggingクラスを強制削除');
      }
      
      // 実際にドラッグ中の場合は再開をスキップ
      if (track.isDragging) {
        console.log('Collection: 実際にドラッグ中なので再開をスキップ');
        return;
      }
      
      console.log('Collection: アニメーション強制再開開始');
      
      // アニメーションを完全にリセットして再開
      // 速度を統一（すべての環境で150s）
      let speed;
      if (window.innerWidth <= 480) {
        speed = 150; // スマホ: 150s
      } else if (window.innerWidth <= 1024) {
        speed = 150; // タブレット: 150s
      } else {
        speed = 150; // PC: 150s
      }
      const direction = track.dataset.direction || 'left';
      const key = direction === 'right' ? 'scroll-right' : 'scroll-left';
      
      // 現在のアニメーション状態を確認
      const currentAnimation = getComputedStyle(track).animation;
      const hasDraggingClass = track.classList.contains('dragging');
      console.log('Collection: 現在のアニメーション状態:', { 
        currentAnimation, 
        speed, 
        direction,
        hasDraggingClass,
        isDragging: track.isDragging
      });
      
      // アニメーションを完全にリセット
      track.style.animation = 'none';
      track.style.animationPlayState = 'paused';
      track.offsetHeight; // リフローを強制
      
      // アニメーションを再設定
      track.style.animation = `${key} ${speed}s linear infinite`;
      track.style.animationPlayState = 'running';
      
      // 再設定後の状態を確認
      setTimeout(() => {
        const newAnimation = getComputedStyle(track).animation;
        const newPlayState = getComputedStyle(track).animationPlayState;
        const stillHasDraggingClass = track.classList.contains('dragging');
        console.log('Collection: アニメーション再開完了:', { 
          newAnimation, 
          newPlayState,
          stillHasDraggingClass,
          isDragging: track.isDragging
        });
      }, 100);
    };
    
    const visibilityObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        console.log('Collection IntersectionObserver:', { 
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
            console.log('Collection: 画面内検知 - draggingクラスを削除');
          }
          
          if (!track.isDragging) {
            console.log('Collection: 画面内検知 - アニメーション再開');
            forceResumeAnimation();
          }
        }
      });
    }, { threshold: 0.1 }); // 閾値を0.1に戻してより敏感に反応
    
    visibilityObserver.observe(track);
    
    // スマホでのページ可視性変更時の処理
    const visibilityHandler = function() {
      if (!document.hidden) {
        // draggingクラスを確実に削除
        if (track.classList.contains('dragging') && !track.isDragging) {
          track.classList.remove('dragging');
          track.isDragging = false;
          console.log('Collection: visibilitychange - draggingクラスを削除');
        }
        
        if (!track.isDragging) {
          forceResumeAnimation();
        }
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
    
    // クリーンアップ用の参照を保存
    track._visibilityHandler = visibilityHandler;
    
    // スクロール終了検知（強化版 - すべての環境で確実に動作）
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
        console.log('Collection: スクロール中 - draggingクラスを削除');
      }
      
      scrollTimer = setTimeout(function() {
        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollDirection = currentScrollTop > lastScrollTop ? 'down' : 'up';
        
        // Collectionセクションが画面内にある場合、アニメーションを確実に再開
        const collectionSection = document.getElementById('collection');
        if (collectionSection) {
          const rect = collectionSection.getBoundingClientRect();
          const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
          
          console.log('Collection スクロール終了検知:', {
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
              console.log('Collection: スクロール終了検知 - draggingクラスを削除');
            }
            
            if (!track.isDragging) {
              console.log('スクロール終了後、Collectionアニメーション再開', { scrollDirection });
              forceResumeAnimation();
              // 複数回実行して確実に再開
              setTimeout(() => {
                if (!track.isDragging && !track.classList.contains('dragging')) {
                  forceResumeAnimation();
                }
              }, 50);
              setTimeout(() => {
                if (!track.isDragging && !track.classList.contains('dragging')) {
                  forceResumeAnimation();
                }
              }, 150);
            }
          }
        }
        
        lastScrollTop = currentScrollTop;
        
        // 追加のタイマーで確実に再開
        scrollTimeoutId = setTimeout(() => {
          if (!track.isDragging && !track.classList.contains('dragging')) {
            const collectionSection = document.getElementById('collection');
            if (collectionSection) {
              const rect = collectionSection.getBoundingClientRect();
              const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
              if (isInViewport) {
                console.log('Collection: 追加タイマーでアニメーション再開');
                forceResumeAnimation();
              }
            }
          }
        }, 100);
      }, 150); // タイマーを150msに短縮してより敏感に反応
    };
    
    window.addEventListener('scroll', scrollHandler, { passive: true });
    
    // クリーンアップ用の参照を保存
    track._scrollHandler = scrollHandler;
    track._visibilityObserver = visibilityObserver;
    
    console.log('[Collection] startAutoScroll: イベントハンドラ設定完了', {
      hasVisibilityObserver: !!track._visibilityObserver,
      hasScrollHandler: !!track._scrollHandler,
      trackId: track.id || 'no-id',
      className: track.className
    });
  }
  
  // 初期化時にdraggingクラスを確実に削除
  track.isDragging = false;
  track.classList.remove('dragging');
  
  // イベントハンドラが設定されていない場合は再設定を試みる
  if (!track._visibilityObserver || !track._scrollHandler) {
    console.warn('[Collection] startAutoScroll: イベントハンドラが設定されていません。再設定を試みます。', {
      hasVisibilityObserver: !!track._visibilityObserver,
      hasScrollHandler: !!track._scrollHandler
    });
  }
  
  // 初期化時にdraggingクラスを確実に削除
  track.isDragging = false;
  track.classList.remove('dragging');
  
  // アニメーションがnoneになっている場合は再設定
  const computedAnimation = getComputedStyle(track).animation;
  if (computedAnimation === 'none' || !computedAnimation || computedAnimation.includes('none')) {
    console.log('Collection: アニメーションがnoneになっているため再設定');
    const speed = parseFloat(track.dataset.speed || 80);
    const direction = track.dataset.direction || 'left';
    const key = direction === 'right' ? 'scroll-right' : 'scroll-left';
    track.style.animation = `${key} ${speed}s linear infinite`;
    track.style.animationPlayState = 'running';
  }
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
  const duration = parseFloat(track.dataset.speed || 55);
  
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
  .collection-track.dragging {
    animation-play-state: paused !important;
  }
`;
document.head.appendChild(style);

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

// Instagram WebView検出と特別な処理
const isInstagramWebView = /Instagram/i.test(navigator.userAgent) || 
                           /FBAN|FBAV/i.test(navigator.userAgent) ||
                           (window.navigator.standalone === false && /iPhone|iPad|iPod/i.test(navigator.userAgent));

if (isInstagramWebView) {
  console.log('[Collection] Instagram WebView検出 - 特別な処理を実行');
  
  // Instagram WebViewでは、loadイベント後にも確実に初期化を実行
  setTimeout(() => {
    console.log('[Collection] Instagram WebView: 遅延初期化を実行');
    try {
      initCollectionTracks();
    } catch (error) {
      console.error('[Collection] Instagram WebView: 遅延初期化エラー:', error);
    }
  }, 1000);
  
  // ページ可視性変更時にも再初期化
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      console.log('[Collection] Instagram WebView: visibilitychange - 再初期化');
      setTimeout(() => {
        try {
          initCollectionTracks();
        } catch (error) {
          console.error('[Collection] Instagram WebView: visibilitychange再初期化エラー:', error);
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
      console.log('[Collection] Instagram WebView: スクロール終了検知 - 再初期化', { scrollDirection });
      
      // Collectionセクションが画面内にある場合のみ再初期化
      const collectionSection = document.getElementById('collection');
      if (collectionSection) {
        const rect = collectionSection.getBoundingClientRect();
        const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
        
        if (isInViewport) {
          try {
            initCollectionTracks();
            // イベントハンドラを確実に再設定
            document.querySelectorAll('.collection-track').forEach(track => {
              track.isDragging = false;
              track.classList.remove('dragging');
            });
            console.log('[Collection] Instagram WebView: 再初期化完了');
          } catch (error) {
            console.error('[Collection] Instagram WebView: スクロール再初期化エラー:', error);
          }
        }
      }
      
      lastScrollTop = currentScrollTop;
    }, 300);
  }, { passive: true });
}

} // 重複読み込み防止の閉じ括弧
