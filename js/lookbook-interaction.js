/* =========================================================
   Lookbook Interaction Handler 2025-01-18
   ========================================================= */

// 重複読み込み防止
if (typeof window.initLookbookTracks === 'function') {
  // 既に読み込まれている場合は何もしない
} else {

// Lookbook トラックでも Collection と同様の無限スクロールとクリック/ドラッグ判定を実装
function initLookbookTracks() {
  const tracks = document.querySelectorAll('.lookbook-track');
  
  tracks.forEach((track, index) => {
    // 初期化処理
    initTrack(track);
  });
}

function resolveLookbookSpeedSeconds(track) {
  // 画面幅に応じた直接値を返す（CSS変数に依存しない）
  // Collectionセクションと同じ速度に統一: 50s/65s/80s
  const width = window.innerWidth;
  if (width <= 480) {
    return 50; // スマホ: Collectionと同じ50s
  } else if (width <= 1024) {
    return 65; // タブレット: Collectionと同じ65s
  } else {
    return 80; // PC: Collectionと同じ80s
  }
}

// .lookbook-track ごとに初期化処理
function initTrack(track) {
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
    const duration = resolveLookbookSpeedSeconds(track);
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
  const speed = resolveLookbookSpeedSeconds(track);
  track.dataset.speed = String(speed);

  // 開始位置の調整
  alignTrackStart(track);
  
  // アニメーション開始（CSSで制御するため、インラインスタイルは削除）
  track.style.removeProperty('animation');
  track.style.removeProperty('animation-play-state');
  
  // スクロール後の継続性を確保（CSSで制御）
  track.addEventListener('animationiteration', function() {
    if (!track.isDragging && !track.classList.contains('dragging')) {
      track.style.removeProperty('animation-play-state');
    }
  });
  
  // Lookbookの可視性チェックとアニメーション復帰（強化版）
  const visibilityObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !track.isDragging && !track.classList.contains('dragging')) {
        // 画面内に入ったらアニメーションを強制的に再開（CSSで制御）
        track.style.removeProperty('animation');
        track.style.removeProperty('animation-play-state');
      }
    });
  }, { threshold: 0.05 }); // 閾値を下げてより敏感に反応
  
  visibilityObserver.observe(track);
  
  // ページ可視性変更時の処理（CSSで制御）
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden && !track.isDragging && !track.classList.contains('dragging')) {
      track.style.removeProperty('animation-play-state');
    }
  });
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
  const duration = resolveLookbookSpeedSeconds(track);
  
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

// 初期化
document.addEventListener('DOMContentLoaded', initLookbookTracks);

} // 重複読み込み防止の閉じ括弧
