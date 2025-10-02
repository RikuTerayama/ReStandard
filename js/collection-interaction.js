/* =========================================================
   Collection Interaction Handler 2025-01-18
   ========================================================= */

import { createRafScheduler, debounce } from './dom-scheduler.js';
const raf = createRafScheduler();

// 重複読み込み防止
if (typeof window.initCollectionTracks === 'function') {
  // 既に読み込まれている場合は何もしない
} else {

// デバッグ用のヘルパー関数
window.__DEBUG_COLLECTION__ = true; // デバッグモードを有効化

function debugCollectionTap(e) {
  if (!window.__DEBUG_COLLECTION__) return;
  
  const x = e.clientX || e.touches?.[0]?.clientX;
  const y = e.clientY || e.touches?.[0]?.clientY;
  
  if (x && y) {
    const element = document.elementFromPoint(x, y);
    console.log('=== Collection Tap Debug ===');
    console.log('Event type:', e.type);
    console.log('Coordinates:', { x, y });
    console.log('Hit element:', element);
    console.log('Is <a> tag:', element?.tagName === 'A');
    console.log('Closest <a>:', element?.closest('a'));
    
    // CSS プロパティ確認
    const link = element?.closest('a');
    if (link) {
      const styles = getComputedStyle(link);
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
  attachTrackControls(track); // タッチ操作後の継続アニメーション機能を有効化
  
  // オートスクロール開始
  startAutoScroll(track);
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
  
  // 幅の計算を安全に実行（RAFでバッチ処理）
  raf.read(() => {
    while (originalWidth === 0 && attempts < maxAttempts) {
      originalWidth = children.reduce((width, child) => {
        const rect = child.getBoundingClientRect();
        return width + (rect.width || 200); // フォールバック値
      }, 0);
      
      if (originalWidth === 0) {
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
  });
  
  raf.write(() => {
    if (originalWidth === 0) {
      // 画像が読み込まれていない場合のフォールバック
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
    }
  });
  
  // オリジナル区間幅を記録
  track._segmentWidth = originalWidth;
  
  // 安全な複製処理（RAFでバッチ処理）
  let viewportWidth, targetWidth, currentWidth, cloneCount;
  
  raf.read(() => {
    viewportWidth = window.innerWidth;
    targetWidth = Math.max(originalWidth * 2, viewportWidth * 2); // 3倍から2倍に削減
    currentWidth = originalWidth;
    cloneCount = 0;
  });
  
  raf.write(() => {
    const maxClones = 100; // 最大複製数を増加
    
    // 無限ループ防止のための安全なwhile文
    while (currentWidth < targetWidth && cloneCount < maxClones) {
      children.forEach(child => {
        if (cloneCount < maxClones) {
          const clone = child.cloneNode(true);
          track.appendChild(clone);
          cloneCount++;
        }
      });
      
      // 現在の幅を再計算（安全に）
      raf.read(() => {
        currentWidth = Array.from(track.children).reduce((width, child) => {
          const rect = child.getBoundingClientRect();
          return width + (rect.width || 200);
        }, 0);
      });
      
      // 進捗がない場合は安全のため終了
      if (cloneCount >= maxClones) {
        console.log('Collection track clone limit reached');
        break;
      }
    }
  });
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
  const DRAG_THRESHOLD = 6; // ドラッグ判定の閾値（6px）
  
  const onDown = (e) => {
    // PC版ではマウスイベントを完全に無視してアニメーションを継続
    if (e.type === 'mousedown' || e.type === 'pointerdown' || e.type === 'mouseenter' || e.type === 'mouseleave') {
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
    
    // 長押しタイマーを開始（500msに延長してより明確に識別）
    longPressTimer = setTimeout(() => {
      isDragging = true;
      track.isDragging = true;
      track.classList.add('dragging');
      track.style.animationPlayState = 'paused';
    }, 500);
    
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
      
      // Use RAF to batch transform updates
      raf.write(() => {
        track.style.transform = `translateX(${track._tx}px)`;
      });
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
      console.log('Collection tap detected - allowing default navigation');
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
    let segmentWidth, currentTx, normalizedTx, progress, duration, delay;
    
    raf.read(() => {
      segmentWidth = track._segmentWidth;
      currentTx = getCurrentTranslateX(track);
      normalizedTx = ((currentTx % segmentWidth) + segmentWidth) % segmentWidth;
      progress = normalizedTx / segmentWidth;
      duration = parseFloat(track.dataset.speed || 30);
      delay = -progress * duration;
    });
    
    raf.write(() => {
      // アニメーション再開
      const direction = track.dataset.direction || 'left';
      const key = direction === 'right' ? 'scroll-right' : 'scroll-left';
      track.style.animation = `${key} ${duration}s linear infinite`;
      track.style.animationDelay = `${delay}s`;
      track.style.animationPlayState = 'running';
    });
  };
  
  // イベントリスナーを追加（passive listeners for performance）
  track.addEventListener('pointerdown', onDown, { passive: true });
  track.addEventListener('pointermove', onMove, { passive: false }); // needs preventDefault
  track.addEventListener('pointerup', onUp, { passive: true });
  track.addEventListener('touchstart', onDown, { passive: true });
  track.addEventListener('touchmove', onMove, { passive: false }); // needs preventDefault
  track.addEventListener('touchend', onUp, { passive: true });
  
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
        console.log('Collection link clicked - allowing navigation');
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
        const speed = parseFloat(track.dataset.speed || 30); // 30秒に変更
  
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

} // 重複読み込み防止の閉じ括弧
