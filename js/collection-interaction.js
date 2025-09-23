/* =========================================================
   Collection Interaction Handler 2025-01-18
   ========================================================= */

// 各 collection-track で無限スクロールのロジックを実装
function initCollectionTracks() {
  const tracks = document.querySelectorAll('.collection-track');
  
  tracks.forEach((track, index) => {
    // 初期化処理
    initTrack(track);
  });
}

// .collection-track ごとに初期化処理
function initTrack(track) {
  // data-seg から元の子要素数を読み取り
  const segmentCount = parseInt(track.dataset.seg) || 16;
  
  // 子要素を複製して segmentWidth を計算
  ensureInfiniteLoop(track, segmentCount);
  
  // マウスポインタのダウン・ムーブ・アップイベントを拾い、クリックとドラッグを区別
  attachTrackControls(track);
  
  // オートスクロール開始
  startAutoScroll(track);
}

// 無限ループのための要素複製
function ensureInfiniteLoop(track, segmentCount) {
  const children = Array.from(track.children);
  const originalWidth = children.reduce((width, child) => width + child.getBoundingClientRect().width, 0);
  
  if (originalWidth === 0) {
    // 画像が読み込まれていない場合のフォールバック
    const fallbackWidth = children.length * 200;
    track._segmentWidth = fallbackWidth;
    return;
  }
  
  // オリジナル区間幅を記録
  track._segmentWidth = originalWidth;
  
  // 3周分になるまで複製
  const targetWidth = track.parentElement.offsetWidth * 3;
  let currentWidth = originalWidth;
  
  while (currentWidth < targetWidth) {
    children.forEach(child => {
      const clone = child.cloneNode(true);
      track.appendChild(clone);
    });
    currentWidth = Array.from(track.children).reduce((width, child) => width + child.getBoundingClientRect().width, 0);
  }
  
  // 最低でも1セット以上は複製する
  if (currentWidth === originalWidth) {
    children.forEach(child => {
      const clone = child.cloneNode(true);
      track.appendChild(clone);
    });
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
    // 長押しタイマーを開始（150ms）
    longPressTimer = setTimeout(() => {
      isDragging = true;
      track.classList.add('dragging');
      track.style.animationPlayState = 'paused';
      startX = e.clientX || e.touches[0].clientX;
      startTx = getCurrentTranslateX(track);
    }, 150);
    // リンク要素の場合はpreventDefaultを避ける
    if (!e.target.closest('a')) {
      e.preventDefault();
    }
  };
  
  const onMove = (e) => {
    if (!isDragging) return;
    
    const currentX = e.clientX || e.touches[0].clientX;
    const dx = currentX - startX;
    moved += Math.abs(dx);
    
    // ドラッグ中は track._tx を更新してスクロール位置を変更
    track._tx = startTx + dx;
    track.style.transform = `translateX(${track._tx}px)`;
    e.preventDefault();
  };
  
  const onUp = (e) => {
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
        const noNav = href === '' || href === '#' || href.startsWith('javascript');
        if (noNav && link.dataset.href) {
          e.preventDefault();
          window.location.href = link.dataset.href;
          return;
        } else if (href && href !== '#' && !href.startsWith('javascript')) {
          // 通常のリンクの場合はそのまま遷移
          return;
        }
      }
      // 移動量をリセット
      moved = 0;
      return;
    }
    
    isDragging = false;
    track.classList.remove('dragging');
    track.style.removeProperty('transform');
    
    // 8px未満=クリック：href または data-href に遷移
    if (moved < 8) {
      const link = e.target.closest('a');
      if (link) {
        const href = link.getAttribute('href')?.trim().toLowerCase() || '';
        const noNav = href === '' || href === '#' || href.startsWith('javascript');
        if (noNav && link.dataset.href) {
          e.preventDefault();
          window.location.href = link.dataset.href;
          return;
        }
      }
      track.style.animationPlayState = 'running';
      moved = 0;
      return;
    }
    
    // 8px以上=ドラッグ：現在位置から segmentWidth の範囲に正規化して自動スクロールを再開
    e.preventDefault();
    e.stopPropagation();
    
    // 現在位置から再開するための負の animation-delay を計算
    const segmentWidth = track._segmentWidth;
    const currentTx = getCurrentTranslateX(track);
    const normalizedTx = ((currentTx % segmentWidth) + segmentWidth) % segmentWidth;
    const progress = normalizedTx / segmentWidth;
    const duration = parseFloat(track.dataset.speed || 55);
    const delay = -progress * duration;
    
    // アニメーション再開
    const direction = track.dataset.direction || 'left';
    track.style.animation = `scroll-${direction} ${duration}s linear infinite`;
    track.style.animationDelay = `${delay}s`;
    track.style.animationPlayState = 'running';
  };
  
  // イベントリスナーを追加
  track.addEventListener('pointerdown', onDown);
  track.addEventListener('pointermove', onMove);
  track.addEventListener('pointerup', onUp);
  track.addEventListener('touchstart', onDown, { passive: false });
  track.addEventListener('touchmove', onMove, { passive: false });
  track.addEventListener('touchend', onUp);
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
  const speed = parseFloat(track.dataset.speed || 55);
  
  // reverse クラスが付いているトラックはスクロール方向を逆にして、21.JPG が右端になるよう初期化
  const isReverse = track.classList.contains('reverse');
  const scrollDirection = isReverse ? 'right' : 'left';
  
  // 開始位置の調整
  alignTrackStart(track, scrollDirection);
  
  // アニメーション開始
  track.style.animation = `scroll-${scrollDirection} ${speed}s linear infinite`;
  track.style.animationPlayState = 'running';
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
  
  // 画像の位置を計算
  const imageLeft = targetImage.offsetLeft;
  const imageWidth = targetImage.getBoundingClientRect().width;
  const trackWidth = track.parentElement.offsetWidth;
  
  let desiredTx;
  if (align === 'right') {
    // 画像の右端をトラックの右端に合わせる
    desiredTx = trackWidth - (imageLeft + imageWidth);
  } else {
    // 画像の左端をトラックの左端に合わせる
    desiredTx = -imageLeft;
  }
  
  // 負の animation-delay を計算
  const segmentWidth = track._segmentWidth;
  const normalizedTx = ((desiredTx % segmentWidth) + segmentWidth) % segmentWidth;
  const progress = normalizedTx / segmentWidth;
  const duration = parseFloat(track.dataset.speed || 55);
  const delay = -progress * duration;
  
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

// 初期化
document.addEventListener('DOMContentLoaded', initCollectionTracks);
