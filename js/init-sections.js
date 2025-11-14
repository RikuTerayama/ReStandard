/* =========================================================
   Marquee initializer (Collection / Lookbook 共通) 2025-01-18
   ========================================================= */

function getLookbookSpeedSec(track) {
  // 画面幅に応じた直接値を返す（CSS変数に依存しない）
  const width = window.innerWidth;
  if (width <= 480) {
    return 120; // スマホ: 120s
  } else if (width <= 1024) {
    return 100; // タブレット: 100s
  } else {
    return 120; // PC: 120s
  }
}

function resolveCssSpeedSeconds(track, fallback = 120) {
  // 画面幅に応じた直接値を返す（CSS変数に依存しない）
  const width = window.innerWidth;
  if (width <= 480) {
    return 120; // スマホ: 120s
  } else if (width <= 1024) {
    return 100; // タブレット: 100s
  } else {
    return 120; // PC: 120s
  }
}

/** 子要素をクローンして 300% 幅以上にし、無限ループを成立させる */
function ensureLoopWidth(track) {
  // READ all layout properties first
  const parentWidth = track.parentElement?.offsetWidth || track.offsetWidth || 1;
  const isLookbookTrack = track.classList.contains('lookbook-track');
  const multiplier = isLookbookTrack ? 6.0 : 4.0;
  const maxLoopWidth = parentWidth * multiplier;

  const originals = Array.from(track.children);
  if (originals.length === 0) {
    return;
  }

  const fallbackItemWidth = isLookbookTrack ? 300 : 200;
  const itemWidths = originals.map((node) => {
    const rect = node.getBoundingClientRect();
    if (!rect.width) {
      return fallbackItemWidth;
    }
    const styles = window.getComputedStyle(node);
    const margin = parseFloat(styles.marginLeft || '0') + parseFloat(styles.marginRight || '0');
    return rect.width + margin;
  });

  let segmentWidth = itemWidths.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(segmentWidth) || segmentWidth <= 0) {
    segmentWidth = originals.length * fallbackItemWidth;
  }
  segmentWidth = Math.max(segmentWidth, 1);

  // WRITE properties after all reads
  track._segmentWidth = segmentWidth;

  const minClones = isLookbookTrack ? 16 : 3;
  let clonesAdded = 0;
  let totalWidth = segmentWidth;

  const needsMoreContent = () => totalWidth < maxLoopWidth || clonesAdded < minClones;

  while (needsMoreContent() && clonesAdded < 80) {
    const fragment = document.createDocumentFragment();
    originals.forEach((node) => {
      const clone = node.cloneNode(true);
      clone.querySelectorAll('img').forEach((img) => {
        if (img.hasAttribute('data-lcp')) return; // skip LCP
        if (!img.hasAttribute('loading')) {
          img.setAttribute('loading', 'lazy');
        }
        if (img.hasAttribute('fetchpriority')) {
          img.removeAttribute('fetchpriority');
        }
      });
      fragment.appendChild(clone);
    });
    track.appendChild(fragment);
    totalWidth += segmentWidth;
    clonesAdded++;
  }

  // READ final width after all writes (moved to avoid reflow)
  const finalWidth = track.scrollWidth;
  const viewportRatio = parentWidth ? Math.round((finalWidth / parentWidth) * 100) : 0;
  if (window.__QA_MEASURE_LOGS__) {
    console.log(`[LOOP] Track width: ${finalWidth}px (${viewportRatio}% of viewport) clones=${clonesAdded}`);
  }
}
function attachManualControls(track){
  let startX = 0;
  let startTx = 0;
  let dragging = false;
  let moved = 0;
  let longPressTimer = null;

  const onDown = (ev)=>{
    // 長押しタイマーを開始（150ms）
    longPressTimer = setTimeout(() => {
      // READ all layout properties first
      startX = (ev.touches ? ev.touches[0].clientX : ev.clientX);
      startTx = getTxPx(track);
      
      // WRITE all properties after reads
      dragging = true;
      track.isDragging = true;
      moved = 0;
      track.classList.add('dragging');
      track.style.animationPlayState = 'paused';
    }, 150);
    ev.preventDefault();
  };
  
  const onMove = (ev)=>{
    if(!dragging) return;
    const x = (ev.touches ? ev.touches[0].clientX : ev.clientX);
    const dx = x - startX;
    moved += Math.abs(dx);
    track._lastMoved = moved;
    track.style.transform = `translateX(${startTx + dx}px)`;
    ev.preventDefault();
  };
  
  const onUp = (ev)=>{
    // 長押しタイマーをクリア
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    
    if(!dragging) return;
    dragging = false;
    
    // READ all layout properties first
    const currentTx = getTxPx(track);
    const segmentWidth = track._segmentWidth || 0;
    const dragAmount = Math.abs(moved);
    
    // WRITE all properties after reads
    track.style.animationPlayState = 'running';
    
    // セグメント幅の倍数に調整してスムーズなループを保証
    if (segmentWidth > 0) {
      const adjustedTx = Math.round(currentTx / segmentWidth) * segmentWidth;
      track.style.transform = `translateX(${adjustedTx}px)`;
    }

    // 8px未満=クリック：リンク遷移は邪魔せず、その場から再開
    if (dragAmount < 8) {
      track.style.removeProperty('transform');
      track.style.animationPlayState = 'running';
      track.classList.remove('dragging');
      moved = 0; // ← ここで初めてリセット
      return;
    }

    // 8px以上=ドラッグ → 現在位置から自動再開（ジャンプ防止）
    ev.preventDefault();
    ev.stopPropagation();

    // READ all layout properties first
    const loopWidth = track._segmentWidth || (track.scrollWidth / 2); // オリジナル区間幅を使用
    const computedStyle = getComputedStyle(track);
    const m = new DOMMatrix(computedStyle.transform);
    let tx = m.m41; // 2D 水平移動
    tx = ((tx % loopWidth) + loopWidth) % loopWidth; // 常に 0..loopWidth
    const dir = track.dataset.direction === 'rtl' ? -1 : 1;
    const progress = tx / loopWidth;              // 0..1
    const animationDuration = computedStyle.animationDuration;
    const delay = -progress * parseFloat(animationDuration) * 1000; // ms

    // WRITE all properties after reads
    track.style.animation = 'none';
    void track.offsetHeight; // reflow
    track.style.removeProperty('transform');
    track.style.animation = `marquee ${animationDuration} linear infinite`;
    track.style.animationDelay = `${delay}ms`;

    track.classList.remove('dragging');
    moved = 0;
  };

  // パフォーマンス最適化: passive listeners when enabled
  const usePassive = window.__PERF_FLAGS?.passiveListeners !== false;
  
  track.addEventListener('pointerdown', onDown, {passive:false});
  window.addEventListener('pointermove', onMove, {passive:false});
  window.addEventListener('pointerup', onUp);
  track.addEventListener('touchstart', onDown, {passive: usePassive ? true : false});
  window.addEventListener('touchmove', onMove, {passive: usePassive ? true : false});
  window.addEventListener('touchend', onUp);
  
  // ドラッグ時のリンク遷移を無効化
  const container = track.parentElement;
  container.querySelectorAll('a').forEach(a=>{
    a.addEventListener('click', e=>{
      if(track.isDragging || (track._lastMoved && track._lastMoved > 8)){
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  });
  
  // クリック時の寄せ直しロジックは削除（リンク遷移を阻害しない）
  
  // ホイール横スクロール対応
  track.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
    
    // READ all layout properties first
    const currentTx = getTxPx(track);
    
    // WRITE all properties after reads
    track.style.animationPlayState = 'paused';
    track.classList.add('dragging');
    track.style.transform = `translateX(${currentTx - e.deltaX}px)`;
    
    clearTimeout(track._wheelTimer);
    track._wheelTimer = setTimeout(() => {
      onUp({ preventDefault: () => {}, stopPropagation: () => {} });
    }, 300);
  }, { passive: usePassive ? true : false });
}

/** IntersectionObserver で画面外は自動停止
 *  ただし "ユーザーが止めた（data-user-paused=1）" 場合は何もしない */
function pauseWhenOutOfView(track) {
  if (track.classList.contains('lookbook-track')) {
    // Lookbookは常時アニメーションさせる（CSSで制御するため、インラインスタイルは削除）
    track.style.removeProperty('animation-play-state');
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((ent) => {
      if (track.dataset.userPaused === '1') return; // ← 勝手に再生しない
      track.style.animationPlayState = ent.isIntersecting ? 'running' : 'paused';
    });
  }, { threshold: 0.1 });
  io.observe(track);
}

/* 初期化時：速度を画面幅で上書き、方向は data-dir */
function initAutoScroll(track){
  const dir = (track.dataset.direction || 'left').toLowerCase(); // left=左へ / right=右へ
  const isLookbook = track.classList.contains('lookbook-track');

  let key;
  let duration;

  if (isLookbook) {
    // LookbookはCSSで完全に制御するため、インラインスタイルは設定しない
    const speedSec = getLookbookSpeedSec(track);
    const cssSpeed = resolveCssSpeedSeconds(track, speedSec);
    track.dataset.speed = String(cssSpeed);
    track.dataset.baseSpeed = String(cssSpeed);
    // CSSの!importantルールが適用されるように、インラインスタイルは削除
    track.style.removeProperty('animation');
    track.style.removeProperty('animation-play-state');
  } else {
    let speed = parseInt(track.getAttribute('data-speed') || '80', 10);
    if (window.innerWidth <= 768)  speed = Math.max(65, speed - 15);
    if (window.innerWidth <= 480)  speed = Math.max(50, speed - 30);

    duration = calcSpeedSec(speed);
    track.dataset.baseSpeed = String(speed); // 再計算に使う
    key = dir === 'right' ? 'scroll-right' : 'scroll-left';
    track.style.setProperty('animation', `${key} ${duration}s linear infinite`, 'important');
    track.style.setProperty('animation-play-state', 'running', 'important');
  }
  
  track.classList.remove('dragging');
  track.isDragging = false;
  requestAnimationFrame(() => {
    if (!isLookbook) {
      track.style.setProperty('animation-play-state', 'running', 'important');
    }
  });
  track.style.willChange = 'transform';
  attachManualControls(track);
}

/* ユーティリティ：現在のtranslateX(px)を取得 */
function getTxPx(el){
  const m = getComputedStyle(el).transform;
  if(!m || m === 'none') return 0;
  const a = m.match(/matrix\(.*?,.*?,.*?,.*?,\s*([\-0-9.]+),\s*([\-0-9.]+)\)/);
  return a ? parseFloat(a[1]) : 0;
}

/* 速度を画面幅で段階調整（大きい画面ほどゆっくり） */
function calcSpeedSec(base=80){
  const w = window.innerWidth;
  if (w < 480) return Math.max(50, base - 30);   // SP
  if (w < 992) return Math.max(65, base - 15);   // タブレット
  return base;                                   // PC
}

/* トラックを中央に配置する関数 */
function centerTrack(track) {
  // トラックの親要素に中央揃えのスタイルを適用
  const parent = track.parentElement;
  if (parent) {
    parent.style.display = 'flex';
    parent.style.justifyContent = 'center';
    parent.style.margin = '0 auto';
  }
  
  // トラック自体にも中央揃えを適用
  track.style.margin = '0 auto';
}

/* ===== start alignment helpers ===== */

/** src の末尾一致で画像ノードを探す（大文字小文字を無視） */
function findImageBySuffix(track, suffix) {
  if (!suffix) return null;
  const sfx = suffix.toLowerCase();
  const imgs = track.querySelectorAll('img');
  return Array.from(imgs).find(img => {
    try {
      return new URL(img.src, location.href).pathname.toLowerCase().endsWith(sfx);
    } catch {
      return (img.getAttribute('src') || '').toLowerCase().endsWith(sfx);
    }
  }) || null;
}

/** 目的の画像を「左端 or 右端」に揃えたときの希望 translateX(px) を返す */
function computeDesiredTx(track, target, align = 'left') {
  // READ all layout properties first
  const wrap = track.parentElement;                       // .track-wrap
  const x = target.offsetLeft;                            // 画像の左端（track 左基準）
  const w = target.getBoundingClientRect().width;
  const wrapWidth = wrap.clientWidth;
  
  if (align === 'right') {
    // 画像の右端を wrap の右端に合わせる
    return wrapWidth - (x + w);                           // = 望ましい translateX(px)
  }
  // 左端合わせ
  return -x;
}

/** 現在の keyframes（left/right）に対して、希望 translateX を満たす負の animation-delay を適用 */
function applyInitialDelay(track, desiredTxPx) {
  // READ all layout properties first
  const loop = track._segmentWidth || (track.scrollWidth / 2);
  const durSec = parseFloat(getComputedStyle(track).animationDuration);
  const dir = (track.dataset.direction || 'left').toLowerCase();

  // 希望位置を keyframes の可動範囲に正規化
  // left: 0 → -loop, right: -loop → 0 の範囲であれば OK
  let T = desiredTxPx;
  let progress;
  if (dir === 'left') {
    while (T < -loop) T += loop;
    while (T > 0)     T -= loop;
    progress = (-T) / loop;                               // 0..1
  } else {
    while (T < -loop) T += loop;
    while (T > 0)     T -= loop;
    progress = (T + loop) / loop;                         // 0..1
  }
  
  // WRITE after all reads
  track.style.animationDelay = `-${(progress * durSec).toFixed(4)}s`;
}

/** data-start / data-align に従って初期位置を合わせる */
function alignTrackStart(track) {
  const start = (track.dataset.start || '').toLowerCase();
  const align = (track.dataset.align || 'left').toLowerCase();
  const target = findImageBySuffix(track, start);
  if (!target) return;

  // READ all layout properties first
  const dir = (track.dataset.direction || 'left').toLowerCase();
  const isLookbook = track.classList.contains('lookbook-track');
  const base = parseFloat(track.dataset.baseSpeed || 55);
  const dur  = isLookbook ? getLookbookSpeedSec(track) : calcSpeedSec(base);
  const key  = isLookbook ? 'lookbook-scroll' : (dir === 'right' ? 'scroll-right' : 'scroll-left');
  const desired = computeDesiredTx(track, target, align);

  // WRITE all properties after reads
  if (isLookbook) {
    // LookbookはCSSで制御するため、インラインスタイルは削除
    track.style.removeProperty('animation');
    track.style.removeProperty('animation-play-state');
    applyInitialDelay(track, desired);
  } else {
    track.style.animation = `${key} ${dur}s linear infinite`;
    track.style.animationPlayState = 'paused';
    applyInitialDelay(track, desired);
    track.style.animationPlayState = 'running';
  }
}
/* ===== /start alignment helpers ===== */

/* lazy-load フェードイン処理 */
function initLazyLoadFadeIn() {
  const lazyImages = document.querySelectorAll('img[loading="lazy"]');
  
  lazyImages.forEach(img => {
    if (img.hasAttribute('data-lcp')) return; // skip LCP
    img.addEventListener('load', () => {
      img.classList.add('loaded');
    });
    
    // 既に読み込まれている画像の場合
    if (img.complete) {
      img.classList.add('loaded');
    }
  });
}

/* ===================== init ===================== */
document.addEventListener('DOMContentLoaded', () => {
  // DOM存在確認・querySelector修正
  if (window.__QA_MEASURE_LOGS__) {
    console.log('[INIT] Collection/Lookbook 初期化開始');
  }
  
  // lazy-load フェードイン処理を初期化
  initLazyLoadFadeIn();
  
  // Collection 上段・下段（新構造対応）
  const tracks = document.querySelectorAll('#collection .collection-track, #lookbook .lookbook-track');
  if (window.__QA_MEASURE_LOGS__) {
    console.log(`[INIT] Total tracks found: ${tracks.length}`);
  }
  
  tracks.forEach((track, index) => {
    // 幅確保
    ensureLoopWidth(track);
    // 中央補正を適用
    centerTrack(track);
    // 自動スクロール初期化
    initAutoScroll(track);
    // ★開始画像に揃える
    alignTrackStart(track);
    // 画面外一時停止
    pauseWhenOutOfView(track);
    
    // Lookbookトラックの場合、インラインスタイルを確実に削除
    if (track.classList.contains('lookbook-track')) {
      // 複数回実行して確実に削除
      track.style.removeProperty('animation');
      track.style.removeProperty('animation-play-state');
      requestAnimationFrame(() => {
        track.style.removeProperty('animation');
        track.style.removeProperty('animation-play-state');
      });
      setTimeout(() => {
        track.style.removeProperty('animation');
        track.style.removeProperty('animation-play-state');
      }, 100);
    }
    
    if (window.__QA_MEASURE_LOGS__) {
      console.log(`[INIT] Track ${index + 1}: ${track.dataset.direction || 'left'} (${track.dataset.speed || '55'}s)`);
    }
  });
  
  // href 未設定（# や空、javascript:void(0)）の a は data-href を使って遷移させる
  document.querySelectorAll('#collection a, #lookbook a').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href')?.trim().toLowerCase() || '';
      const noNav = href === '' || href === '#' || href.startsWith('javascript');
      if (noNav && a.dataset.href) {
        e.preventDefault();
        window.location.href = a.dataset.href;
        return;
      }
    });
  });
  
  // 画面幅が変わったら再計算（速度だけアップデート）
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      document.querySelectorAll('#collection .collection-track, #lookbook .lookbook-track').forEach(track => {
        if (track.classList.contains('lookbook-track')) {
          // LookbookはCSSで完全に制御するため、インラインスタイルは削除
          const speedSec = getLookbookSpeedSec(track);
          const cssSpeed = resolveCssSpeedSeconds(track, speedSec);
          track.dataset.speed = String(cssSpeed);
          track.dataset.baseSpeed = String(cssSpeed);
          // インラインスタイルを確実に削除（複数回実行）
          track.style.removeProperty('animation');
          track.style.removeProperty('animation-play-state');
          requestAnimationFrame(() => {
            track.style.removeProperty('animation');
            track.style.removeProperty('animation-play-state');
          });
          track.classList.remove('dragging');
          track.isDragging = false;
        } else {
          const dir = track.dataset.direction || 'left';
          const base = parseFloat(track.dataset.baseSpeed || 80);
          const sec = calcSpeedSec(base);
          const key = dir === 'right' ? 'scroll-right' : 'scroll-left';
          track.style.setProperty('animation', `${key} ${sec}s linear infinite`, 'important');
          track.style.setProperty('animation-play-state', 'running', 'important');
        }
      });
    }, 200);
  });
  
  // ページ読み込み完了後にもインラインスタイルを削除（念のため）
  window.addEventListener('load', () => {
    setTimeout(() => {
      document.querySelectorAll('#lookbook .lookbook-track').forEach(track => {
        track.style.removeProperty('animation');
        track.style.removeProperty('animation-play-state');
      });
    }, 500);
  });
});

// 見出しJSリセット削除 - CSS制御のみに統一
if (window.__QA_MEASURE_LOGS__) {
  console.log('[INIT] 見出し制御はCSS (.section-title) に完全委譲');
}
